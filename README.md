# TralloChromeExtension

a chrome extension that centralizes your travel planning

## Layout

```
Trallo-Chrome-Extension/   the extension itself (React + TypeScript + Vite)
design/wireframes/         UI reference PNGs, never bundled into the build
```

## Develop

```sh
cd Trallo-Chrome-Extension
npm install
npm run dev
```

## Build

```sh
cd Trallo-Chrome-Extension
npm run build
```

Then load `Trallo-Chrome-Extension/build` in `chrome://extensions` via **Load
unpacked** (Developer mode must be on). Chrome tracks unpacked extensions by
absolute path, so re-load it if the folder ever moves.

## Wireframes

Drop UI reference PNGs in `design/wireframes/`. It sits outside the Vite project
so nothing there can end up in `build/`. Name each file after the screen it
shows, with a state suffix when there is more than one version:

```
popup-default.png
popup-empty-state.png
trip-detail.png
```
