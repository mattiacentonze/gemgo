const normalizeOrigin = (value: string | undefined) => {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

/**
 * Stable public origin for metadata and server-generated links.
 *
 * `NEXT_PUBLIC_SITE_URL` becomes `https://gemgo.app` after the domain cutover.
 * Vercel's production hostname remains the safe fallback until DNS is verified.
 * Browser Auth callbacks intentionally continue to use `window.location.origin`
 * so branch previews never redirect a session to production.
 */
export const publicSiteOrigin = () =>
  normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  'https://gemgo.vercel.app';

export const publicSiteUrl = (path = '/') =>
  new URL(path, `${publicSiteOrigin()}/`);
