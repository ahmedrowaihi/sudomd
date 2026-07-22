export type Direction = "ltr" | "rtl";

// Fallback for engines without Intl.Locale textInfo. Primary RTL language
// subtags (ISO 639-1/2/3) — enough to cover Arabic, Hebrew, Persian, Urdu, etc.
const RTL_LANGUAGES = new Set([
	"ar",
	"arc",
	"ckb",
	"dv",
	"fa",
	"ha",
	"he",
	"khw",
	"ks",
	"nqo",
	"prs",
	"ps",
	"sd",
	"syr",
	"ug",
	"ur",
	"yi",
]);

/** Resolve writing direction from a BCP-47 locale (defaults to the UI locale). */
export function resolveDirection(
	locale: string = navigator.language,
): Direction {
	try {
		const info = (
			new Intl.Locale(locale) as Intl.Locale & {
				textInfo?: { direction?: string };
			}
		).textInfo;
		if (info?.direction === "rtl" || info?.direction === "ltr") {
			return info.direction;
		}
	} catch {
		// Fall through to the subtag check below.
	}
	const primary = locale.toLowerCase().split(/[-_]/)[0];
	return RTL_LANGUAGES.has(primary) ? "rtl" : "ltr";
}
