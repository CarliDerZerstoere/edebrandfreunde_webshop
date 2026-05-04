import edjsHTML from "editorjs-html";
import xss from "xss";

const parser = edjsHTML();

interface EditorJSBlock {
	type: string;
	data: {
		text?: string;
		[key: string]: unknown;
	};
}

interface EditorJSContent {
	time?: number;
	blocks: EditorJSBlock[];
	version?: string;
}

/**
 * Filter out CMS comment blocks (text starting with "//").
 */
function filterComments(blocks: EditorJSBlock[]): EditorJSBlock[] {
	return blocks.filter((block) => {
		const text = (block.data?.text ?? "").replace(/<[^>]*>/g, "").trim();
		return !text.startsWith("//");
	});
}

/**
 * Check if a string is EditorJS JSON format
 */
export function isEditorJSContent(content: string | null | undefined): boolean {
	if (!content) return false;
	try {
		const parsed = JSON.parse(content) as unknown;
		return (
			typeof parsed === "object" &&
			parsed !== null &&
			"blocks" in parsed &&
			Array.isArray((parsed as EditorJSContent).blocks)
		);
	} catch {
		return false;
	}
}

/**
 * Parse EditorJS JSON to an array of sanitized HTML strings
 */
export function parseEditorJSToHtml(content: string | null | undefined): string[] | null {
	if (!content) return null;

	try {
		const parsed = JSON.parse(content) as EditorJSContent;
		if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
			return null;
		}
		const filtered = { ...parsed, blocks: filterComments(parsed.blocks) };
		return parser.parse(filtered).map((html: string) => xss(html));
	} catch {
		// Not valid EditorJS JSON, return null
		return null;
	}
}

const NAMED_ENTITIES: Record<string, string> = {
	nbsp: " ",
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	ndash: "–",
	mdash: "—",
	hellip: "…",
	laquo: "«",
	raquo: "»",
	bdquo: "„",
	ldquo: "“",
	rdquo: "”",
	sbquo: "‚",
	lsquo: "‘",
	rsquo: "’",
};

/**
 * Decode common HTML entities (named + numeric) in plain text. xss strips tags
 * but leaves entities intact, so EditorJS content with `&nbsp;` shows literally
 * unless we decode them here.
 */
function decodeHtmlEntities(s: string): string {
	return s.replace(/&(#?[a-zA-Z0-9]+);/g, (match, name: string) => {
		if (name.startsWith("#x") || name.startsWith("#X")) {
			const cp = parseInt(name.slice(2), 16);
			return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
		}
		if (name.startsWith("#")) {
			const cp = parseInt(name.slice(1), 10);
			return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
		}
		return NAMED_ENTITIES[name] ?? match;
	});
}

/**
 * Safely strip HTML tags from a string and decode common HTML entities.
 * Uses xss library configured to strip all tags.
 */
function stripHtmlTags(html: string): string {
	const stripped = xss(html, {
		whiteList: {}, // Allow no tags
		stripIgnoreTag: true, // Strip all tags not in whitelist
		stripIgnoreTagBody: ["script", "style"], // Remove script/style content entirely
	});
	return decodeHtmlEntities(stripped);
}

/**
 * Parse EditorJS content into structured quality items.
 * Expects H3 headers as titles, followed by paragraphs as descriptions.
 * Paragraphs starting with "//" are treated as comments and skipped.
 * Paragraphs before the first header are ignored.
 */
export function parseEditorJSQualities(
	content: string | null | undefined,
): { title: string; description: string; n: number }[] | null {
	if (!content) return null;

	try {
		const parsed = JSON.parse(content) as EditorJSContent;
		if (!parsed.blocks || !Array.isArray(parsed.blocks)) return null;

		const items: { title: string; description: string; n: number }[] = [];
		let current: { title: string; descParts: string[] } | null = null;

		for (const block of parsed.blocks) {
			const text = stripHtmlTags(block.data?.text ?? "").trim();
			if (!text) continue;

			// Skip comment lines
			if (text.startsWith("//")) continue;

			if (block.type === "header") {
				// Finish previous item
				if (current) {
					items.push({
						title: current.title,
						description: current.descParts.join(" "),
						n: items.length,
					});
				}
				current = { title: text, descParts: [] };
			} else if (current) {
				current.descParts.push(text);
			}
		}

		// Don't forget the last item
		if (current) {
			items.push({
				title: current.title,
				description: current.descParts.join(" "),
				n: items.length,
			});
		}

		return items.length > 0 ? items : null;
	} catch {
		return null;
	}
}

/**
 * Extract plain text from EditorJS JSON.
 * Useful for descriptions in hero sections, meta tags, etc.
 */
export function parseEditorJSToText(content: string | null | undefined): string | null {
	if (!content) return null;

	try {
		const parsed = JSON.parse(content) as EditorJSContent;
		if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
			// Not EditorJS format, return as-is
			return content;
		}

		// Extract text from all blocks (skip // comments)
		const texts = filterComments(parsed.blocks)
			.map((block) => {
				if (block.data?.text) {
					return stripHtmlTags(block.data.text);
				}
				return "";
			})
			.filter(Boolean);

		return texts.join("\n") || null;
	} catch {
		// Not valid JSON, return as-is (might be plain text)
		return content;
	}
}
