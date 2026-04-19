#!/usr/bin/env node

/**
 * Bootstrap Polar for TravelMap:
 * - exports organizations/products snapshot
 * - creates NEW recurring products for starter/pro/creator_plus
 * - updates Neon subscription_plans with created product/price IDs
 *
 * Safety rule: never updates existing Polar products, only creates new ones.
 */

import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

const cwd = process.cwd();
const now = new Date();
const dateStamp = now.toISOString().slice(0, 10);

function parseEnv(content) {
  const out = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

function readLocalEnv() {
  const envPath = path.join(cwd, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local");
  return parseEnv(fs.readFileSync(envPath, "utf8"));
}

function requireEnv(map, key) {
  const value = map.get(key);
  if (!value) throw new Error(`Missing ${key} in .env.local`);
  return value;
}

async function polarRequest({ token, method, apiPath, body }) {
  const res = await fetch(`https://api.polar.sh${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    throw new Error(`Polar API ${method} ${apiPath} failed (${res.status}): ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }

  return json;
}

async function listAllPolarPages({ token, apiPath, limit = 100 }) {
  const items = [];
  let page = 1;

  while (true) {
    const data = await polarRequest({ token, method: "GET", apiPath: `${apiPath}${apiPath.includes("?") ? "&" : "?"}page=${page}&limit=${limit}` });
    const pageItems = Array.isArray(data?.items) ? data.items : [];
    items.push(...pageItems);

    const maxPage = Number(data?.pagination?.max_page || 1);
    if (page >= maxPage || pageItems.length === 0) break;
    page += 1;
  }

  return items;
}

function buildRecurringProductPayload({ name, description, amountUsdCents, projectKey }) {
  return {
    name,
    description,
    recurring_interval: "month",
    prices: [
      {
        amount_type: "fixed",
        price_amount: amountUsdCents,
        price_currency: "usd",
      },
    ],
    metadata: {
      app: "travel_web",
      managed_by: "polar_bootstrap_travel_script",
      project_key: projectKey,
      created_at: now.toISOString(),
    },
  };
}

async function main() {
  const env = readLocalEnv();
  const polarToken = requireEnv(env, "POLAR_ACCESS_TOKEN");
  const databaseUrl = requireEnv(env, "DATABASE_URL");
  const sql = neon(databaseUrl);

  const organizations = await listAllPolarPages({ token: polarToken, apiPath: "/v1/organizations/" });
  if (organizations.length === 0) throw new Error("No organizations found in Polar account");

  const organization = organizations[0];
  const organizationId = organization.id;

  const beforeProducts = await listAllPolarPages({ token: polarToken, apiPath: "/v1/products/" });
  const webhookEndpoints = await listAllPolarPages({ token: polarToken, apiPath: "/v1/webhooks/endpoints" });

  const planConfigs = [
    {
      slug: "starter",
      projectKey: "travel_starter_monthly",
      name: `TravelMap Starter Monthly (${dateStamp})`,
      description: "Creator plan for individual travel creators.",
      amountUsdCents: 2900,
    },
    {
      slug: "pro",
      projectKey: "travel_pro_monthly",
      name: `TravelMap Pro Monthly (${dateStamp})`,
      description: "Pro plan with sponsor hub and advanced analytics.",
      amountUsdCents: 7900,
    },
    {
      slug: "creator_plus",
      projectKey: "travel_creator_plus_monthly",
      name: `TravelMap Creator Plus Monthly (${dateStamp})`,
      description: "Portfolio plan for agencies and multi-channel teams.",
      amountUsdCents: 19900,
    },
  ];

  const created = [];

  for (const plan of planConfigs) {
    const payload = buildRecurringProductPayload({
      name: plan.name,
      description: plan.description,
      amountUsdCents: plan.amountUsdCents,
      projectKey: plan.projectKey,
    });

    const product = await polarRequest({
      token: polarToken,
      method: "POST",
      apiPath: "/v1/products/",
      body: payload,
    });

    const recurringPrice = Array.isArray(product?.prices)
      ? product.prices.find((p) => p?.type === "recurring" && !p?.is_archived)
      : null;

    if (!recurringPrice?.id) {
      throw new Error(`Created product ${product?.id || "unknown"} for ${plan.slug} but recurring price ID not found`);
    }

    created.push({
      slug: plan.slug,
      productId: product.id,
      priceId: recurringPrice.id,
      productName: product.name,
      amount: recurringPrice.price_amount,
      currency: recurringPrice.price_currency,
    });
  }

  for (const row of created) {
    await sql`
      update public.subscription_plans
      set
        polar_product_id = ${row.productId},
        polar_price_id = ${row.priceId},
        updated_at = now()
      where slug = ${row.slug}
    `;
  }

  const afterProducts = await listAllPolarPages({ token: polarToken, apiPath: "/v1/products/" });

  const report = {
    generated_at: now.toISOString(),
    organization: {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
    },
    extraction: {
      organizations_count: organizations.length,
      products_before_count: beforeProducts.length,
      products_after_count: afterProducts.length,
      webhook_endpoints_count: webhookEndpoints.length,
    },
    webhook_endpoints: webhookEndpoints.map((endpoint) => ({
      id: endpoint.id,
      name: endpoint.name || null,
      url: endpoint.url,
      enabled: Boolean(endpoint.enabled),
      events: Array.isArray(endpoint.events) ? endpoint.events : [],
    })),
    created_products: created,
  };

  const outputDir = path.join(cwd, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const reportPath = path.join(outputDir, `polar-travel-bootstrap-${dateStamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const slimCatalogPath = path.join(outputDir, `polar-products-catalog-${dateStamp}.json`);
  fs.writeFileSync(
    slimCatalogPath,
    JSON.stringify(
      {
        generated_at: now.toISOString(),
        organization_id: organization.id,
        products: afterProducts.map((p) => ({
          id: p.id,
          name: p.name,
          is_archived: p.is_archived,
          is_recurring: p.is_recurring,
          organization_id: p.organization_id,
          recurring_interval: p.recurring_interval,
          prices: Array.isArray(p.prices)
            ? p.prices.map((price) => ({
                id: price.id,
                type: price.type,
                price_amount: price.price_amount,
                price_currency: price.price_currency,
                recurring_interval: price.recurring_interval,
                is_archived: price.is_archived,
              }))
            : [],
        })),
      },
      null,
      2
    )
  );

  const webhookCatalogPath = path.join(outputDir, `polar-webhooks-catalog-${dateStamp}.json`);
  fs.writeFileSync(
    webhookCatalogPath,
    JSON.stringify(
      {
        generated_at: now.toISOString(),
        organization_id: organization.id,
        webhook_endpoints: webhookEndpoints.map((endpoint) => ({
          id: endpoint.id,
          name: endpoint.name || null,
          url: endpoint.url,
          enabled: Boolean(endpoint.enabled),
          events: Array.isArray(endpoint.events) ? endpoint.events : [],
        })),
      },
      null,
      2
    )
  );

  console.log("Polar bootstrap completed.");
  console.log(`Organization: ${organization.slug} (${organization.id})`);
  for (const row of created) {
    console.log(`- ${row.slug}: product=${row.productId}, price=${row.priceId}`);
  }
  console.log(`Report: ${reportPath}`);
  console.log(`Catalog: ${slimCatalogPath}`);
  console.log(`Webhooks: ${webhookCatalogPath}`);
}

main().catch((error) => {
  console.error("[polar-bootstrap-travel]", error instanceof Error ? error.message : error);
  process.exit(1);
});
