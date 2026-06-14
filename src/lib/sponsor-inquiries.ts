export const SPONSOR_INQUIRY_STATUSES = ["new", "reviewed", "contacted", "proposal_sent", "negotiation", "won", "lost"] as const;

export type SponsorInquiryStatus = (typeof SPONSOR_INQUIRY_STATUSES)[number];

export function normalizeSponsorInquiryStatus(value: string | null | undefined): SponsorInquiryStatus {
  if (value === "reviewed") return "reviewed";
  if (value === "contacted") return "contacted";
  if (value === "proposal_sent") return "proposal_sent";
  if (value === "negotiation") return "negotiation";
  if (value === "won") return "won";
  if (value === "lost") return "lost";
  return "new";
}
