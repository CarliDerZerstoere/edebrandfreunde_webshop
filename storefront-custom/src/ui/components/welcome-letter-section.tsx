import { parseEditorJSToText } from "@/lib/editorjs";

/* ============================================================
 * Willkommen — Editorial-Layout
 *
 * Linke Säule: Brieftext auf gealtertem Papier (CMS: landing-about).
 *   Titel = Anrede-Überschrift (z.B. "Willkommen, liebe Freunde")
 *   Inhalt = Brieftext-Absätze (mehrere Paragraphen)
 *
 * Rechte Säule: Brennereibuch-Sidebar mit Prozess (I–V),
 * Verfahren/Auflage und aktuellen Jahrgängen.
 *
 * Die Jahrgangs-Liste kommt aus der Saleor-Collection
 * "landing-jahrgaenge" (siehe getLandingVintages in page.tsx).
 * Wenn die Collection leer / nicht vorhanden ist, wird die
 * "Aktuelle Jahrgänge"-Box komplett ausgeblendet — keine
 * Platzhalter-Inhalte mehr.
 * ============================================================ */

const PROCESS_STEPS = [
	{ n: "I", title: "Ernte", note: "Vollreife Früchte, von Hand gepflückt", duration: "Sept · Okt" },
	{ n: "II", title: "Maische", note: "In kleinen Mengen, sehr sorgfältig", duration: "Monate" },
	{ n: "III", title: "Brand", note: "Sehr langsam, im Edelstahlkessel", duration: "Tage" },
	{ n: "IV", title: "Reife", note: "Zur Beruhigung, in Ruhe gelagert", duration: "Jahre" },
	{ n: "V", title: "Trinkstärke", note: "Mit französischem Mineralwasser", duration: "Letzter Schritt" },
] as const;

