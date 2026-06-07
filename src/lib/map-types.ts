import type { AppUserRole } from "@/lib/current-user";
import type { SponsorCardStyle } from "@/lib/sponsor-card-style";

export interface MapViewerContext {
  isOwner: boolean;
  isAuthenticated: boolean;
  role: AppUserRole;
  isSuperAdmin: boolean;
  shareUrl: string;
  adminUrl: string | null;
}

export interface MapRailSponsor {
  id: string;
  brand_name: string;
  logo_url: string | null;
  description: string | null;
  discount_code: string | null;
  affiliate_url: string | null;
  category_name?: string | null;
  action_type?: "link" | "coupon" | null;
  action_value?: string | null;
  cta_label?: string | null;
  display_order?: number;
  country_codes: string[];
  video_ids?: string[];
  scope?: "global" | "country" | "video";
  sponsor_card_style?: SponsorCardStyle | null;
  isExample?: boolean;
}
