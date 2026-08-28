export type GmailComposeDraft = {
  to: string;
  subject: string;
  body: string;
};

export function buildGmailComposeUrl({ to, subject, body }: GmailComposeDraft) {
  const parameters = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${parameters.toString()}`;
}

/** Opens the browser/device default mail client. No mailbox credentials or API grant is involved. */
export function buildMailtoUrl({ to, subject, body }: GmailComposeDraft) {
  const parameters = new URLSearchParams({ subject, body });
  return `mailto:${encodeURIComponent(to)}?${parameters.toString()}`;
}
