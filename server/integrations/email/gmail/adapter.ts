import {
  readRecentUniversityGmailReplies,
  sendApprovedGmailMessage,
} from "../../../gmailConnection";
import type {
  EmailProvider,
  InboundEmail,
  ListInboundEmailsInput,
  SendApprovedEmailInput,
  SentEmailReceipt,
} from "../types";

export class GmailEmailProvider implements EmailProvider {
  readonly id = "gmail" as const;

  async sendApproved(input: SendApprovedEmailInput): Promise<SentEmailReceipt> {
    return sendApprovedGmailMessage(input);
  }

  async listRecentInbound(input: ListInboundEmailsInput): Promise<InboundEmail[]> {
    return readRecentUniversityGmailReplies({
      encryptedRefreshToken: input.encryptedRefreshToken,
      confirmedContactEmails: input.confirmedContactEmails,
    });
  }
}
