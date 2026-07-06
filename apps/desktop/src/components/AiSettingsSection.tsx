import { Input } from "@sudomd/ui";
import { useState } from "react";
import { desktopApi } from "../desktopApi";
import { AI_CREDENTIAL_KEY, getAiCredential } from "./ChatPanel";

export function AiSettingsSection() {
	const [value, setValue] = useState(getAiCredential);

	function persist(next: string) {
		setValue(next);
		if (next.trim()) localStorage.setItem(AI_CREDENTIAL_KEY, next.trim());
		else localStorage.removeItem(AI_CREDENTIAL_KEY);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-1">
				<span className="text-xs font-semibold text-foreground">
					Claude assistant
				</span>
				<p className="text-[11px] text-muted-foreground">
					Paste an Anthropic API key, or a Claude Code OAuth token from{" "}
					<code className="rounded-sm bg-muted px-1">claude setup-token</code>{" "}
					to use your own subscription. Stored locally on this device.
				</p>
			</div>
			<Input
				type="password"
				value={value}
				placeholder="sk-ant-…"
				onChange={(event) => persist(event.target.value)}
			/>
			<button
				type="button"
				className="self-start text-[11px] text-muted-foreground underline hover:text-foreground"
				onClick={() =>
					void desktopApi.openExternalUrl("https://platform.claude.com/")
				}
			>
				Get an API key
			</button>
		</div>
	);
}
