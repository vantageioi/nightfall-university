// Platform-sent email (verification codes and similar transactional mail).
// Distinct from the student-inbox Gmail provider: this sends FROM Nightfall.
// Uses Resend's plain HTTPS API when RESEND_API_KEY is configured; otherwise
// falls back to a logged transport so local development still completes the
// flow (the code appears in the server log).
export type PlatformEmailResult = { delivered: boolean; transport: "resend" | "log" };

export async function sendPlatformEmail(input: { to: string; subject: string; text: string }): Promise<PlatformEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || "Nightfall <onboarding@resend.dev>";
  if (!apiKey) {
    console.info(`[PlatformEmail] RESEND_API_KEY not set — logging instead of sending. to=${input.to} subject="${input.subject}" body=${JSON.stringify(input.text)}`);
    return { delivered: false, transport: "log" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
  });
  if (!response.ok) throw new Error(`Platform email delivery failed (${response.status}).`);
  return { delivered: true, transport: "resend" };
}
