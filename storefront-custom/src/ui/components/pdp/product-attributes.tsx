"use client";

import { Shirt, Leaf, Droplets, Ruler, Sparkles } from "lucide-react";
import {
	Accordion,
	AccordionItemWithContext,
	AccordionTrigger,
	AccordionContent,
} from "@/ui/components/ui/accordion";
import { Badge } from "@/ui/components/ui/badge";
import { type ReactNode } from "react";

interface Attribute {
	name: string;
	value: string | boolean | string[];
}

interface ProductAttributesProps {
	/**
	 * Description as an array of HTML strings (from EditorJS via edjsHTML parser)
	 * Already sanitized with xss on the server
	 */
	descriptionHtml?: string[] | null;
	attributes?: Attribute[];
	careInstructions?: string | null;
}

// Map attribute names to icons
const attributeIcons: Record<string, ReactNode> = {
	Material: <Shirt className="h-4 w-4" />,
	"Made with Recycled Fibers": <Leaf className="h-4 w-4" />,
	Waterproof: <Droplets className="h-4 w-4" />,
	Fit: <Ruler className="h-4 w-4" />,
	"Key Features": <Sparkles className="h-4 w-4" />,
};

function formatValue(value: string | boolean | string[]): ReactNode {
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (Array.isArray(value)) {
		return (
			<div className="flex flex-wrap justify-end gap-1">
				{value.map((v, index) => (
					<Badge key={`${v}-${index}`} variant="secondary" className="font-normal">
						{v}
					</Badge>
				))}
			</div>
		);
	}
	return value;
}

export function ProductAttributes({
	descriptionHtml,
	attributes = [],
	careInstructions,
}: ProductAttributesProps) {
	// Filter out variant attributes that are shown elsewhere (Size, Color)
	const displayAttributes = attributes.filter((attr) => !["Size", "Color"].includes(attr.name));

	return (
		<Accordion type="multiple" defaultValue={["description"]} className="w-full">
			{descriptionHtml && descriptionHtml.length > 0 && (
				<AccordionItemWithContext value="description" className="border-border">
					<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
						Beschreibung
					</AccordionTrigger>
					<AccordionContent>
						<div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-strong:text-foreground">
							{descriptionHtml.map((html, index) => (
								<div key={`${index}-${html.slice(0, 24)}`} dangerouslySetInnerHTML={{ __html: html }} />
							))}
						</div>
					</AccordionContent>
				</AccordionItemWithContext>
			)}

			{displayAttributes.length > 0 && (
				<AccordionItemWithContext value="details" className="border-border">
					<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
						Produktdetails
					</AccordionTrigger>
					<AccordionContent>
						<div className="grid gap-3">
							{displayAttributes.map((attr, index) => (
								<div key={`${attr.name}-${index}`} className="flex items-start justify-between gap-4 text-sm">
									<span className="flex items-center gap-2 text-muted-foreground">
										{attributeIcons[attr.name]}
										{attr.name}
									</span>
									<span className="text-right font-medium">{formatValue(attr.value)}</span>
								</div>
							))}
						</div>
					</AccordionContent>
				</AccordionItemWithContext>
			)}

			{careInstructions && (
				<AccordionItemWithContext value="care" className="border-border">
					<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
						Pflegehinweise
					</AccordionTrigger>
					<AccordionContent className="leading-relaxed text-muted-foreground">
						{careInstructions}
					</AccordionContent>
				</AccordionItemWithContext>
			)}

			<AccordionItemWithContext value="shipping" className="border-border">
				<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
					Versand & Rückgabe
				</AccordionTrigger>
				<AccordionContent className="leading-relaxed text-muted-foreground">
					<p className="mb-2">Kostenloser Versand ab €100 Bestellwert. Standardlieferung 3–5 Werktage.</p>
					<p>Kostenlose Rücksendung innerhalb von 30 Tagen nach dem Kauf. Artikel müssen ungetragen und mit Etiketten versehen sein.</p>
				</AccordionContent>
			</AccordionItemWithContext>
		</Accordion>
	);
}
