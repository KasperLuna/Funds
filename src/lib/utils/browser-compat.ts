/**
 * Browser compatibility detection utilities.
 *
 * Minimum supported browsers:
 *   Chrome/Edge 111+, Firefox 113+, Safari 15.4+
 *
 * These thresholds align with oklch() CSS color support which the app relies on.
 */

export interface BrowserInfo {
  name: string;
  version: number;
}

/**
 * Parse the browser name and major version from a user-agent string.
 * Returns null when the browser cannot be identified.
 */
export function parseBrowserInfo(ua: string): BrowserInfo | null {
  // Order matters — check Edge before Chrome because Edge UA contains "Chrome".
  const patterns: { name: string; regex: RegExp }[] = [
    { name: "Edge", regex: /Edg(?:e|A|iOS)?\/(\d+)/ },
    { name: "Firefox", regex: /Firefox\/(\d+)/ },
    { name: "Safari", regex: /Version\/(\d+(?:\.\d+)?).*Safari/ },
    { name: "Chrome", regex: /(?:Chrome|CriOS)\/(\d+)/ },
  ];

  for (const { name, regex } of patterns) {
    const match = ua.match(regex);
    if (match?.[1]) {
      return { name, version: parseFloat(match[1]) };
    }
  }

  return null;
}

const MIN_VERSIONS: Record<string, number> = {
  Chrome: 111,
  Edge: 111,
  Firefox: 113,
  Safari: 15.4,
};

/**
 * Check whether the given browser meets the minimum version requirements.
 * Returns true when the browser is supported or unrecognised (we don't block unknown browsers).
 */
export function isBrowserSupported(info: BrowserInfo | null): boolean {
  if (!info) return true; // unknown browser — don't block
  const minVersion = MIN_VERSIONS[info.name];
  if (minVersion === undefined) return true; // browser not in our list — allow
  return info.version >= minVersion;
}

/**
 * Build a human-readable string describing the minimum requirements.
 */
export function getMinBrowserRequirements(): string {
  return "Chrome/Edge 111+, Firefox 113+, or Safari 15.4+";
}
