# sudomd context

Glossary for shared terms across the project. Implementation details belong in code or ADRs — not here.

Sudomd is a **local-first desktop app**. It reads and writes the filesystem directly; there is no cloud backend, sync engine, or web surface.

## Flagged ambiguities

- **"Open folder" (desktop runtime) vs "Workspace."** The desktop editor operates on any open folder path and reads/writes the filesystem directly; that folder may be a [[Workspace Folder]] or a [[Plain Folder]]. Say "open folder" for the runtime notion, "Workspace" for the configured logical entity.
- **"Open file" can mean OS selection or editor navigation.** In desktop shell language, opening a file may mean choosing a Loose File from the operating system. In [[HTML App]] API language, opening a file means navigating the editor to a [[Markdown File]] inside the current [[Workspace]].

## Glossary

### Workspace

A logical container of Markdown Files and Assets, defined by a **workspace configuration** (`.sudomd/config.json`). Configuration presence — not anything external — is what makes a folder a Workspace. A Workspace has a stable identity from the moment it is created, and reads/writes its [[Workspace Folder]] directly on disk (the source of truth).

### Workspace Folder

The on-disk realization of a [[Workspace]]: a folder containing the workspace configuration at `.sudomd/config.json`. **Configuration presence is what makes a folder a Workspace Folder.**

### Plain Folder

A folder open in the desktop app with **no** workspace configuration (no `.sudomd/`). It is not a [[Workspace]]: the desktop app reads and edits it as a general markdown viewer, and Workspace-scoped features (e.g. [[Embed]]s) do not resolve. Adding a configuration promotes it to a [[Workspace Folder]].

### Folder

A filesystem directory inside a [[Workspace Folder]] or [[Plain Folder]]. A Folder can contain zero or more [[Markdown File]]s and zero or more Folders.
_Avoid_: Directory

### Compacted Folder Path

A single sidebar row that represents a chain of nested Folders where each Folder has exactly one child Folder and no sibling [[Markdown File]]s or Folders. Each segment in the row names one real Folder, and can be targeted independently for folder actions such as dragging or dropping.
_Avoid_: Compacted directory name

### Markdown File

A markdown document in a [[Workspace]] or opened directly from the filesystem.

### HTML App

A folder-local `.html` file that Sudomd runs as a self-contained, interactive UI. Opening an HTML App directly shows it in the main content panel instead of the Markdown editor. An HTML App reaches files in the open Folder only through a capability-scoped, async **broker**, never directly.

### Slash Command

A formatting command launched by typing `/` in a Markdown File. Slash Commands create a new block after the current block, except when the current block is an empty paragraph, where the command converts that paragraph in place.

### File Properties

User-facing structured fields attached to a Markdown File. File Properties are distinct from the document body and are stored in the file's front matter.

### Loose File

A Markdown File opened directly from the filesystem, not through a Workspace Folder or Plain Folder. The desktop app can read and edit it with access scoped to the file and nearby assets.

### Asset

A binary file referenced by a Markdown File, such as an image. Asset paths in markdown use the desktop-canonical `<markdown-file-stem>.assets/<hash>.<ext>` convention relative to the Markdown File's folder.

### Embed

An inline placement of an [[HTML App]] at a point in a [[Markdown File]]. Use an Embed when an HTML App should appear inside existing Markdown content instead of taking over the main content panel. See ADR-0007.

Embeds have the same constraints as HTML apps; they reach files in the open Folder only through a capability-scoped, async **broker**, never directly.

### HTML App File API

The [[HTML App]] broker capability for reading, navigating to, creating, and patching [[Markdown File]]s inside the current [[Workspace]]. Reading a file returns its body and [[File Properties]] separately; updating a file is patch-like, so omitted body or property keys are preserved and explicit property deletion must be requested.

HTML App File API methods throw on failure by default. Each method also has a safe variant that returns an explicit success or failure result instead of throwing.
_Avoid_: filesystem API, direct file access.

### Workspace Snapshot

The client's currently loaded view of a [[Workspace]] — an atomically assembled bundle of (workspace name, files list, last-opened file content). The app shell renders only when a Workspace Snapshot exists; the UI never shows a partially-loaded one. Switching workspaces means preparing a new snapshot in the background and replacing the previous Workspace Snapshot in a single update once it's ready.
