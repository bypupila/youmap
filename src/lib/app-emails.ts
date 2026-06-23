export const APP_EMAILS = {
  admin: "admin@bypupila.com",
  hello: "hello@bypupila.com",
  marketing: "marketing@bypupila.com",
  newsletter: "newsletter@bypupila.com",
  noreply: "noreply@bypupila.com",
  support: "support@bypupila.com",
} as const;

export type AppEmailKey = keyof typeof APP_EMAILS;
