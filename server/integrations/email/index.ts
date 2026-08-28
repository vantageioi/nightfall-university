import { GmailEmailProvider } from "./gmail/adapter";
import type { EmailProvider } from "./types";

export type { EmailProviderId, EmailProvider, InboundEmail, ListInboundEmailsInput, SendApprovedEmailInput, SentEmailReceipt } from "./types";

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;
  const selected = (process.env.NIGHTFALL_EMAIL_PROVIDER || "gmail").trim().toLowerCase();
  switch (selected) {
    case "gmail":
      cachedProvider = new GmailEmailProvider();
      break;
    default:
      throw new Error(`Unknown NIGHTFALL_EMAIL_PROVIDER "${selected}"`);
  }
  return cachedProvider;
}
