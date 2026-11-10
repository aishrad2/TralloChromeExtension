import { useEffect, useRef } from 'react'

/** The spec's 15-30s window; 20s keeps hand-edits inside the ~30s promise. */
export const POLL_INTERVAL_MS = 20_000

type Options = {
  enabled: boolean
  intervalMs?: number
  onPoll: () => void | Promise<void>
}

/**
 * Polls while the panel is actually on screen, and once more the moment it
 * regains focus. There are no push notifications for Drive here, so this plus
 * the manual refresh button is the whole sync story.
 */
export function useSync({ enabled, intervalMs = POLL_INTERVAL_MS, onPoll }: Options): void {
  const callback = useRef(onPoll)

  useEffect(() => {
    callback.current = onPoll
  }, [onPoll])

  useEffect(() => {
    if (!enabled) return

    let running = false
    const tick = async () => {
      if (running || document.visibilityState !== 'visible') return
      running = true
      try {
        await callback.current()
      } finally {
        running = false
      }
    }

    const timer = setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    void tick()

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [enabled, intervalMs])
}
