const RESEND_API_URL = 'https://api.resend.com/emails';

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const groupMeLink = process.env.GROUPME_LINK;

  if (!resendApiKey || !from || !groupMeLink) {
    return json(res, 500, { error: 'missing_email_config' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { first_name, email } = body;
  const firstName = String(first_name || '').trim();
  const recipient = String(email || '').trim().toLowerCase();

  if (!recipient || !recipient.includes('@')) {
    return json(res, 400, { error: 'invalid_email' });
  }

  const safeFirstName = escapeHtml(firstName || 'there');
  const safeGroupMeLink = escapeHtml(groupMeLink);

  const emailRes = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: 'Welcome to Called Up',
      html: `
        <div style="font-family: Arial, sans-serif; color: #020b14; line-height: 1.6; max-width: 560px;">
          <h1 style="font-size: 28px; margin: 0 0 16px;">Welcome to Called Up</h1>
          <p>Hey ${safeFirstName},</p>
          <p>We are excited to have you with us. Called Up exists to unite Christian baseball players, make disciples, and see the gospel go forth into locker rooms.</p>
          <p>Join the GroupMe here:</p>
          <p>
            <a href="${safeGroupMeLink}" style="display: inline-block; background: #020b14; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
              Join the GroupMe
            </a>
          </p>
          <p>The call link and next steps will be shared inside the GroupMe.</p>
          <p>Live worthy,<br/>Called Up</p>
        </div>
      `,
      text: `Hey ${firstName || 'there'},\n\nWelcome to Called Up. Join the GroupMe here: ${groupMeLink}\n\nThe call link and next steps will be shared inside the GroupMe.\n\nLive worthy,\nCalled Up`,
    }),
  });

  if (!emailRes.ok) {
    const errorText = await emailRes.text();
    console.error('Resend error:', errorText);
    return json(res, 502, { error: 'email_send_failed' });
  }

  return json(res, 200, { success: true });
}
