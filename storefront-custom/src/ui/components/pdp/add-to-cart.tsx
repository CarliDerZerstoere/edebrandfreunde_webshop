"use client";

import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/lib/utils";

interface AddToCartProps {
	price: string;
	compareAtPrice?: string | null;
	discountPercent?: number | null;
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
	priceAmount?: number | null;
	currency?: string | null;
	/** Volume in ml for per-serving calculation (default: 700ml) */
	volumeMl?: number | null;
	/** CMS-driven trust signals shown below the button */
	trustSignals?: string[];
}

function AddToCartButton({
	disabled,
	disabledReason,
}: {
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
}) {
	const { pending } = useFormStatus();

	const getButtonText = () => {
		if (pending) return "Wird hinzugefügt…";
		if (!disabled) return "In den Warenkorb";
		if (disabledReason === "out-of-stock") return "Vergriffen";
		return "Variante wählen";
	};

	// Simple, clean - no success state needed
	// The cart badge/drawer updating IS the feedback (like Apple)
	return (
		<Button
			type="submit"
			size="lg"
			disabled={disabled || pending}
			className={cn("h-14 w-full text-base font-medium transition-all duration-200", pending && "opacity-80")}
		>
			<ShoppingBag className={cn("mr-2 h-5 w-5 transition-transform", pending && "scale-90")} />
			{getButtonText()}
		</Button>
	);
}

const TRUST_ICONS = [
	// Shield
	<svg key="shield" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
	// Truck
	<svg key="truck" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M9 22V12h6v10" /></svg>,
	// Check
	<svg key="check" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>,
];

const SERVING_ML = 30; // 3cl standard pour

export function AddToCart({
	price,
	compareAtPrice,
	discountPercent,
	disabled = false,
	disabledReason,
	priceAmount,
	currency,
	volumeMl,
	trustSignals,
}: AddToCartProps) {
	// Calculate per-serving price from volume attribute or default 700ml
	const bottleMl = volumeMl ?? 700;
	const servings = Math.floor(bottleMl / SERVING_ML);
	const perServing =
		priceAmount && currency && servings > 0
			? new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(priceAmount / servings)
			: null;

	const signals = trustSignals && trustSignals.length > 0 ? trustSignals : [];

	return (
		<div className="space-y-4">
			{/* Price Display */}
			<div className="flex items-baseline gap-3">
				<span className="text-2xl font-semibold tracking-tight">{price}</span>
				{compareAtPrice && (
					<>
						<span className="text-lg text-muted-foreground line-through">{compareAtPrice}</span>
						{discountPercent && (
							<span className="text-sm font-medium text-destructive">-{discountPercent}%</span>
						)}
					</>
				)}
			</div>
			{perServing && (
				<p className="text-xs text-muted-foreground">
					ca. {perServing} pro Glas ({SERVING_ML / 10} cl · {servings} Portionen)
				</p>
			)}

			{/* Add to Cart Button */}
			<AddToCartButton disabled={disabled} disabledReason={disabledReason} />

			{/* Trust Signals — CMS-driven or default fallback */}
			<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
				{signals.map((signal, i) => (
					<span key={i} className="flex items-center gap-1.5">
						{TRUST_ICONS[i % TRUST_ICONS.length]}
						{signal}
					</span>
				))}
			</div>
		</div>
	);
}
