import { desktopApi } from "../desktopApi";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "sudomd-theme";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

/** The stored preference, defaulting to following the OS. */
export function getThemePreference(): ThemePreference {
	const value = localStorage.getItem(STORAGE_KEY);
	return value === "light" || value === "dark" || value === "system"
		? value
		: "system";
}

function isDark(preference: ThemePreference): boolean {
	return (
		preference === "dark" || (preference === "system" && prefersDark.matches)
	);
}

function apply(preference: ThemePreference) {
	// `.dark` drives the Tailwind class variant; nativeTheme keeps the window
	// chrome (traffic lights, native scrollbars, menus) in sync.
	document.documentElement.classList.toggle("dark", isDark(preference));
	void desktopApi.setNativeTheme(preference);
}

export function setThemePreference(preference: ThemePreference) {
	localStorage.setItem(STORAGE_KEY, preference);
	apply(preference);
}

/** Apply the saved theme and keep it live when the OS theme changes in `system` mode. */
export function initTheme() {
	apply(getThemePreference());
	prefersDark.addEventListener("change", () => {
		if (getThemePreference() === "system") apply("system");
	});
}
