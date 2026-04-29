/**
 * Pixel art scenes for the schnapps-making story widget.
 *
 * Each scene is a 2D grid of single characters where each character maps to a
 * color in the palette. Dots and spaces are transparent (skipped).
 *
 * Grids are 24 columns wide. Height is variable, but all scenes use 24 rows
 * to keep the canvas square.
 *
 * Generated box-shadow strings produce the static scene; small animated
 * overlays (steam, bubbles, falling fruit, glass fill) sit on top as separate
 * elements so we can transform/opacity-toggle them on the GPU instead of
 * repainting box-shadow on every frame.
 */

export const PIXEL_PALETTE = {
	// Wood
	D: "#5a3a1f", // dark wood / trunk / bands
	d: "#3d2812", // shadow wood
	L: "#8a5a32", // light wood / basket
	l: "#a87344", // highlight wood
	// Foliage
	G: "#3d5e3a", // leaves
	g: "#4d6e4a", // lighter leaves
	// Fruit (Marille / orange)
	O: "#d4773d",
	o: "#a85a28",
	// Copper
	C: "#cd7f32", // copper light
	c: "#8b5424", // copper dark
	// Liquid / amber
	A: "#b87333", // amber liquid
	a: "#7a4a1f", // dark amber
	// Glass / steam
	S: "#9aa5a0", // steam grey
	s: "#dcdcdc", // light steam
	W: "#e8dcc0", // light glass / paper label
	// Bottle
	B: "#1f4332", // bottle dark green
	b: "#2d5a42", // bottle highlight
	// Iron / rim
	I: "#3a3a3a",
	// Misc
	N: "#000000", // black outline
	K: "#1a1a1a", // dark shadow
} as const;

export type ColorKey = keyof typeof PIXEL_PALETTE;

export const GRID_W = 24;
export const GRID_H = 24;

/** Convert a 2D string array of color keys into a CSS box-shadow value. */
export function gridToBoxShadow(grid: readonly string[]): string {
	const shadows: string[] = [];
	for (let y = 0; y < grid.length; y++) {
		const row = grid[y];
		for (let x = 0; x < row.length; x++) {
			const ch = row[x] as ColorKey | "." | " ";
			if (ch === "." || ch === " ") continue;
			const color = PIXEL_PALETTE[ch as ColorKey];
			if (!color) continue;
			shadows.push(
				`calc(${x} * var(--px)) calc(${y} * var(--px)) 0 0 ${color}`,
			);
		}
	}
	return shadows.join(",");
}

/**
 * Scene 1 — Ernte
 * Tree with marillen on the branches, basket below collecting fallen fruit.
 */
const ernteGrid = [
	"........................", // 0
	".........GGG............", // 1
	"........GGGGG...........", // 2
	".......GGGOGGG..........", // 3
	"......GGGGGGGGG.........", // 4
	"......GGOGGGGGG.........", // 5
	".....GGGGGGGOGGG........", // 6
	"......GGGGGGGGG.........", // 7
	".......GGGOGGG..........", // 8
	"........GGGGG...........", // 9
	"..........DD............", // 10
	"..........DD............", // 11
	"..........DD............", // 12
	"..........DD............", // 13
	"..........DD............", // 14
	".........DDDD...........", // 15 ground
	"........................", // 16
	"........LLLLLLLL........", // 17
	".......LOOOoOOOOL.......", // 18
	".......LOoOOOOoOL.......", // 19
	".......LDDDDDDDDL.......", // 20
	".......LDLLLLLLDL.......", // 21
	"........LLLLLLLL........", // 22
	".........LLLLLL.........", // 23
] as const;

/**
 * Scene 2 — Maische
 * Wooden gärfass with iron bands and a small gärspund (vent) on top.
 * Bubbles rise from the spout (animated separately).
 */
const maischeGrid = [
	"........................", // 0
	"...........II...........", // 1 spout
	"...........II...........", // 2
	".........DDDDDD.........", // 3 lid
	"........DDLLLLDD........", // 4
	"........DLLLLLLD........", // 5 barrel top
	"......IIIIIIIIIIII......", // 6 iron band
	".....DDLLLLLLLLLLDD.....", // 7
	".....DLLllllllllLLD.....", // 8
	".....DLLllllllllLLD.....", // 9
	".....DLLllllllllLLD.....", // 10
	"......IIIIIIIIIIII......", // 11 iron band
	".....DLLllllllllLLD.....", // 12
	".....DLLllllllllLLD.....", // 13
	".....DLLllllllllLLD.....", // 14
	".....DLLllllllllLLD.....", // 15
	"......IIIIIIIIIIII......", // 16 iron band
	".....DDLLLLLLLLLLDD.....", // 17
	"........DLLLLLLD........", // 18
	"........DDLLLLDD........", // 19
	".........DDDDDD.........", // 20
	"........................", // 21
	"........................", // 22
	"........................", // 23
] as const;