export interface Vintage {
	name: string;
	year: string;
	status: string;
	sold: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WelcomeLetterSection({ page, vintages }: { page: any; vintages?: Vintage[] }) {
	const vintageList: ReadonlyArray<Vintage> = vintages ?? [];
	const titleRaw: string = page?.title ?? "Willkommen, liebe Freunde.";
	// Split title at the first comma so the second half can render as italic accent.
	const commaIndex = titleRaw.indexOf(",");
	const titleHead = commaIndex > -1 ? titleRaw.slice(0, commaIndex + 1) : titleRaw;
	const titleTail = commaIndex > -1 ? titleRaw.slice(commaIndex + 1).trim() : "";

	const bodyText = (page ? parseEditorJSToText(page.content) : "") ?? "";
	const allParagraphs = bodyText.split(/\n+/).map((p) => p.trim()).filter(Boolean);

	// CMS-Konvention: vorletzter Absatz = Signatur (script font, links unten),
	// letzter Absatz = Tagline (uppercase, rechts unten),
	// alle vorhergehenden Absätze = Brieftext.
	const tagline = allParagraphs.length >= 2 ? allParagraphs.at(-1) ?? "" : "";
	const signature = allParagraphs.length >= 2 ? allParagraphs.at(-2) ?? "" : "";
	const paragraphs = allParagraphs.length >= 2 ? allParagraphs.slice(0, -2) : allParagraphs;

	return (
		<section
			className="welcome-letter relative overflow-hidden"
			style={{
				paddingTop: "var(--section-py)",
				paddingBottom: "var(--section-py)",
				paddingLeft: "clamp(1rem, 4vw, 5rem)",
				paddingRight: "clamp(1rem, 4vw, 5rem)",
			}}
		>
			{/* Ambient copper glow */}
			<div
				aria-hidden="true"
				className="ambient-glow-pulse pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
				style={{
					background: "radial-gradient(circle, oklch(0.515 0.082 155 / 0.22) 0%, transparent 70%)",
				}}
			/>

			<div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-stretch gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
				{/* ===== LEFT: Paper letter ===== */}
				<article className="welcome-paper relative overflow-hidden rounded-[2px] px-8 pb-14 pt-16 sm:px-14 sm:pb-14 sm:pt-18 lg:px-16 lg:pb-14 lg:pt-18">
					<p className="welcome-eyebrow inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em]">
						<span className="inline-block h-px w-7 bg-current" />
						Aus der Brennerei
					</p>

					<h2 className="mt-6 font-display text-[clamp(2.6rem,5.5vw,4.75rem)] font-medium leading-[0.95] tracking-tight">
						{titleHead}
						{titleTail && (
							<>
								{" "}
								<em className="welcome-title-accent not-italic font-display italic">{titleTail}</em>
							</>
						)}
					</h2>

					{paragraphs.length > 0 && (
						<div className="mt-7 space-y-3.5 font-serif text-[17px] leading-[1.65] text-[oklch(0.32_0.02_60)]">
							{paragraphs.map((p, i) => (
								<p key={i} className="max-w-[52ch]">
									{p}
								</p>
							))}
						</div>
					)}

					{(signature || tagline) && (
						<div className="mt-8 flex flex-wrap items-end justify-between gap-6">
							{signature && (
								<div>
									<div className="font-script text-[42px] leading-[0.9] text-[oklch(0.22_0.04_60)]">
										{signature}
									</div>
								</div>
							)}
							{tagline && (
								<div className="text-right">
									<div className="welcome-enjoy text-[11px] uppercase tracking-[0.28em]">{tagline}</div>
								</div>
							)}
						</div>
					)}
				</article>

				{/* ===== RIGHT: Brennereibuch sidebar ===== */}
				<aside className="flex flex-col gap-7 px-1 py-2">
					{/* Prozess */}
					<div className="border-t border-[color:var(--ink-rule)] pt-6">
						<div className="mb-5 text-[10.5px] font-medium uppercase tracking-[0.32em] text-accent">
							Vom Obst zum Brand
						</div>
						<ol className="flex flex-col gap-3.5">
							{PROCESS_STEPS.map((step) => (
								<li
									key={step.n}
									className="grid grid-cols-[28px_1fr_auto] items-baseline gap-3.5 border-b border-dashed border-[color:var(--ink-rule)] pb-3 last:border-b-0 last:pb-0"
								>
									<span className="font-display text-[22px] italic leading-none text-accent">{step.n}</span>
									<span className="font-serif text-[17px] leading-[1.35]">
										{step.title}
										<small className="mt-0.5 block font-sans text-[11.5px] leading-[1.5] text-muted-foreground">
											{step.note}
										</small>
									</span>
									<span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
										{step.duration}
									</span>
								</li>
							))}
						</ol>
					</div>

					{/* Verfahren / Auflage */}
					<dl className="grid grid-cols-2 border-t border-[color:var(--ink-rule)] pt-5">
						<div className="border-r border-[color:var(--ink-rule)] py-1 pr-4">
							<dt className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Verfahren</dt>
							<dd className="m-0 font-display text-[22px] leading-[1.15]">
								Abfindung
								<small className="mt-0.5 block font-serif text-[13.5px] italic text-muted-foreground">
									kleine Manufaktur
								</small>
							</dd>
						</div>
						<div className="py-1 pl-4">
							<dt className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-accent">Auflage</dt>
							<dd className="m-0 font-display text-[22px] leading-[1.15]">
								Jahrgang
								<small className="mt-0.5 block font-serif text-[13.5px] italic text-muted-foreground">
									nummeriert, klein
								</small>
							</dd>
						</div>
					</dl>

					{/* Aktuelle Jahrgänge — nur anzeigen, wenn CMS-Daten vorhanden sind */}
					{vintageList.length > 0 && (
						<div className="border-t border-[color:var(--ink-rule)] pt-6">
							<div className="mb-5 flex items-baseline justify-between text-[10.5px] font-medium uppercase tracking-[0.32em] text-accent">
								<span>Aktuelle Jahrgänge</span>
								<span className="text-[10px] tracking-[0.24em] text-muted-foreground">Kleinauflage</span>
							</div>
							<ul className="flex flex-col gap-3">
								{vintageList.map((v) => (
									<li
										key={`${v.name}-${v.year}`}
										className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 border-b border-dashed border-[color:var(--ink-rule)] pb-3 last:border-b-0 last:pb-0"
									>
										<span className="font-display text-[22px] italic leading-[1.1]">{v.name}</span>
										<span className="font-serif text-[14px] tabular-nums text-muted-foreground">{v.year}</span>
										<span
											className={`text-[9.5px] font-medium uppercase tracking-[0.24em] ${
												v.sold ? "text-muted-foreground" : "text-accent"
											}`}
										>
											{v.status}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</aside>
			</div>
		</section>
	);
}
