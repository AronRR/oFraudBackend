/* eslint-disable prettier/prettier */

export function extractHostFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.host || null;
  } catch {
    return null;
  }
}
