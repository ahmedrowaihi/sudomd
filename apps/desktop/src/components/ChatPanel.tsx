import { useStoreValue } from "@simplestack/store/react";
import { Button } from "@sudomd/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import MingcuteAddLine from "~icons/mingcute/add-line";
import MingcuteCloseLine from "~icons/mingcute/close-line";
import MingcuteDelete2Line from "~icons/mingcute/delete-2-line";
import MingcuteGitBranchLine from "~icons/mingcute/git-branch-line";
import MingcuteHistoryLine from "~icons/mingcute/history-line";
import MingcuteSendPlaneLine from "~icons/mingcute/send-plane-line";
import MingcuteSparklesLine from "~icons/mingcute/sparkles-line";
import { desktopApi } from "../desktopApi";
import type {
	AiChatEvent,
	AiChatHandle,
	AiPermissionDecision,
	AiPermissionMode,
} from "../desktopApi/types";
import { relativeWorkspacePath } from "../lib/filePath";
import { workspacePathStore, workspaceStore } from "../store/state";
import {
	type Conversation,
	conversationTitle,
	loadConversations,
	newConversation,
	saveConversations,
	type TranscriptItem,
} from "./aiConversations";

export const AI_CREDENTIAL_KEY = "sudomd:ai-credential";

export function getAiCredential(): string {
	return localStorage.getItem(AI_CREDENTIAL_KEY) ?? "";
}

type PendingPermission = { id: string; toolName: string; input: unknown };

const MODES: { value: AiPermissionMode; label: string; hint: string }[] = [
	{
		value: "default",
		label: "Review",
		hint: "Review each edit and command before it runs",
	},
	{
		value: "plan",
		label: "Plan",
		hint: "Claude plans first; you approve before it acts",
	},
	{
		value: "acceptEdits",
		label: "Auto",
		hint: "Auto-apply edits without asking",
	},
];

type SlashCommand = { name: string; hint: string };
const SLASH_COMMANDS: SlashCommand[] = [
	{ name: "new", hint: "Start a new conversation" },
	{ name: "fork", hint: "Fork this conversation" },
	{ name: "review", hint: "Switch to Review mode" },
	{ name: "plan", hint: "Switch to Plan mode" },
	{ name: "auto", hint: "Switch to Auto mode" },
];

/** Turn a tool call into a Claude-Code-style label, e.g. `Read(notes/a.md)`. */
function toolLabel(name: string, input: unknown): string {
	const record = (input ?? {}) as Record<string, unknown>;
	const target =
		record.file_path ??
		record.path ??
		record.pattern ??
		record.command ??
		record.url;
	const short =
		typeof target === "string"
			? target.split("/").slice(-2).join("/")
			: undefined;
	return short ? `${name}(${short})` : name;
}

