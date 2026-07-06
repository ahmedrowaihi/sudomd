# Sudomd

**The best notepad for you and your agents.** Free, open source, backed by Markdown and HTML.

<p align="center">
  <a href="https://github.com/ahmedrowaihi/sudomd/releases/latest">Download</a>
  ·
  <a href="https://github.com/ahmedrowaihi/sudomd/releases">Releases</a>
  ·
  <a href="CONTRIBUTING.md">Contributing</a>
  ·
  <a href="https://twitter.com/ahmedrowaihi">@ahmedrowaihi</a>
</p>

## What is Sudomd?

Sudomd is a free, open-source notetaking app for you and your agents.

- **Feels familiar.** The same writing experience you're used to from Notion or Apple Notes, but for Markdown. `/` commands, Markdown shortcuts, and file properties / frontmatter are supported.
- **Agent ready.** Point your agent at your notes folder to start collaborating. Sudomd will live-reloads as your agent edits.
- **Build any view.** Beyond Markdown, you can build and view HTML-based apps. [Install the skills](https://github.com/ahmedrowaihi/sudomd-skills) and tell your coding agent what to build. Turn a folder of notes into a table, a bookshelf, a map... anything you can think of.

## Download

Sudomd ships as a desktop app. Install the latest build from the [releases page](https://github.com/ahmedrowaihi/sudomd/releases/latest).

macOS, Windows, and Linux are supported. macOS builds are signed and notarized; Windows and Linux builds are unsigned, so your OS may warn before the first launch.

## Compile from source

Want to build Sudomd directly? First, install the prerequisites:

- [Node.js](https://nodejs.org/en/download)
- [pnpm](https://pnpm.io/installation)
- macOS desktop builds: Xcode Command Line Tools via `xcode-select --install`

Then from the repo root:

```sh
pnpm install
pnpm bundle:desktop:mac
# or for windows:
pnpm bundle:desktop:win
# or for linux:
pnpm bundle:desktop:linux
```

This creates a production desktop bundle under `apps/desktop/release/`. For the live dev flow and packaging detail, see [`apps/desktop/README.md`](./apps/desktop/README.md).

## Repository structure

This repo is a pnpm workspace:

```text
.
├── apps
│   └── desktop  # Electron desktop app (the Sudomd app)
└── packages
    ├── editor   # Framework-agnostic Markdown editor core (Tiptap + Markdown conversion)
    ├── ui       # Shared React editor UI built on the editor core
    └── runtime  # Runtime injected into HTML Apps and Embeds
```

## Common commands

From the repo root:

```sh
pnpm install          # install dependencies
pnpm dev:desktop      # run the desktop app in dev
pnpm build            # check, build all packages, and typecheck
pnpm bundle:desktop:mac   # build a production desktop bundle for macOS
pnpm check            # run Biome
pnpm typecheck        # typecheck all packages
```

## Documentation

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) covers the contribution flow, local setup, and pre-PR checks.
- [`CONTEXT.md`](./CONTEXT.md) is the shared glossary for project terms (Workspace, HTML App, Embed, and more).
- [`apps/desktop/README.md`](./apps/desktop/README.md) covers desktop build, dev, and packaging.

## Contributing

Contributions of any size are welcome. Open an issue before substantial work so we can agree on the approach together. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full flow.

This project follows our [Code of Conduct](./CODE_OF_CONDUCT.md). To report a security issue, see our [security policy](./SECURITY.md).

## License

Sudomd is licensed under the [MIT License](./LICENSE).