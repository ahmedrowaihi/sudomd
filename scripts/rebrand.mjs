#!/usr/bin/env node
/**
 * Rebrand this fork end to end: identifiers, config, theme colors, and the app
 * icon. Detects the current brand from the desktop package.json, so it keeps
 * working no matter what the fork is currently called.
 *
 * Usage:
 *   node scripts/rebrand.mjs                       # reads ./brand.config.json
 *   node scripts/rebrand.mjs --config brand.json   # explicit config file
 *   node scripts/rebrand.mjs --slug myapp --display MyApp --repo me/myapp \
 *     --author "Jane <jane@x.com>" --icon ./logo.png --brand "oklch(...)"
 *   node scripts/rebrand.mjs --dry                 # preview, write nothing
 *
 * Config keys mirror the flags: slug, displayName, appId, author, repo,
 * tagPrefix, icon, theme.{brand,brandAccent,brandAccentForeground}.
 * Only `slug` is required; the rest fall back to sensible defaults.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([
	"node_modules",
	"dist",
	"out",
	"release",
	".git",
	".dev-electron",
	"assets",
]);
const TEXT_EXT = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
	".css",
	".html",
	".md",
	".yaml",
	".yml",
	".astro",
	".txt",
]);

const upper = (s) => s.replace(/[^a-z0-9]+/gi, "_").toUpperCase();
const pascal = (s) =>
	s
		.split(/[^a-z0-9]+/i)
		.filter(Boolean)
		.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
		.join("");

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) continue;
		const key = a.slice(2);
		if (key === "dry") {
			out.dry = true;
			continue;
		}
		out[key] = argv[++i];
	}
	return out;
}

function loadConfig(args) {
	const configPath = path.resolve(ROOT, args.config ?? "brand.config.json");
	let file = {};
	if (fs.existsSync(configPath)) {
		file = JSON.parse(fs.readFileSync(configPath, "utf8"));
	}
	const slug = args.slug ?? file.slug;
	if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
		fail(
			`Missing or invalid "slug". Provide --slug or a brand.config.json.\n` +
				`Slug must be lowercase, start with a letter: e.g. "myapp".`,
		);
	}
	const theme = file.theme ?? {};
	return {
		slug,
		displayName: args.display ?? file.displayName ?? pascal(slug),
		appId: args.appId ?? file.appId ?? `com.${slug}.desktop`,
		author: args.author ?? file.author,
		repo: args.repo ?? file.repo,
		tagPrefix: args.tagPrefix ?? file.tagPrefix ?? `${slug}-v`,
		icon: args.icon ?? file.icon,
		theme: {
			brand: args.brand ?? theme.brand,
			brandAccent: args.brandAccent ?? theme.brandAccent,
			brandAccentForeground:
				args.brandAccentForeground ?? theme.brandAccentForeground,
		},
		dry: !!args.dry,
	};
}

function detectCurrent() {
	const pkg = readJson(path.join(ROOT, "apps/desktop/package.json"));
	const scope = pkg.name.split("/")[0].replace(/^@/, "");
	const publish = pkg.build?.publish?.[0] ?? {};
	return {
		slug: scope,
		owner: publish.owner,
		author: pkg.author,
		tagPrefix: publish.tagNamePrefix,
	};
}

function forms(slug) {
	return { slug, upper: upper(slug), pascal: pascal(slug) };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const cfg = loadConfig(args);
	const cur = detectCurrent();
	const from = forms(cur.slug);
	const to = forms(cfg.slug);

	if (from.slug === to.slug && !cfg.theme.brand && !cfg.icon) {
		console.log(`Already branded "${cur.slug}". Nothing to do.`);
		return;
	}

	log(cfg, `Rebranding "${from.slug}" → "${to.slug}" (${cfg.displayName})`);

	const rules = buildRules(from, to, cur, cfg);
	const renames = rewriteTree(rules, cfg, from, to);
	patchDesktopPkg(cfg, cur);
	patchTheme(cfg);
	renameFiles(renames, cfg);
	await generateIcon(cfg);

	log(cfg, "");
	log(
		cfg,
		cfg.dry ? "Dry run complete — no files changed." : "Rebrand complete.",
	);
	if (!cfg.dry) {
		log(cfg, "Next: pnpm install && pnpm build:desktop to verify.");
	}
}

function buildRules(from, to, cur, cfg) {
	const rules = [
		[`@${from.slug}`, `@${to.slug}`],
		[from.upper, to.upper],
		[from.pascal, to.pascal],
		[from.slug, to.slug],
	];
	if (cur.owner && cfg.repo) rules.push([cur.owner, cfg.repo.split("/")[0]]);
	if (cur.author && cfg.author) rules.push([cur.author, cfg.author]);
	// Longest source first so "@slug" and "SLUG" win over a bare "slug".
	return rules
		.filter(([a, b]) => a && a !== b)
		.sort((x, y) => y[0].length - x[0].length);
}

function applyRules(text, rules) {
	let out = text;
	for (const [a, b] of rules) out = out.split(a).join(b);
	return out;
}

function rewriteTree(rules, cfg, from, to) {
	const renames = [];
	walk(ROOT, (file) => {
		const ext = path.extname(file);
		if (TEXT_EXT.has(ext)) {
			const text = fs.readFileSync(file, "utf8");
			const next = applyRules(text, rules);
			if (next !== text) {
				if (!cfg.dry) fs.writeFileSync(file, next);
				log(cfg, `  edit  ${path.relative(ROOT, file)}`);
			}
		}
		const base = path.basename(file);
		if (base.includes(from.slug) || base.includes(from.pascal)) {
			const nextBase = base
				.split(from.pascal)
				.join(to.pascal)
				.split(from.slug)
				.join(to.slug);
			if (nextBase !== base) {
				renames.push([file, path.join(path.dirname(file), nextBase)]);
			}
		}
	});
	return renames;
}

function renameFiles(renames, cfg) {
	for (const [src, dest] of renames) {
		log(cfg, `  move  ${path.relative(ROOT, src)} → ${path.basename(dest)}`);
		if (cfg.dry) continue;
		try {
			execFileSync("git", ["mv", src, dest], { cwd: ROOT, stdio: "ignore" });
		} catch {
			fs.renameSync(src, dest);
		}
	}
}

function patchDesktopPkg(cfg, cur) {
	const file = path.join(ROOT, "apps/desktop/package.json");
	const pkg = readJson(file);
	pkg.description = `Desktop app for ${cfg.displayName}`;
	if (cfg.author) pkg.author = cfg.author;
	if (cfg.repo) {
		pkg.repository = {
			...pkg.repository,
			url: `git+https://github.com/${cfg.repo}.git`,
		};
		pkg.homepage = `https://github.com/${cfg.repo}`;
		pkg.bugs = `https://github.com/${cfg.repo}/issues`;
	}
	pkg.build.appId = cfg.appId;
	pkg.build.productName = cfg.displayName;
	pkg.build.linux.executableName = cfg.slug;
	if (pkg.build.deb) pkg.build.deb.packageName = cfg.slug;
	const publish = pkg.build.publish?.[0];
	if (publish) {
		if (cfg.repo) {
			const [owner, repo] = cfg.repo.split("/");
			publish.owner = owner;
			publish.repo = repo;
		}
		publish.tagNamePrefix = cfg.tagPrefix;
	}
	writeJson(file, pkg, cfg);
	log(cfg, `  patch apps/desktop/package.json (appId, productName, publish)`);

	patchReleaseWorkflow(cfg);
}

function patchReleaseWorkflow(cfg) {
	const file = path.join(ROOT, ".github/workflows/desktop-release.yml");
	if (!fs.existsSync(file)) return;
	// The tree rewrite already turned the old "<oldslug>-v" into "<slug>-v";
	// only a custom tagPrefix that diverges from that needs a second pass.
	const oldPrefix = `${cfg.slug}-v`;
	if (oldPrefix === cfg.tagPrefix) return;
	const next = fs
		.readFileSync(file, "utf8")
		.split(oldPrefix)
		.join(cfg.tagPrefix);
	if (!cfg.dry) fs.writeFileSync(file, next);
	log(cfg, `  patch desktop-release.yml tag prefix → ${cfg.tagPrefix}`);
}

function patchTheme(cfg) {
	const { brand, brandAccent, brandAccentForeground } = cfg.theme;
	if (!brand && !brandAccent && !brandAccentForeground) return;
	const file = path.join(ROOT, "packages/ui/src/theme.css");
	let text = fs.readFileSync(file, "utf8");
	const set = (name, value) => {
		if (!value) return;
		const re = new RegExp(`(--${name}:\\s*)[^;]+(;)`);
		if (!re.test(text)) {
			log(cfg, `  warn  --${name} not found in theme.css`);
			return;
		}
		text = text.replace(re, `$1${value}$2`);
		log(cfg, `  theme --${name} → ${value}`);
	};
	set("brand", brand);
	set("brand-accent", brandAccent);
	set("brand-accent-foreground", brandAccentForeground);
	if (!cfg.dry) fs.writeFileSync(file, text);
}

/**
 * Writes assets/icon.png and points build.icon at it. electron-builder converts
 * that single PNG to .icns/.ico/Linux sizes at build time on every OS — no
 * system tools. If `sharp` is installed we bake the macOS squircle in first
 * (macOS doesn't auto-round app icons); otherwise the image is used as-is.
 */
