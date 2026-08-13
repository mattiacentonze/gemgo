# `gemgo.app` production cutover

This checklist keeps Vercel, Supabase Auth and Google OAuth on the same stable
origin. Do not remove `gemgo.vercel.app` until the new domain, TLS and callbacks
have passed the checks below.

## 1. Domain and Vercel

1. Add `gemgo.app` to the existing Vercel `gemgo` project.
2. Add `www.gemgo.app` and redirect it permanently to `https://gemgo.app`.
3. Create exactly the DNS records Vercel reports for the project. Keep DNSSEC
   enabled at the DNS provider and wait for Vercel to report a valid
   certificate.
4. Set `NEXT_PUBLIC_SITE_URL=https://gemgo.app` in Vercel Production. Preview
   deployments should keep their own origin and must not claim the canonical
   production Auth callback.

## 2. Supabase Auth

In project `lhowrxqddjfvzmlwnuoj`:

- Site URL: `https://gemgo.app`
- exact production redirect: `https://gemgo.app/auth/callback`
- local redirect: `http://localhost:3000/auth/callback`
- retain `https://gemgo.vercel.app/auth/callback` until the cutover is verified

Avoid a broad `*.vercel.app` redirect glob. Add only a specific reviewed preview
URL when an OAuth preview test is needed.

## 3. Google OAuth

Use a Web OAuth client:

- authorised JavaScript origin: `https://gemgo.app`
- provider callback URI:
  `https://lhowrxqddjfvzmlwnuoj.supabase.co/auth/v1/callback`

The Google callback remains the Supabase Auth URL; the final application return
URL is controlled by Supabase's redirect allow-list.

## 4. Transactional email

Configure a dedicated sender such as `auth@gemgo.app` with a production SMTP
provider. Publish and verify SPF, DKIM and DMARC before allowing public email
sign-up. Keep Auth mail separate from newsletters or marketing campaigns.

## 5. Release gate

- `https://gemgo.app`, `/app/profile`, `/app/admin` and `/privacy` return 200.
- Google sign-in returns to `/app/profile` on `gemgo.app`.
- Email confirmation and password recovery arrive and return to `gemgo.app`.
- A confirmed user imports guest trips once; local demo GemPoints do not move.
- The first real Mattia account is assigned `owner` manually by UUID.
- Account export and deletion are verified against server data and private media.
- Vercel runtime errors remain empty after the cutover.

Only after these checks should `gemgo.app` become the sole advertised origin.
