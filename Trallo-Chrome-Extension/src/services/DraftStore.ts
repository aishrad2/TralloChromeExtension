import type { TabName } from '../core/types/tabs'

export type DraftKey = string

export function draftKey(tripId: string, tab: TabName | 'new-trip'): DraftKey {
  return `trallo:draft:${tripId}:${tab}`
}

/**
 * Half-finished form state, kept in chrome.storage.session so it survives the
 * panel being closed and reopened but never outlives the browser session.
 * localStorage is deliberately not used anywhere in this extension.
 */
export class DraftStore {
  async saveDraft<T>(key: DraftKey, formState: T): Promise<void> {
    try {
      await chrome.storage.session.set({ [key]: formState })
    } catch {
      /* drafts are a convenience; losing one must never block a save */
    }
  }

  async loadDraft<T>(key: DraftKey): Promise<T | undefined> {
    try {
      const bag = await chrome.storage.session.get(key)
      return bag[key] as T | undefined
    } catch {
      return undefined
    }
  }

  async clearDraft(key: DraftKey): Promise<void> {
    try {
      await chrome.storage.session.remove(key)
    } catch {
      /* ignore */
    }
  }
}
