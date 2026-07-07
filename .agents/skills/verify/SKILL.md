---
name: verify
description: Build, launch, and drive the Hubble desktop app over CDP to verify renderer changes end-to-end (screenshots, clicks, keyboard, localStorage checks).
---

# Verify Hubble desktop changes

Recipe for exercising apps/desktop UI changes in the real Electron app.

## Build + launch

```sh
# workspace packages first: desktop imports @hubble.md/ui and @hubble.md/editor from dist
cd packages/ui && pnpm build
cd packages/editor && pnpm build

# launch with CDP on 127.0.0.1:9222 (run in background; boots vite + electron)
cd apps/desktop && pnpm dev:debug
```

Wait for `curl -s http://127.0.0.1:9222/json` to return a page target (~10s).
The dev app uses an isolated profile ("Hubble Dev <hash>") with the workspace
`apps/desktop/.dev-electron/playground` usually already opened.

## Drive it

No playwright in the repo. Use raw CDP from a Node script (Node's global
WebSocket works): connect to `webSocketDebuggerUrl` of the `type: "page"`
target, then:

- `Runtime.evaluate` with `returnByValue: true` — query rects, localStorage
  (`hubble-desktop-app` key holds persisted ui/workspace state), DOM state.
- `Input.dispatchMouseEvent` mousePressed+mouseReleased — real clicks;
  `button: "right"` opens context menus (synthetic `contextmenu` events don't).
- `Input.dispatchKeyEvent` with `text` per char — types into xterm.
- `Page.captureScreenshot` — PNG evidence. Window is DPR 2: CSS px × 2.
- Drag = mousePressed, several mouseMoved steps, mouseReleased.

## Gotchas

- Screenshot missing a popup that DOM says is open → check stacking:
  `document.elementFromPoint(x, y)` tells you what actually paints on top.
  Portaled base-ui popups need a z-index on the Positioner to beat the
  terminal panel's `z-20` stacking context.
- xterm refits via a debounced ResizeObserver; after a layout change the
  screen size can lag its container by 1-3s. Re-measure before calling it
  a bug.
- Kill the app by killing the main `Hubble Dev ...app/Contents/MacOS` PID;
  pkill on the dev.mjs pattern misses the Electron tree.