/**
 * Scene 3 — Brennen
 * Copper kettle (Kupferkessel) with a helm dome and an outflow pipe.
 * Steam wisps animated above, drops fall from the pipe.
 */
const brennenGrid = [
	"........................", // 0
	"...........cc...........", // 1 helm top
	"..........cCCc..........", // 2
	".........cCCCCc.........", // 3
	".........cCCCCc.........", // 4
	"..........cCCc..........", // 5
	"..........cCCc..........", // 6 helm neck
	".........cCCCCccc.......", // 7 join + start of pipe
	"........cCCCCCCcc.......", // 8
	"........cCCCCCCCcc......", // 9 pipe extends right
	"......ccCCCCCCCCCCcc....", // 10 wide kettle
	".....cCCCCCCCCCCCCcc....", // 11
	".....cCCCCCCCCCCCCcc....", // 12
	"......cCCCCCCCCCCCcc....", // 13
	".......cCCCCCCCCCCcc....", // 14
	"........cCCCCCCCCCCcc...", // 15
	".........cCCCCCCCcc.....", // 16 kettle bottom
	"..........cccccc........", // 17
	"...........DDDD.........", // 18 fire base
	".........IIIIIIII.......", // 19 stand
	"........................", // 20
	"........................", // 21
	"........................", // 22
	"........................", // 23
] as const;

/**
 * Scene 4 — Reife
 * Oak barrel laid on its side, stored in a cellar. Glow pulse animation
 * is applied to the whole canvas via filter: brightness().
 */
const reifeGrid = [
	"........................", // 0
	"........................", // 1
	"........................", // 2
	"......DDDDDDDDDDDD......", // 3 top arc
	".....DDLllLllLllLLD.....", // 4
	"....DDLlLllLllLllLLLD...", // 5
	"....DLLlLllLllLllLLLDD..", // 6
	"....IIIIIIIIIIIIIIIII...", // 7 band
	"...DLLllllllllllllllLD..", // 8
	"...DLLllllllllllllllLD..", // 9
	"...DLLllllllllllllllLD..", // 10
	"....IIIIIIIIIIIIIIIII...", // 11 band
	"...DLLllllllllllllllLD..", // 12
	"...DLLllllllllllllllLD..", // 13
	"...DLLllllllllllllllLD..", // 14
	"....IIIIIIIIIIIIIIIII...", // 15 band
	"....DLLlLllLllLllLLLDD..", // 16
	"....DDLlLllLllLllLLLD...", // 17
	".....DDLllLllLllLLD.....", // 18
	"......DDDDDDDDDDDD......", // 19 bottom arc
	"........................", // 20
	"........................", // 21
	"........................", // 22
	"........................", // 23
] as const;

/**
 * Scene 5 — Abfüllung
 * Bottle (right, cols 13-19) and glass (left, cols 3-7).
 * Glass fills with amber liquid in cols 4-6 — animated separately.
 */
const abfuellungGrid = [
	"........................", // 0
	"...............DDD......", // 1 cork
	"...............DDD......", // 2
	"..............BBbBB.....", // 3 bottle neck
	"..............BBbBB.....", // 4
	"..............BBbBB.....", // 5
	"....WWWWW....BBBBBBB....", // 6 glass top + bottle shoulder
	"....W...W...BBBBBBBBB...", // 7
	"....W...W...BBBBBBBBB...", // 8
	"....W...W....BBBBBBB....", // 9
	"....W...W....BBBBBBB....", // 10
	"....W...W....BBWWWBB....", // 11 label
	"....W...W....BBWWWBB....", // 12
	"....W...W....BBWWWBB....", // 13
	"....W...W....BBBBBBB....", // 14
	"....W...W....BBBBBBB....", // 15
	"....W...W....BBBBBBB....", // 16
	"....WWWWW.....BBBBB.....", // 17 glass base + bottle base
	"..............BBB.......", // 18
	"........................", // 19
	"........................", // 20
	"........................", // 21
	"........................", // 22
	"........................", // 23
] as const;

export const SCENES = {
	ernte: {
		title: "Ernte",
		fallback: "Pixel-Art: Marillenbaum mit Korb",
		shadow: gridToBoxShadow(ernteGrid),
	},
	maische: {
		title: "Maische",
		fallback: "Pixel-Art: Holzfass mit Gärspund",
		shadow: gridToBoxShadow(maischeGrid),
	},
	brennen: {
		title: "Brennen",
		fallback: "Pixel-Art: Kupferkessel mit Dampf",
		shadow: gridToBoxShadow(brennenGrid),
	},
	reife: {
		title: "Reife",
		fallback: "Pixel-Art: Eichenfass im Keller",
		shadow: gridToBoxShadow(reifeGrid),
	},
	abfuellung: {
		title: "Abfüllung",
		fallback: "Pixel-Art: Flasche und Glas",
		shadow: gridToBoxShadow(abfuellungGrid),
	},
} as const;

export type SceneId = keyof typeof SCENES;
export const SCENE_ORDER: SceneId[] = ["ernte", "maische", "brennen", "reife", "abfuellung"];
