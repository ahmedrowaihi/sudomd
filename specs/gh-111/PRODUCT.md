# Document back/forward navigation

## Summary

Desktop users can step back and forward through documents they opened in the current app session, using toolbar buttons, keyboard shortcuts, and View menu items. History is per open folder session, not a browser-style app location stack.

## Problem

Users can follow wiki links and relative Markdown links into other files, but cannot return through that trail without re-finding each file. Restart can also show a failure banner when the remembered last-opened path no longer exists on disk.

## Flows

### Browse a linked trail and return

1. With a Workspace Folder or Plain Folder open, the user opens Markdown File A, then opens B via sidebar, wiki link, relative link, file picker, or creating a new file.
2. Back becomes available. Forward stays unavailable until the user has moved back.
3. The user chooses Back (toolbar, `CmdOrCtrl+[`, or View → Go Back). The editor shows the previous path in the trail.
4. The user chooses Forward (toolbar, `CmdOrCtrl+]`, or View → Go Forward). The editor returns to the later path.
5. After moving back, opening a different file truncates the forward trail (browser-like). Re-opening the path already showing does not add another history step. Re-opening a path that appears earlier but is not the current tip adds a new tip entry.

- History records successful document opens only.
- Entries are file paths only (no scroll position, no rich/source mode).
- Cap is 50 entries per stack; oldest entries drop first.
- Desktop only. Web keeps ordinary browser URL history and is unchanged.

### Leave a dirty note via history

1. The user edits the open file without resolving an external conflict, then chooses Back or Forward.
2. Sudomd saves the current file with normal save behavior, then navigates.
3. If the open file already has an external disk conflict, or save discovers one, navigation does not run; the user stays on the current file and sees existing conflict UI where applicable.
4. While a history navigation is in progress, Back and Forward are unavailable (toolbar and menu). There is no optimistic transition.

### Follow a path outside the open folder

1. From a file in the open folder, the user follows a relative link (or opens a Loose File) that resolves outside that folder.
2. The outside path becomes the current document and is part of the same history trail for that open-folder session.
3. Back returns to the prior path in that trail, including the in-folder note the user came from.

### Switch open folders mid-session

1. The user builds a history trail in open folder A, then opens folder B.
2. Folder B has its own trail (empty until an open, or seeded by restore of its last-opened path).
3. Switching back to A in the same app session restores A’s trail and cursor as left.

- No open folder: one ephemeral session trail so Loose File browsing can still use Back/Forward.
- Opening a folder does not merge the no-folder trail into that folder’s trail.
- Restart discards all trails. Restore still uses the existing last-opened path bookkeeping only.

### Missing files

1. On app or folder restore, if the remembered last-opened path is missing on disk, Sudomd clears the open document quietly: no error toast, no failure banner, and the bad last-opened entry is dropped.
2. If Back or Forward would land on a missing path, that entry is removed and navigation continues in the same direction until a file loads or no further step exists. A toast appears only if the whole move fails.
3. An intentional open of a missing path (broken link, picker race) still shows the existing open-failure toast and does not add a history entry.

### Rename, move, and delete

1. Renaming or moving a file or folder rewrites matching history paths the same way the open path and last-opened bookkeeping already update.
2. Deleting a file or folder removes matching history entries.
3. Deleting the currently open document clears the editor (existing behavior) and clears the active history trail. The next successful open starts a new tip. Sudomd does not auto-open a neighbor from history.

### Toolbar, shortcuts, and menu

1. Back and Forward sit in the top toolbar’s start-side chrome.
2. With the sidebar open, that start-side region matches the sidebar width and the nav buttons sit at its end edge (aligned to the sidebar/content seam).
3. With the sidebar collapsed, the buttons sit immediately after the sidebar toggle with normal control spacing.
4. Buttons use the existing ghost icon control style, show disabled when the action cannot run, and expose shortcut hints in accessible names/titles.
5. Shortcuts: `CmdOrCtrl+[` (Back), `CmdOrCtrl+]` (Forward). The app handles them only when the corresponding action can run.
6. View menu includes Go Back and Go Forward at the top (with those accelerators), then a separator, then existing View items. Menu enablement matches the toolbar.

## Out of scope

- React Router or URL routing on desktop.
- Web app document history parity.
- Persisting history across app restarts.
- Restoring scroll position or rich/source mode from history.
- Auto-opening another history entry after deleting the current file.
- Optimistic UI while history navigation is in flight.
- A separate long-lived history for Loose Files independent of the open-folder trail.
