import { type IpcMain, nativeTheme } from "electron";

export function registerThemeIpc(ipcMain: IpcMain) {
	nativeTheme.themeSource = "system";
	ipcMain.handle(
		"desktop:set-native-theme",
		(_event, { source }: { source: "light" | "dark" | "system" }) => {
			nativeTheme.themeSource = source;
		},
	);
}
