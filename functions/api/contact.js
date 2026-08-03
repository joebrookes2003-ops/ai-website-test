/**
 * POST /api/contact — Brookes AI enquiry handler
 * Cloudflare Pages Function. Runs on the Workers runtime.
 *
 * Required environment variables (Cloudflare dashboard →
 * Workers & Pages → your project → Settings → Variables and Secrets):
 *
 *   RESEND_API_KEY   Secret.  API key from resend.com
 *   TO_EMAIL         Plain.   Where enquiries land, e.g. hello@brookesai.com
 *   FROM_EMAIL       Plain.   A verified sender on your domain,
 *                             e.g. "Brookes AI <enquiries@brookesai.com>"
 *
 * Optional:
 *   TURNSTILE_SECRET Secret.  If set, expects a Turnstile token in the payload.
 */

const MAX = { name: 120, company: 160, email: 200, phone: 40, size: 60, area: 80, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });

/** Collapse whitespace, strip control characters, enforce a length cap. */
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;
const clean = (value, max) =>
  String(value == null ? '' : value)
    .replace(CONTROL_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Escape for safe inclusion in the HTML email body. */
const esc = (s) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;');

/** Strip CR/LF so a value can never inject an extra email header. */
const headerSafe = (s) => s.replace(/[\r\n]+/g, ' ').trim();

async function handleEnquiry(request, env) {
  // ---- 1. Parse -----------------------------------------------------------
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  // ---- 2. Spam gates ------------------------------------------------------
  // Honeypot: a real browser never fills this in.
  if (clean(body.website, 200) !== '') {
    return json({ ok: true }); // pretend success, send nothing
  }

  // Timing: humans do not complete this form in under three seconds.
  const loadedAt = Number(body.loadedAt);
  if (Number.isFinite(loadedAt) && loadedAt > 0 && Date.now() - loadedAt < 3000) {
    return json({ ok: true });
  }

  // Optional Cloudflare Turnstile verification.
  if (env.TURNSTILE_SECRET) {
    const token = clean(body.turnstileToken, 2048);
    if (!token) return json({ error: 'Verification missing.' }, 400);

    const verify = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') || undefined
        })
      }
    ).then((r) => r.json()).catch(() => null);

    if (!verify || verify.success !== true) {
      return json({ error: 'Verification failed. Please try again.' }, 400);
    }
  }

  // ---- 3. Validate --------------------------------------------------------
  const data = {
    name:    clean(body.name, MAX.name),
    company: clean(body.company, MAX.company),
    email:   clean(body.email, MAX.email),
    phone:   clean(body.phone, MAX.phone),
    size:    clean(body.size, MAX.size),
    area:    clean(body.area, MAX.area),
    message: String(body.message == null ? '' : body.message)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, MAX.message)
  };

  const errors = [];
  if (data.name.length < 2)            errors.push('name');
  if (data.company.length < 2)         errors.push('company');
  if (!EMAIL_RE.test(data.email))      errors.push('email');
  if (!data.size)                      errors.push('size');
  if (!data.area)                      errors.push('area');
  if (data.message.length < 15)        errors.push('message');

  if (errors.length) {
    return json({ error: 'Some fields need attention.', fields: errors }, 422);
  }

  // ---- 4. Configuration check --------------------------------------------
  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
    console.error('contact: missing RESEND_API_KEY, TO_EMAIL or FROM_EMAIL');
    return json({ error: 'The enquiry form is not configured yet.' }, 500);
  }

  // ---- 5. Compose ---------------------------------------------------------
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const country = request.cf && request.cf.country ? request.cf.country : 'unknown';
  const received = new Date().toISOString();

  const rows = [
    ['Name', data.name],
    ['Company', data.company],
    ['Email', data.email],
    ['Phone', data.phone || '—'],
    ['Company size', data.size],
    ['Area of interest', data.area]
  ];

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f6f8;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e3e6ea;border-radius:10px;overflow:hidden">
    <div style="background:#161826;color:#b6aafe;padding:16px 22px;font-size:13px;letter-spacing:.1em;text-transform:uppercase">
      New enquiry &middot; brookesai.com
    </div>
    <div style="padding:22px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:7px 0;color:#667;width:150px;vertical-align:top">${esc(k)}</td>
          <td style="padding:7px 0;font-weight:600">${esc(v)}</td>
        </tr>`).join('')}
      </table>

      <p style="margin:22px 0 6px;color:#667;font-size:13px">Message</p>
      <div style="white-space:pre-wrap;background:#f7f8fa;border:1px solid #e3e6ea;border-radius:8px;padding:14px;font-size:14px;line-height:1.6">${esc(data.message)}</div>

      <p style="margin-top:22px">
        <a href="mailto:${esc(data.email)}?subject=${encodeURIComponent('Re: your enquiry to Brookes AI')}"
           style="display:inline-block;background:#161826;color:#b6aafe;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">
          Reply to ${esc(data.name)}
        </a>
      </p>

      <p style="margin-top:22px;padding-top:14px;border-top:1px solid #e3e6ea;color:#889;font-size:12px">
        Received ${esc(received)} &middot; IP ${esc(ip)} &middot; Country ${esc(country)}
      </p>
    </div>
  </div>
</body></html>`;

  const text = [
    'NEW ENQUIRY — brookesai.com',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    data.message,
    '',
    `Received ${received} | IP ${ip} | Country ${country}`
  ].join('\n');

  // ---- 6. Send ------------------------------------------------------------
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.TO_EMAIL],
        reply_to: headerSafe(data.email),
        subject: headerSafe(`Enquiry — ${data.company} (${data.area})`),
        html,
        text
      })
    });

    if (!res.ok) {
      console.error('contact: resend responded', res.status, await res.text());
      return json({ error: 'We could not send that just now.' }, 502);
    }
  } catch (err) {
    console.error('contact: send threw', err);
    return json({ error: 'We could not send that just now.' }, 502);
  }

  return json({ ok: true });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'POST') return handleEnquiry(request, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST, OPTIONS' }
  });
}