async function generateIcon(cfg) {
	if (!cfg.icon) return;
	const src = path.resolve(ROOT, cfg.icon);
	if (!fs.existsSync(src)) {
		log(cfg, `  warn  icon not found: ${cfg.icon}`);
		return;
	}
	const out = path.join(ROOT, "apps/desktop/assets/icon.png");
	if (cfg.dry) {
		log(
			cfg,
			`  icon  would write assets/icon.png from ${cfg.icon} (electron-builder converts it)`,
		);
		return;
	}
	const sharp = await tryImport("sharp");
	if (sharp) {
		await roundSquircle(sharp, src, out);
		log(
			cfg,
			"  icon  wrote rounded assets/icon.png (macOS squircle via sharp)",
		);
	} else {
		fs.copyFileSync(src, out);
		log(
			cfg,
			`  icon  wrote assets/icon.png as-is — run \`pnpm add -D sharp\` and re-run ` +
				`for an auto-rounded macOS squircle, or pre-round your PNG.`,
		);
	}
	setBuildIcon(cfg, "assets/icon.png");
}

/** Big Sur squircle: 824px art centered on a 1024 canvas, 185px corner radius. */
async function roundSquircle(sharp, src, out) {
	const size = 1024,
		art = 824,
		inset = 100,
		radius = 185;
	const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
	const base = await sharp(src)
		.resize(art, art, { fit: "contain", background: transparent })
		.extend({
			top: inset,
			bottom: inset,
			left: inset,
			right: inset,
			background: transparent,
		})
		.png()
		.toBuffer();
	const mask = Buffer.from(
		`<svg width="${size}" height="${size}"><rect x="${inset}" y="${inset}" ` +
			`width="${art}" height="${art}" rx="${radius}" ry="${radius}"/></svg>`,
	);
	await sharp(base)
		.composite([{ input: mask, blend: "dest-in" }])
		.png()
		.toFile(out);
}

async function tryImport(name) {
	try {
		const mod = await import(name);
		return mod.default ?? mod;
	} catch {
		return null;
	}
}

function setBuildIcon(cfg, iconPath) {
	const file = path.join(ROOT, "apps/desktop/package.json");
	const pkg = readJson(file);
	pkg.build.icon = iconPath;
	// Drop any per-platform icon override so every target converts the one PNG.
	if (pkg.build.win) delete pkg.build.win.icon;
	writeJson(file, pkg, cfg);
	log(cfg, `  patch build.icon → ${iconPath}`);
}

function walk(dir, fn) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			walk(path.join(dir, entry.name), fn);
		} else if (entry.isFile()) {
			fn(path.join(dir, entry.name));
		}
	}
}

const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
function writeJson(f, obj, cfg) {
	if (cfg.dry) return;
	fs.writeFileSync(f, `${JSON.stringify(obj, null, "\t")}\n`);
}
const log = (cfg, m) => console.log(m);
function fail(m) {
	console.error(`rebrand: ${m}`);
	process.exit(1);
}

main().catch((err) => fail(err?.message ?? String(err)));