export function ChatPanel({
	open,
	onOpenChange,
	onOpenSettings,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenSettings: () => void;
}) {
	const workspacePath = useStoreValue(workspacePathStore);
	const initial = useMemo(() => {
		const loaded = loadConversations();
		return loaded.length > 0 ? loaded : [newConversation()];
	}, []);
	const [conversations, setConversations] = useState<Conversation[]>(initial);
	const [activeId, setActiveId] = useState(initial[0].id);
	const [showHistory, setShowHistory] = useState(false);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [mode, setMode] = useState<AiPermissionMode>("default");
	const [pending, setPending] = useState<PendingPermission | null>(null);
	const [mention, setMention] = useState<{
		query: string;
		start: number;
	} | null>(null);
	const [mentionIndex, setMentionIndex] = useState(0);
	const handleRef = useRef<AiChatHandle | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const active =
		conversations.find((convo) => convo.id === activeId) ?? conversations[0];

	const files = useStoreValue(workspaceStore).files;
	const relativeFiles = useMemo(
		() =>
			files.map((file) =>
				relativeWorkspacePath(file.path, workspacePath ?? null),
			),
		[files, workspacePath],
	);
	const mentionMatches = useMemo(() => {
		if (!mention) return [];
		const query = mention.query.toLowerCase();
		return relativeFiles
			.filter((rel) => rel.toLowerCase().includes(query))
			.sort((a, b) => {
				const aName = (a.split("/").pop() ?? a).toLowerCase();
				const bName = (b.split("/").pop() ?? b).toLowerCase();
				const aRank = aName.startsWith(query) ? 0 : 1;
				const bRank = bName.startsWith(query) ? 0 : 1;
				return aRank - bRank || a.length - b.length;
			})
			.slice(0, 8);
	}, [mention, relativeFiles]);

	useEffect(() => {
		saveConversations(conversations);
	}, [conversations]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: keep the log pinned to the newest content.
	useEffect(() => {
		listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
	}, [active?.items]);

	if (!open) return null;

	function patch(id: string, update: (convo: Conversation) => Conversation) {
		setConversations((list) =>
			list.map((convo) => (convo.id === id ? update(convo) : convo)),
		);
	}

	function makeHandler(targetId: string) {
		return (event: AiChatEvent) => {
			patch(targetId, (convo) => {
				const items = [...convo.items];
				const last = items[items.length - 1];
				let costUsd = convo.costUsd;
				let sessionId = convo.sessionId;
				let forkFrom = convo.forkFrom;
				if (event.type === "text") {
					if (last?.kind === "text")
						items[items.length - 1] = { ...last, text: last.text + event.text };
					else items.push({ kind: "text", text: event.text });
				} else if (event.type === "thinking") {
					if (last?.kind === "thinking")
						items[items.length - 1] = { ...last, text: last.text + event.text };
					else items.push({ kind: "thinking", text: event.text });
				} else if (event.type === "tool") {
					items.push({
						kind: "tool",
						id: event.id,
						name: event.name,
						input: event.input,
					});
				} else if (event.type === "tool-result") {
					for (let i = items.length - 1; i >= 0; i -= 1) {
						const tool = items[i];
						if (tool.kind === "tool" && tool.id === event.toolUseId) {
							items[i] = {
								...tool,
								result: event.content,
								isError: event.isError,
							};
							break;
						}
					}
				} else if (event.type === "error") {
					items.push({ kind: "text", text: `⚠️ ${event.message}` });
				} else if (event.type === "done") {
					if (event.costUsd) costUsd += event.costUsd;
					if (event.sessionId) sessionId = event.sessionId;
					forkFrom = null;
				}
				return {
					...convo,
					items,
					costUsd,
					sessionId,
					forkFrom,
					updatedAt: Date.now(),
				};
			});

			if (event.type === "permission") {
				setPending({
					id: event.id,
					toolName: event.toolName,
					input: event.input,
				});
			} else if (event.type === "done" || event.type === "error") {
				setBusy(false);
				handleRef.current = null;
			}
		};
	}

	function resolvePermission(decision: AiPermissionDecision) {
		if (!pending) return;
		handleRef.current?.replyPermission(pending.id, decision);
		setPending(null);
	}

	function onComposerChange(value: string, caret: number) {
		setInput(value);
		setMentionIndex(0);
		const match = /(?:^|\s)@([^@\s]*)$/.exec(value.slice(0, caret));
		setMention(
			match ? { query: match[1], start: caret - match[1].length - 1 } : null,
		);
	}

	function runCommand(name: string) {
		setInput("");
		setMention(null);
		if (name === "new") startConversation(newConversation());
		else if (name === "fork" && active?.sessionId)
			startConversation(newConversation(active.sessionId));
		else if (name === "review") setMode("default");
		else if (name === "plan") setMode("plan");
		else if (name === "auto") setMode("acceptEdits");
	}

	function selectMention(rel: string) {
		if (!mention) return;
		const caret = textareaRef.current?.selectionStart ?? input.length;
		const before = input.slice(0, mention.start);
		const after = input.slice(caret);
		const nextValue = `${before}@${rel} ${after}`;
		const nextCaret = before.length + rel.length + 2;
		setInput(nextValue);
		setMention(null);
		requestAnimationFrame(() => {
			textareaRef.current?.focus();
			textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
		});
	}

	function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (slashCommands.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setMentionIndex((i) => (i + 1) % slashCommands.length);
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setMentionIndex(
					(i) => (i - 1 + slashCommands.length) % slashCommands.length,
				);
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				runCommand((slashCommands[mentionIndex] ?? slashCommands[0]).name);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				setInput("");
				return;
			}
		}
		if (mention && mentionMatches.length > 0) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				setMentionIndex((i) => (i + 1) % mentionMatches.length);
				return;
			}
			if (event.key === "ArrowUp") {
				event.preventDefault();
				setMentionIndex(
					(i) => (i - 1 + mentionMatches.length) % mentionMatches.length,
				);
				return;
			}
			if (event.key === "Enter" || event.key === "Tab") {
				event.preventDefault();
				selectMention(mentionMatches[mentionIndex] ?? mentionMatches[0]);
				return;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				setMention(null);
				return;
			}
		}
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			send();
		}
	}

	function send() {
		const prompt = input.trim();
		if (!prompt || busy || !workspacePath || !active) return;
		const credential = getAiCredential();
		if (!credential) {
			onOpenSettings();
			return;
		}
		setInput("");
		const targetId = active.id;
		patch(targetId, (convo) => ({
			...convo,
			items: [...convo.items, { kind: "user", text: prompt }],
			updatedAt: Date.now(),
		}));
		setBusy(true);
		handleRef.current = desktopApi.sendAiChat(
			{
				prompt,
				cwd: workspacePath,
				credential,
				mode,
				sessionId: active.sessionId ?? active.forkFrom ?? null,
				forkSession: !active.sessionId && Boolean(active.forkFrom),
			},
			makeHandler(targetId),
		);
	}

	function startConversation(convo: Conversation) {
		setConversations((list) => [convo, ...list]);
		setActiveId(convo.id);
		setShowHistory(false);
		setPending(null);
	}

	function deleteConversation(id: string) {
		setConversations((list) => {
			const next = list.filter((convo) => convo.id !== id);
			const result = next.length > 0 ? next : [newConversation()];
			if (id === activeId) setActiveId(result[0].id);
			return result;
		});
	}

	const canFork = Boolean(active?.sessionId);
	const slashQuery =
		input.startsWith("/") && !/\s/.test(input)
			? input.slice(1).toLowerCase()
			: null;
	const slashCommands =
		slashQuery === null
			? []
			: SLASH_COMMANDS.filter((command) => command.name.startsWith(slashQuery));

	return (
		<aside className="flex h-full w-96 shrink-0 flex-col border-s border-border bg-background">
			<header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-2">
				<span className="flex items-center gap-1.5 ps-1 text-xs font-semibold">
					<MingcuteSparklesLine className="size-4 text-brand" />
					Claude
				</span>
				<div className="flex items-center gap-0.5">
					{active && active.costUsd > 0 && (
						<span className="me-1 text-[11px] text-muted-foreground tabular-nums">
							${active.costUsd.toFixed(3)}
						</span>
					)}
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Fork conversation"
						title="Fork this conversation"
						disabled={!canFork}
						onClick={() =>
							active && startConversation(newConversation(active.sessionId))
						}
					>
						<MingcuteGitBranchLine className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="New conversation"
						title="New conversation"
						onClick={() => startConversation(newConversation())}
					>
						<MingcuteAddLine className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="History"
						title="History"
						data-open={showHistory}
						onClick={() => setShowHistory((value) => !value)}
					>
						<MingcuteHistoryLine className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Close chat"
						onClick={() => onOpenChange(false)}
					>
						<MingcuteCloseLine className="size-3.5" />
					</Button>
				</div>
			</header>

			{showHistory ? (
				<div className="min-h-0 flex-1 overflow-y-auto p-1">
					{conversations.map((convo) => (
						<div
							key={convo.id}
							className={`group flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs ${
								convo.id === activeId ? "bg-secondary" : "hover:bg-accent"
							}`}
						>
							<button
								type="button"
								className="min-w-0 flex-1 truncate text-start"
								onClick={() => {
									setActiveId(convo.id);
									setShowHistory(false);
								}}
							>
								{conversationTitle(convo)}
								{convo.forkFrom && (
									<span className="ms-1 text-[10px] text-muted-foreground">
										fork
									</span>
								)}
							</button>
							<button
								type="button"
								aria-label="Delete conversation"
								className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
								onClick={() => deleteConversation(convo.id)}
							>
								<MingcuteDelete2Line className="size-3.5" />
							</button>
						</div>
					))}
				</div>
			) : (
				<>
					<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
						{!active || active.items.length === 0 ? (
							<p className="mt-8 text-center text-xs text-muted-foreground">
								Ask Claude to read, draft, or edit notes in this workspace.
							</p>
						) : (
							<div className="flex flex-col gap-2.5 text-xs">
								{active.items.map((item, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: transcript is append-only.
									<TranscriptRow key={index} item={item} />
								))}
								{busy && <span className="text-muted-foreground">▍</span>}
							</div>
						)}
					</div>

					{pending && (
						<PermissionCard pending={pending} onDecide={resolvePermission} />
					)}

					<div className="flex shrink-0 items-center gap-1 border-t border-border px-2 pt-1.5">
						{MODES.map((option) => (
							<button
								key={option.value}
								type="button"
								className={`rounded-sm px-1.5 py-0.5 text-[11px] ${
									mode === option.value
										? "bg-secondary text-secondary-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title={option.hint}
								onClick={() => setMode(option.value)}
							>
								{option.label}
							</button>
						))}
					</div>

					<form
						className="relative flex shrink-0 items-end gap-2 p-2"
						onSubmit={(event) => {
							event.preventDefault();
							send();
						}}
					>
						{slashCommands.length > 0 && (
							<div className="absolute inset-x-2 bottom-full mb-1 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-overlay">
								{slashCommands.map((command, index) => (
									<button
										key={command.name}
										type="button"
										className={`flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1 text-start text-[11px] ${
											index === mentionIndex
												? "bg-accent text-foreground"
												: "text-muted-foreground"
										}`}
										onMouseDown={(event) => {
											event.preventDefault();
											runCommand(command.name);
										}}
									>
										<span className="font-mono">/{command.name}</span>
										<span className="truncate text-[10px] text-muted-foreground">
											{command.hint}
										</span>
									</button>
								))}
							</div>
						)}
						{mention && mentionMatches.length > 0 && (
							<div className="absolute inset-x-2 bottom-full mb-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-overlay">
								{mentionMatches.map((rel, index) => (
									<button
										key={rel}
										type="button"
										className={`block w-full truncate rounded-sm px-2 py-1 text-start text-[11px] ${
											index === mentionIndex
												? "bg-accent text-foreground"
												: "text-muted-foreground"
										}`}
										onMouseDown={(event) => {
											event.preventDefault();
											selectMention(rel);
										}}
									>
										{rel}
									</button>
								))}
							</div>
						)}
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(event) =>
								onComposerChange(
									event.target.value,
									event.target.selectionStart ?? event.target.value.length,
								)
							}
							onKeyDown={onComposerKeyDown}
							rows={2}
							placeholder={
								workspacePath
									? "Message Claude…  (@ to mention a note)"
									: "Open a folder first"
							}
							disabled={!workspacePath}
							className="max-h-32 min-h-9 flex-1 resize-none rounded-sm border border-border bg-transparent px-2 py-1.5 text-xs outline-hidden placeholder:text-muted-foreground"
						/>
						{busy ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => handleRef.current?.cancel()}
							>
								Stop
							</Button>
						) : (
							<Button
								type="submit"
								size="icon-sm"
								aria-label="Send"
								disabled={!input.trim() || !workspacePath}
							>
								<MingcuteSendPlaneLine className="size-4" />
							</Button>
						)}
					</form>
				</>
			)}
		</aside>
	);
}

function TranscriptRow({ item }: { item: TranscriptItem }) {
	if (item.kind === "user") {
		return (
			<div className="self-end rounded-md bg-secondary px-2.5 py-1.5 text-secondary-foreground">
				{item.text}
			</div>
		);
	}
	if (item.kind === "thinking") {
		return (
			<p className="whitespace-pre-wrap text-[11px] text-muted-foreground italic">
				{item.text}
			</p>
		);
	}
	if (item.kind === "text") {
		return <p className="whitespace-pre-wrap text-foreground">{item.text}</p>;
	}
	const record = (item.input ?? {}) as Record<string, unknown>;
	const resultLines = item.result
		? item.result.split("\n").filter(Boolean).length
		: 0;
	return (
		<div className="font-mono text-[11px]">
			<div
				className={item.isError ? "text-destructive" : "text-muted-foreground"}
			>
				<span className={item.isError ? "" : "text-brand"}>●</span>{" "}
				{toolLabel(item.name, item.input)}
			</div>
			{item.name === "Edit" &&
				typeof record.old_string === "string" &&
				typeof record.new_string === "string" && (
					<EditDiff oldText={record.old_string} newText={record.new_string} />
				)}
			{item.name === "Write" && typeof record.content === "string" && (
				<DiffLines lines={record.content} sign="+" />
			)}
			{item.name !== "Edit" && item.name !== "Write" && item.result && (
				<div className="mt-0.5 truncate ps-3 text-muted-foreground/70">
					⎿ {item.isError ? item.result.slice(0, 200) : `${resultLines} lines`}
				</div>
			)}
		</div>
	);
}

function PermissionCard({
	pending,
	onDecide,
}: {
	pending: PendingPermission;
	onDecide: (decision: AiPermissionDecision) => void;
}) {
	const record = (pending.input ?? {}) as Record<string, unknown>;
	const isPlan = pending.toolName === "ExitPlanMode";
	return (
		<div className="mx-2 mb-1 rounded-md border border-brand/40 bg-brand/5 p-2 text-xs">
			<div className="mb-1.5 font-mono text-[11px] font-semibold">
				{isPlan ? "Review plan" : toolLabel(pending.toolName, pending.input)}
			</div>
			<div className="max-h-56 overflow-y-auto">
				{isPlan && typeof record.plan === "string" ? (
					<p className="whitespace-pre-wrap text-[11px] text-foreground">
						{record.plan}
					</p>
				) : pending.toolName === "Edit" &&
					typeof record.old_string === "string" &&
					typeof record.new_string === "string" ? (
					<EditDiff oldText={record.old_string} newText={record.new_string} />
				) : pending.toolName === "Write" &&
					typeof record.content === "string" ? (
					<DiffLines lines={record.content} sign="+" />
				) : typeof record.command === "string" ? (
					<pre className="overflow-x-auto rounded-sm bg-muted px-2 py-1 font-mono text-[11px]">
						{record.command}
					</pre>
				) : (
					<pre className="overflow-x-auto font-mono text-[10px] text-muted-foreground">
						{JSON.stringify(pending.input, null, 2).slice(0, 400)}
					</pre>
				)}
			</div>
			<div className="mt-2 flex justify-end gap-1.5">
				<Button variant="ghost" size="xs" onClick={() => onDecide("deny")}>
					Deny
				</Button>
				{!isPlan && (
					<Button
						variant="ghost"
						size="xs"
						onClick={() => onDecide("allow-always")}
					>
						Always
					</Button>
				)}
				<Button size="xs" onClick={() => onDecide("allow")}>
					{isPlan ? "Approve" : "Allow"}
				</Button>
			</div>
		</div>
	);
}

const MAX_DIFF_LINES = 14;

function EditDiff({ oldText, newText }: { oldText: string; newText: string }) {
	return (
		<div className="mt-1 overflow-hidden rounded-sm border border-border">
			<DiffLines lines={oldText} sign="-" />
			<DiffLines lines={newText} sign="+" />
		</div>
	);
}

function DiffLines({ lines, sign }: { lines: string; sign: "+" | "-" }) {
	const all = lines.split("\n");
	const shown = all.slice(0, MAX_DIFF_LINES);
	const remaining = all.length - shown.length;
	const tone =
		sign === "+"
			? "bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-foreground"
			: "bg-destructive/10 text-muted-foreground line-through decoration-destructive/40";
	return (
		<div className={`whitespace-pre-wrap px-2 py-0.5 ${tone}`}>
			{shown.map((line, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static diff snapshot.
				<div key={index}>
					<span className="select-none opacity-50">{sign} </span>
					{line || " "}
				</div>
			))}
			{remaining > 0 && (
				<div className="opacity-50">… {remaining} more lines</div>
			)}
		</div>
	);
}
