/** Thin wrappers over the few chrome.* calls the UI needs directly. */

export async function openUrl(url: string): Promise<void> {
  try {
    await chrome.tabs.create({ url })
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

/**
 * URL of the tab the user is looking at, for the "Use Current URL" shortcut.
 * Needs the `tabs` permission: `activeTab` is granted on an action click and
 * lapses on navigation, while the side panel stays open across navigations.
 */
export async function getActiveTabUrl(): Promise<string | undefined> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tab?.url
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return undefined
    return url
  } catch {
    return undefined
  }
}

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
