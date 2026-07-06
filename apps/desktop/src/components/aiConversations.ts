export type TranscriptItem =
	| { kind: "user"; text: string }
	| { kind: "text"; text: string }
	| { kind: "thinking"; text: string }
	| {
			kind: "tool";
			id: string;
			name: string;
			input: unknown;
			result?: string;
			isError?: boolean;
	  };

export type Conversation = {
	id: string;
	title: string;
	/** Claude Code session id, once the first turn establishes one. */
	sessionId: string | null;
	/** When set with no `sessionId`, the next send forks from this session id. */
	forkFrom: string | null;
	items: TranscriptItem[];
	costUsd: number;
	updatedAt: number;
};

const STORAGE_KEY = "sudomd:ai-conversations";

export function newConversation(forkFrom: string | null = null): Conversation {
	return {
		id: crypto.randomUUID(),
		title: forkFrom ? "Forked chat" : "New chat",
		sessionId: null,
		forkFrom,
		items: [],
		costUsd: 0,
		updatedAt: Date.now(),
	};
}

export function loadConversations(): Conversation[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
	} catch {
		return [];
	}
}

export function saveConversations(list: Conversation[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
}

export function conversationTitle(convo: Conversation): string {
	const firstUser = convo.items.find((item) => item.kind === "user");
	if (firstUser && firstUser.kind === "user") {
		return firstUser.text.slice(0, 48);
	}
	return convo.title;
}
