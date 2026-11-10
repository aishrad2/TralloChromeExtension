/**
 * The worker's job is deliberately small. Trip logic lives in the side panel,
 * because an interactive chrome.identity prompt needs a user gesture and a
 * worker woken by an event has none.
 */

function openPanelOnClick(): void {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('[Trallo] could not set panel behavior', err))
}

chrome.runtime.onInstalled.addListener(openPanelOnClick)
chrome.runtime.onStartup.addListener(openPanelOnClick)
openPanelOnClick()
