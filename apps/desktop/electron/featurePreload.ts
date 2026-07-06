import { ipcRenderer } from "electron";

export const featurePreload = {
	fetchBasecamp: (url: string) =>
		ipcRenderer.invoke("desktop:basecamp-fetch", { url }),
	searchBasecamp: (query: string) =>
		ipcRenderer.invoke("desktop:basecamp-search", { query }),
	setNativeTheme: (source: "light" | "dark" | "system") =>
		ipcRenderer.invoke("desktop:set-native-theme", { source }),
};
