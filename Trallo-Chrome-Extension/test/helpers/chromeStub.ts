/** Minimal chrome.storage stand-in so TripCache and DraftStore run under Node. */

type Bag = Record<string, unknown>

function area(bag: Bag) {
  return {
    async get(key: string) {
      return key in bag ? { [key]: bag[key] } : {}
    },
    async set(values: Bag) {
      // chrome.storage structured-clones on the way in; JSON is close enough
      // here and catches anything accidentally non-serialisable.
      for (const [key, value] of Object.entries(values)) {
        bag[key] = JSON.parse(JSON.stringify(value))
      }
    },
    async remove(key: string) {
      delete bag[key]
    },
  }
}

export function installChromeStub(): void {
  const local: Bag = {}
  const session: Bag = {}
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    storage: { local: area(local), session: area(session) },
  }
}
