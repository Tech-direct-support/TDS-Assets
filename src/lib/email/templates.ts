export function inviteEmailHtml({
  inviteLink,
  tenantName,
  inviterName,
}: {
  inviteLink: string;
  tenantName: string;
  inviterName: string;
}) {
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;border:1px solid #e5e5e5;">
  <div style="background:#000;color:#fff;padding:20px 24px;">
    <div style="font-size:16px;font-weight:600;">TDS Asset Intelligence</div>
  </div>
  <div style="padding:24px;color:#111;">
    <p style="font-size:14px;line-height:1.5;margin:0 0 20px;">
      ${inviterName} invited you to join <strong>${tenantName}</strong> on TDS Asset Intelligence.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${inviteLink}" style="background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:3px;font-size:14px;font-weight:600;display:inline-block;">
        Accept invite
      </a>
    </p>
    <p style="font-size:12px;color:#666;line-height:1.5;margin:0;">
      If the button doesn't work, copy this link into your browser:<br>
      <span style="word-break:break-all;">${inviteLink}</span>
    </p>
  </div>
</div>`.trim();
}
