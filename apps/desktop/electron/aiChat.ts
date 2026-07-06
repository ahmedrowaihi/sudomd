import { query } from "@anthropic-ai/claude-agent-sdk";

export type AiChatEvent =
	| { type: "text"; text: string }
	| { type: "thinking"; text: string }
	| { type: "tool"; id: string; name: string; input: unknown }
	| {
			type: "tool-result";
			toolUseId: string;
			content: string;
			isError: boolean;
	  }
	| { type: "done"; sessionId: string | null; costUsd: number | null }
	| { type: "error"; message: string };

export type AiPermissionMode = "default" | "plan" | "acceptEdits";
export type AiPermissionDecision = "allow" | "allow-always" | "deny";
export type RequestPermission = (
	toolName: string,
	input: unknown,
) => Promise<AiPermissionDecision>;

export type AiChatInput = {
	prompt: string;
	cwd: string;
	credential: string;
	mode: AiPermissionMode;
	sessionId?: string | null;
	forkSession?: boolean;
};

// Sudomd never manages Claude auth — it forwards the user's own credential to the
// bundled Claude Code binary. A subscription OAuth token (from `claude setup-token`)
// and a Console API key use different env vars, and either would shadow the other.
function credentialEnv(credential: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) env[key] = value;
	}
	if (credential.startsWith("sk-ant-oat")) {
		env.CLAUDE_CODE_OAUTH_TOKEN = credential;
		delete env.ANTHROPIC_API_KEY;
		delete env.ANTHROPIC_AUTH_TOKEN;
	} else {
		env.ANTHROPIC_API_KEY = credential;
		delete env.CLAUDE_CODE_OAUTH_TOKEN;
	}
	// Keep the agent scoped to the notes workspace: don't let auto-memory from the
	// host process's project (e.g. the Sudomd repo in dev) leak into the session.
	env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = "1";
	return env;
}

function resultToText(content: unknown): { text: string; isError: boolean } {
	if (typeof content === "string") return { text: content, isError: false };
	if (Array.isArray(content)) {
		const text = content
			.map((block) =>
				block && typeof block === "object" && "text" in block
					? String((block as { text: unknown }).text)
					: "",
			)
			.join("");
		return { text, isError: false };
	}
	return { text: "", isError: false };
}

export async function runAiChat(
	input: AiChatInput,
	onEvent: (event: AiChatEvent) => void,
	abortController: AbortController,
	requestPermission: RequestPermission,
): Promise<void> {
	let sessionId: string | null = input.sessionId ?? null;
	try {
		for await (const message of query({
			prompt: input.prompt,
			options: {
				cwd: input.cwd,
				// Load only the notes folder's own settings — not the host process's
				// user/global config — so the session's context is the workspace.
				settingSources: ["project"],
				systemPrompt: {
					type: "preset",
					preset: "claude_code",
					append: `You are Claude, an assistant embedded in the sudomd markdown notes app. You are working inside the user's notes workspace at ${input.cwd}. Help them read, search, draft, and edit their markdown (.md) notes here.`,
				},
				permissionMode: input.mode,
				resume: input.sessionId ?? undefined,
				forkSession: input.forkSession ?? undefined,
				env: credentialEnv(input.credential),
				abortController,
				includePartialMessages: true,
				canUseTool: async (toolName, toolInput, { suggestions }) => {
					// "acceptEdits" is the fully-auto mode: never ask.
					if (input.mode === "acceptEdits") {
						return { behavior: "allow", updatedInput: toolInput };
					}
					const decision = await requestPermission(toolName, toolInput);
					if (decision === "deny") {
						return { behavior: "deny", message: "Denied by user" };
					}
					if (decision === "allow-always") {
						return {
							behavior: "allow",
							updatedInput: toolInput,
							updatedPermissions: suggestions,
						};
					}
					return { behavior: "allow", updatedInput: toolInput };
				},
			},
		})) {
			if ("session_id" in message && message.session_id) {
				sessionId = message.session_id;
			}

			// Token-by-token deltas for assistant text and thinking.
			if (message.type === "stream_event") {
				const event = message.event;
				if (event.type === "content_block_delta") {
					const delta = event.delta;
					if (delta.type === "text_delta") {
						onEvent({ type: "text", text: delta.text });
					} else if (delta.type === "thinking_delta") {
						onEvent({ type: "thinking", text: delta.thinking });
					}
				}
				continue;
			}

			// Completed assistant turn: pull out the tool calls (full inputs).
			if (message.type === "assistant") {
				for (const block of message.message.content) {
					if (block.type === "tool_use") {
						onEvent({
							type: "tool",
							id: block.id,
							name: block.name,
							input: block.input,
						});
					}
				}
				continue;
			}

			// Tool results come back as synthetic user messages.
			if (message.type === "user") {
				const content = message.message.content;
				if (Array.isArray(content)) {
					for (const block of content) {
						if (block.type === "tool_result") {
							const { text, isError } = resultToText(block.content);
							onEvent({
								type: "tool-result",
								toolUseId: block.tool_use_id,
								content: text,
								isError: block.is_error ?? isError,
							});
						}
					}
				}
				continue;
			}

			if (message.type === "result") {
				onEvent({
					type: "done",
					sessionId,
					costUsd:
						typeof message.total_cost_usd === "number"
							? message.total_cost_usd
							: null,
				});
				return;
			}
		}
		onEvent({ type: "done", sessionId, costUsd: null });
	} catch (err) {
		onEvent({
			type: "error",
			message: err instanceof Error ? err.message : String(err),
		});
	}
}
