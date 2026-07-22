# Document back/forward navigation — technical plan

## Context

Issue: https://github.com/ahmedrowaihi/sudomd/issues/111

Product spec: `specs/gh-111/PRODUCT.md`

Current commit researched: `4c62c623f50d968a3b6703e9b11918a1a064d8aa`

Desktop navigation is already centralized on `loadPath` in `apps/desktop/src/store/actions.ts`. The viewer only tracks `currentPath` / `lastOpenedPath` (`apps/desktop/src/store/state.ts`); persistence keeps `lastOpenedPaths` per workspace path and a single `document.lastOpenedPath` (`apps/desktop/src/store/persistence.ts`). Path rewrite on rename/move/delete already updates those fields in the same `appStore.set` blocks. The shared toolbar left cluster is a fixed-basis actions region with `leftSlot` (`packages/ui/src/components/Toolbar.tsx`); sidebar width is a CSS variable `--sidebar-width` from `SidebarFrame` (`packages/ui/src/components/Sidebar.tsx`). Electron app menu + `MenuState` live in `apps/desktop/electron/main.ts` with renderer sync via `setMenuState` / `onMenu*` in `apps/desktop/src/desktopApi`.

Tradeoff: a custom session stack on `loadPath` instead of React Router. Desktop is not URL-routed; per-open-folder history and path rewrite fit store state better than browser history.

## Approach

### Session history state

- Add an in-memory `historyByWorkspace: Record<string, { entries: string[]; index: number }>` next to desktop app state (workspace key = `workspacePath`, sentinel key when `workspacePath` is null).
- Do **not** add it to `Persisted` / `serialize()` in `apps/desktop/src/store/persistence.ts`.
- Pure helpers (unit-tested): `canGoBack` / `canGoForward`, `pushPath` (no consecutive duplicate; truncate forward; max 50 drop-oldest), `move`, path rewrite / prefix rewrite, prune path / prune under folder + index clamp, `clear`.
- Active stack is always the map entry for the current open-folder key. External absolute paths may appear on that stack.

### `loadPath` as the chokepoint

- Extend `loadPath` roughly: `loadPath(path, { history?: "push" | "replace" | "none"; missing?: "toast" | "silent" })`.
- Defaults: `history: "push"`, `missing: "toast"`.
- Apply history mutation only after a successful read, beside `withOpenedDoc` (`actions.ts` / `state.ts`).
- Back/Forward and rename reloads use `history: "none"`. Prefer rewriting the stack entry in the existing rename/move `appStore.set` rather than inventing a second visit.
- Restore paths (`App.tsx` init, `openWorkspace` last file): `missing: "silent"` — clear viewer, drop bad `lastOpenedPath` / `lastOpenedPaths[ws]`, no toast.
- Intentional opens keep the failure toast; failed opens never push.

### `goBack` / `goForward`

- Single `navigateHistory(delta)` used by both.
- In-flight flag: while set, `canGo*` is false for toolbar + menu; concurrent calls no-op (product: block, no optimistic UI).
- Before leave: if `externalChange.kind === "conflict"`, abort; if dirty, `await savePathContent` (non-force); if still conflicted, abort.
- Walk `delta`, pruning missing targets (existence check and/or silent load failure) until success or stop; load with `{ history: "none", missing: "silent" }`.

### Rewrite / prune with existing file ops

- Extend the `appStore.set` updates in `renameMarkdownFile`, `renameFolder`, `moveSidebarItem`, `deleteMarkdownFile`, `deleteFolder` to rewrite or prune history the same way they already handle `lastOpenedPaths` / `currentPath`.
- When delete clears the current document (`emptyDoc` path): clear the **active** stack entirely.

### UI + menu

- `packages/ui` `Toolbar`: when `sidebarOpen`, size the start actions region to `var(--sidebar-width)` (same source as `SidebarFrame`); place nav controls at the end of that region (`ms-auto` / end alignment). When collapsed, keep compact cluster: sidebar toggle + nav with existing `gap-1`. Logical spacing only (`padding-inline-*`, not left/right).
- Desktop `Toolbar` / `leftSlot`: Back/Forward ghost `icon-sm` buttons; disabled from store selectors + in-flight; titles via `formatShortcut`.
- `App.tsx` keydown: `CmdOrCtrl+[` / `]` only when the action can run.
- Electron `buildMenu` View submenu: Go Back / Go Forward first, accelerators `CmdOrCtrl+[` / `]`, separator, then existing items. Extend `MenuState` with `canGoBack` / `canGoForward`; IPC `onMenuGoBack` / `onMenuGoForward` (names flexible); renderer `setMenuState` whenever stack, cursor, in-flight, or workspace changes.

### What does not change

- No React Router on desktop; `apps/www` routing untouched.
- No persistence of stacks; no scroll/viewMode in entries.
- `withOpenedDoc` may keep forcing `viewMode: "rich"` on open — history does not restore mode.

## E2E test plan

Desktop (running app; use `.agents/skills/test-desktop-app` when automating):

1. Open a folder with linked Markdown Files. Open A → wiki/relative open B → C. Back to B then A; Forward to B; from B open D and confirm Forward to C is gone.
2. Edit B without saving wait if needed, press Back: file on disk reflects edits, previous note opens. With conflict banner showing, Back does nothing.
3. From an in-folder note follow a relative link outside the folder; Back returns to the in-folder note.
4. Build a trail in folder A, switch to folder B, switch back to A: A’s trail/cursor restored in-session.
5. Delete the open file: empty editor, Back/Forward disabled; open another file starts a fresh tip.
6. Set last-opened to a deleted path (or delete the file on disk), restart: no failure banner; editor empty or normal empty state.
7. Confirm toolbar placement with sidebar open (nav at sidebar end edge) and collapsed (nav after toggle); View menu items and shortcuts match enablement.

Unit / integration:

- Pure history helpers: push, duplicate, truncate-forward, max 50, rewrite, prune, clear.
- `actions` tests: `loadPath` history modes; `navigateHistory` save-before-leave and conflict block; per-workspace isolation; null-workspace stack; silent missing restore; delete-current clears stack; rename rewrites stack entries.

Commands:

- Iteration: `pnpm check`
- Targeted: desktop store/action tests under `apps/desktop`
- Final: `pnpm build:desktop`

## Risks

- **Lost edits on rapid Back:** mitigate by awaiting save and blocking concurrent history ops with the in-flight flag.
- **Stale stack after external deletes:** prune-and-walk on history nav; silent restore for last-opened.
- **Toolbar width drift vs resizable sidebar:** bind start region to `--sidebar-width` from the same sidebar mechanism, not a hard-coded pixel guess.

## Follow-ups

- Web document-history parity (separate product call; browser URL history is not the same model).
- Optional later: view mode or scroll in history entries.
