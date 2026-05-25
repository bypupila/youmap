#!/usr/bin/env node

const baseUrl = String(process.env.MVP_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

async function run() {
  const checks = [
    {
      name: "API status",
      method: "GET",
      path: "/api/status",
      expectStatus: 200,
      validate: async (response) => {
        const json = await response.json();
        if (!json || typeof json !== "object") return "Payload JSON inválido.";
        if (!json.indicators || typeof json.indicators !== "object") return "Falta bloque indicators.";
        return null;
      },
    },
    {
      name: "Public status page",
      method: "GET",
      path: "/status",
      expectStatus: 200,
      validate: async (response) => {
        const html = await response.text();
        if (!html.includes("Estado del servicio")) return "No contiene encabezado esperado.";
        return null;
      },
    },
    {
      name: "Demo map page",
      method: "GET",
      path: "/map?channelId=demo-channel",
      expectStatus: 200,
      validate: async (response) => {
        const html = await response.text();
        if (!html.includes("Modo demo")) return "No contiene indicador visible de demo.";
        if (!html.includes("Crear cuenta gratis")) return "No contiene llamada a acción de registro.";
        return null;
      },
    },
    {
      name: "Vote requires viewer registration",
      method: "POST",
      path: "/api/map/fan-votes/vote",
      expectStatus: 401,
      body: {
        channelId: "00000000-0000-0000-0000-000000000000",
        countryCode: "AR",
      },
      validate: async (response) => {
        const json = await response.json().catch(() => null);
        if (!json || json.requires_viewer_registration !== true) {
          return "No devolvió requires_viewer_registration=true.";
        }
        return null;
      },
    },
  ];

  let failed = 0;

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    try {
      const response = await fetch(url, {
        method: check.method,
        headers: check.body ? { "content-type": "application/json" } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined,
      });

      if (response.status !== check.expectStatus) {
        failed += 1;
        console.error(`✗ ${check.name}: status ${response.status} (esperado ${check.expectStatus})`);
        continue;
      }

      const validationError = await check.validate(response);
      if (validationError) {
        failed += 1;
        console.error(`✗ ${check.name}: ${validationError}`);
        continue;
      }

      console.log(`✓ ${check.name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failed > 0) {
    console.error(`\nSmoke check finalizó con ${failed} error(es).`);
    process.exit(1);
  }

  console.log("\nSmoke check MVP completado sin errores.");
}

run().catch((error) => {
  console.error("[mvp-smoke] failed");
  console.error(error);
  process.exit(1);
});
