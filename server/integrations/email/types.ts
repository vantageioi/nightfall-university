export type EmailProviderId = "gmail";

export interface SendApprovedEmailInput {
  /** User DEK-sealed provider refresh token; decrypted only inside the adapter. */
  encryptedRefreshToken: string;
  to: string;
  subject: string;
  body: string;
  communicationId: number;
  threadId?: string | null;
}

export interface SentEmailReceipt {
  providerMessageId: string;
  providerThreadId?: string;
}

export interface InboundEmail {
  providerMessageId: string;
  providerThreadId?: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export interface ListInboundEmailsInput {
  encryptedRefreshToken: string;
  confirmedContactEmails: string[];
}

export interface EmailProvider {
  readonly id: EmailProviderId;
  sendApproved(input: SendApprovedEmailInput): Promise<SentEmailReceipt>;
  listRecentInbound(input: ListInboundEmailsInput): Promise<InboundEmail[]>;
}
