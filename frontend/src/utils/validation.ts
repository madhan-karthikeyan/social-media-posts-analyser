const SUPPORTED_HOSTNAMES = [
  'linkedin.com',
  'www.linkedin.com',
  'instagram.com',
  'www.instagram.com',
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
];

export type ValidationError =
  | { valid: false; message: string }
  | { valid: true };

export function validateUrl(raw: string): ValidationError {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: false, message: 'Please enter a LinkedIn, Instagram, or X post URL.' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, message: 'Enter a valid public social-media post URL.' };
  }

  if (url.protocol !== 'https:') {
    return { valid: false, message: 'Enter a valid public social-media post URL.' };
  }

  if (!url.hostname) {
    return { valid: false, message: 'Enter a valid public social-media post URL.' };
  }

  const hostname = url.hostname.toLowerCase();
  if (!SUPPORTED_HOSTNAMES.includes(hostname)) {
    return { valid: false, message: 'This platform isn\'t supported. Please use a public LinkedIn, Instagram, or X post.' };
  }

  const path = url.pathname;
  if (path === '/' || path === '') {
    return { valid: false, message: 'Enter a valid public social-media post URL.' };
  }

  return { valid: true };
}

export function getPlatformFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
  } catch {
    // invalid URL
  }
  return null;
}
