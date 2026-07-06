import { useState } from "react";
import MingcuteMonitorLine from "~icons/mingcute/monitor-line";
import MingcuteMoonLine from "~icons/mingcute/moon-line";
import MingcuteSunLine from "~icons/mingcute/sun-line";
import {
	getThemePreference,
	setThemePreference,
	type ThemePreference,
} from "../lib/theme";
import { cn } from "../lib/utils";

const OPTIONS: {
	value: ThemePreference;
	label: string;
	Icon: typeof MingcuteSunLine;
}[] = [
	{ value: "light", label: "Light", Icon: MingcuteSunLine },
	{ value: "dark", label: "Dark", Icon: MingcuteMoonLine },
	{ value: "system", label: "System", Icon: MingcuteMonitorLine },
];

export function AppearanceSection() {
	const [preference, setPreference] = useState(getThemePreference);

	function select(next: ThemePreference) {
		setPreference(next);
		setThemePreference(next);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold text-foreground">Theme</span>
				<p className="text-[11px] text-muted-foreground">
					Follow your system, or force light or dark. Stored on this device.
				</p>
			</div>
			<div className="inline-flex gap-1 self-start rounded-sm border border-border bg-muted/40 p-0.5">
				{OPTIONS.map(({ value, label, Icon }) => (
					<button
						key={value}
						type="button"
						onClick={() => select(value)}
						aria-pressed={preference === value}
						className={cn(
							"flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] transition-colors",
							preference === value
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="size-3.5 shrink-0" />
						{label}
					</button>
				))}
			</div>
		</div>
	);
}
