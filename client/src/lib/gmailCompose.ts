export type GmailComposeDraft = {
  to: string;
  subject: string;
  body: string;
};

export function buildGmailComposeUrl({ to, subject, body }: GmailComposeDraft) {
  const parameters = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${parameters.toString()}`;
}
