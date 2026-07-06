# Rebranding your fork

`scripts/rebrand.mjs` renames this fork end to end — identifiers, package
metadata, release config, theme colors, and the app icon — in one pass. It
auto-detects the current brand from `apps/desktop/package.json`, so it works no
matter what the fork is currently called.

## Quick start

1. Copy the example config and edit it:

   ```sh
   cp brand.config.example.json brand.config.json
   ```

2. Run it:

   ```sh
   pnpm rebrand            # reads ./brand.config.json
   pnpm rebrand --dry      # preview only, writes nothing
   ```

3. Reinstall and build to verify:

   ```sh
   pnpm install && pnpm build:desktop
   ```

## Config

Only `slug` is required; everything else has a sensible default.

| Key | Default | Purpose |
| --- | --- | --- |
| `slug` | — | Lowercase identifier used in the package scope (`@slug/*`), app id, config dir, protocol, env vars. |
| `displayName` | PascalCase of `slug` | Human-facing product name (window title, installer). |
| `appId` | `com.<slug>.desktop` | macOS/Windows application id. |
| `author` | unchanged | `Name <email>` for package + release metadata. |
| `repo` | unchanged | `owner/name` — sets repository URL, homepage, bugs, and the GitHub publish target. |
| `tagPrefix` | `<slug>-v` | Release tag prefix (electron-builder + release workflow). |
| `icon` | — | Path to a square PNG (1024×1024 ideal) for the app icon. |
| `theme.brand` / `theme.brandAccent` / `theme.brandAccentForeground` | unchanged | `oklch(...)` brand colors written into `packages/ui/src/theme.css`. |

Every key also works as a CLI flag: `--slug`, `--display`, `--appId`,
`--author`, `--repo`, `--tagPrefix`, `--icon`, `--brand`, `--brandAccent`,
`--brandAccentForeground`, plus `--config <path>` and `--dry`.

## Icon

The script writes your image to `assets/icon.png` and points `build.icon` at
it. electron-builder converts that single PNG to `.icns` (macOS), `.ico`
(Windows), and the Linux sizes at build time — on any OS, with no system tools.
Use a square PNG, ideally 1024×1024 (512×512 minimum).

macOS does not auto-round app icons, so the rounded "squircle" look has to be
baked into the PNG. If [`sharp`](https://sharp.pixelplumbing.com) is installed
the script does this for you (Big Sur squircle); otherwise it uses your image
as-is. To opt into auto-rounding:

```sh
pnpm add -Dw sharp && pnpm rebrand
```

Or pre-round the image yourself and skip `sharp` entirely.
