export type BasecampComment = {
	author: string;
	date: string;
	html: string;
};

export type BasecampFetchResult = {
	ok: boolean;
	title?: string;
	html?: string;
	comments?: BasecampComment[];
	error?: string;
};

export type BasecampSearchItem = {
	id: number;
	title: string;
	type: string;
	url: string;
	projectName?: string;
	creatorName?: string;
	commentsCount?: number;
	parent?: { id: number; title: string; type: string; url: string };
};

export type BasecampSearchResult =
	| { ok: true; items: BasecampSearchItem[] }
	| { ok: false; error: string };
