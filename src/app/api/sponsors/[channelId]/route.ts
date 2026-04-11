import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-service";
import { getDemoSponsorByCountry, isDemoChannelId } from "@/lib/demo-data";

interface GeoRule {
  country_code: string | null;
  priority: number | null;
}

interface SponsorRow {
  id: string;
  brand_name: string;
  logo_url: string | null;
  description: string | null;
  discount_code: string | null;
  affiliate_url: string | null;
  sponsor_geo_rules: GeoRule[];
}

export async function GET(
  request: Request,
  { params }: { params: { channelId: string } }
) {
  const countryCode = new URL(request.url).searchParams.get("country")?.toUpperCase() || null;

  try {
    if (isDemoChannelId(params.channelId)) {
      return NextResponse.json({ sponsor: getDemoSponsorByCountry(countryCode) });
    }

    const supabase = createServiceRoleClient();

    const { data: channel, error: channelError } = await supabase
      .from("channels")
      .select("id,user_id")
      .eq("id", params.channelId)
      .maybeSingle();

    if (channelError || !channel) {
      return NextResponse.json({ sponsor: null });
    }

    const { data, error } = await supabase
      .from("sponsors")
      .select("id,brand_name,logo_url,description,discount_code,affiliate_url,sponsor_geo_rules(country_code,priority)")
      .eq("user_id", channel.user_id)
      .eq("active", true)
      .limit(50);

    if (error || !data?.length) {
      return NextResponse.json({ sponsor: null });
    }

    const scored = (data as SponsorRow[])
      .map((sponsor) => {
        const rules = sponsor.sponsor_geo_rules || [];
        const exact = rules
          .filter((rule) => rule.country_code && rule.country_code === countryCode)
          .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0];

        const global = rules
          .filter((rule) => rule.country_code === null)
          .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0];

        const score = exact ? 200 + Number(exact.priority || 0) : global ? 100 + Number(global.priority || 0) : -1;

        return { sponsor, score };
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ sponsor: scored[0]?.sponsor || null });
  } catch (error) {
    console.error("[api/sponsors/[channelId]]", error);
    return NextResponse.json({ sponsor: null });
  }
}
