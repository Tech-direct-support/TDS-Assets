const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email via Resend. Returns an error string (never
 * throws) when RESEND_API_KEY / RESEND_FROM_EMAIL aren't configured, so
 * callers can surface a warning instead of failing the whole action — same
 * fallback contract as getAIProvider().
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { error: "Email service is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)." };
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { error: body?.message ?? `Resend request failed with status ${res.status}` };
  }

  return {};
}
