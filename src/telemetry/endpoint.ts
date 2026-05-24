/**
 * Telemetry endpoint types — HTTPS-only narrowing.
 */

export type HttpsUrl = `https://${string}`;

export function isHttpsUrl(url: string): url is HttpsUrl {
  return url.startsWith('https://');
}
