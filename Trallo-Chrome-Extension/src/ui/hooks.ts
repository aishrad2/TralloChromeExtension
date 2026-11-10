import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TabName } from '../core/types/tabs'
import { getActiveTabUrl } from '../platform/browser'
import { useTrip } from '../state/useTrip'

/**
 * Keeps sync from replacing a list while its form has unsaved input, and
 * releases the hold when the screen goes away.
 */
export function useTabDirty(tab: TabName, dirty: boolean): void {
  const { actions } = useTrip()
  useEffect(() => {
    actions.setTabDirty(tab, dirty)
  }, [actions, tab, dirty])
  useEffect(() => {
    return () => actions.setTabDirty(tab, false)
  }, [actions, tab])
}

/** Tracks connectivity so the panel can say why a save isn't going through. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

/** True once the form differs from what it was loaded with; holds sync off that tab. */
export function useDirtyForm<T>(tab: TabName, form: T, baseline: T): boolean {
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline])
  useTabDirty(tab, dirty)
  return dirty
}

/** Backs the "Use Current URL" shortcut on the link fields. */
export function useCurrentTabUrl(): { available: boolean; fetch: () => Promise<string | undefined> } {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getActiveTabUrl().then((url) => {
      if (!cancelled) setAvailable(!!url)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const fetch = useCallback(() => getActiveTabUrl(), [])
  return { available, fetch }
}
