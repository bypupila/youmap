export const SPONSOR_INQUIRY_STATUSES = ["new", "reviewed", "contacted", "won", "lost"] as const;

export type SponsorInquiryStatus = (typeof SPONSOR_INQUIRY_STATUSES)[number];

export function normalizeSponsorInquiryStatus(value: string | null | undefined): SponsorInquiryStatus {
  if (value === "reviewed") return "reviewed";
  if (value === "contacted") return "contacted";
  if (value === "won") return "won";
  if (value === "lost") return "lost";
  return "new";
}
