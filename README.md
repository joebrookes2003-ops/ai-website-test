# Brookes AI — website

Vanilla HTML / CSS / JS. No build step. Deployed with Cloudflare Pages.

## Files

| Path | Purpose |
|---|---|
| `index.html` | The whole marketing site — hero, problem, services, two-step process, security, FAQ, enquiry form |
| `privacy.html` | Privacy notice (UK GDPR) |
| `terms.html` | Website terms + general terms of business |
| `styles.css` | Complete design system. All colours are CSS custom properties at the top |
| `script.js` | Nav, FAQ accordion, scroll reveal, form validation and submission |
| `functions/api/contact.js` | Cloudflare Pages Function that receives enquiries and emails them |
| `_headers` | Security headers and cache policy |
| `robots.txt`, `sitemap.xml` | Search engine basics |

## Before going live

**1. Replace the placeholders.** Search the project for `[` and fill in:

- `[Registered company name] Ltd` — footer of all three pages, plus privacy and terms body
- `[00000000]` — your Companies House number
- `[Registered office address]` — privacy.html and terms.html
- `[Your email provider]` — privacy.html, list of processors

A UK limited company must display its registered name, number and place of
registration on its website. That is a legal requirement, not a nicety.

**2. Set up the enquiry form.** It posts to `/api/contact`, which needs three
environment variables in Cloudflare (Workers & Pages → your project → Settings →
Variables and secrets):

| Variable | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | Secret | API key from [resend.com](https://resend.com) — free tier covers 3,000 emails/month |
| `TO_EMAIL` | Plain text | Where enquiries land, e.g. `hello@brookesai.com` |
| `FROM_EMAIL` | Plain text | A verified sender on your domain, e.g. `Brookes AI <enquiries@brookesai.com>` |

You must verify your domain in Resend (add their DNS records in Cloudflare) before
`FROM_EMAIL` will send. Until these variables are set the form returns a clear
error telling the visitor to email directly, so nothing silently disappears.

**Optional — Cloudflare Turnstile.** If spam becomes a problem, add a
`TURNSTILE_SECRET` variable and a Turnstile widget to the form. The endpoint
already checks for it when that variable exists. Without it, the honeypot field
and the three-second timing check handle ordinary bots.

**3. Check the details in the copy.** In particular:

- The hero says "Taking on new clients for Q4 2026" — update or remove as needed
- The FAQ names Benjamin Brookes and describes the company as young; adjust as that changes
- `https://brookesai.com/` appears in canonical tags, the sitemap and structured data — change if the domain differs

**4. Be able to deliver the week.** The site promises a free workflow review costing the
client about an hour, and a first workflow live within a week of go-ahead. That claim is
load-bearing — it is in the hero, the strip, the process section, the FAQ and the enquiry
panel. Clause B4 of `terms.html` qualifies it (the week runs from signature *and* receipt
of system access and a named approver, and covers the first scoped workflow only), but the
qualification only protects you if the review genuinely filters out jobs that can't hit it.
If you find you can't hold the week, change the claim rather than relying on the clause.

## Design notes on the palette

Colours are adapted from the Nocturne design system: a desaturated blue-grey ground
(`#161826`) with a single blurple accent (`#9184d9`) used as line, mark and glow rather
than as a flood. Ramps were generated in OKLCH so each step carries the same visual weight.

`--accent` is for interface chrome, large text and fills. `--accent-text` is the lighter
step, used anywhere the accent carries small text (eyebrows, step numbers, links, terminal
keys) — the base accent is only 4.87:1 on panel backgrounds, which is marginal for body
copy. Every text/background pairing in the sheet meets WCAG AA at 4.5:1.

## Local preview

Static preview (the form will fail, since no function is running):

```bash
python3 -m http.server 8080
```

Full preview including the enquiry endpoint:

```bash
npx wrangler pages dev .
```

Every colour is a custom property in the `:root` block of `styles.css`. To change the
accent, edit `--accent`, `--accent-hover`, `--accent-text`, `--accent-dim`, `--accent-glow`
and `--accent-ink` — nothing else needs touching.

The site uses system fonts, so there are no webfont requests and nothing loads from
a third-party origin. The Content-Security-Policy in `_headers` enforces that; if
you later add an analytics script or a webfont, that policy must be updated or the
resource will be blocked.
