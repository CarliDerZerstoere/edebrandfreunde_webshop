import { Award, Truck, Shield } from "lucide-react";

const ICONS = [Award, Truck, Shield];

interface TrustBarProps {
	signals: string[];
}

export function TrustBar({ signals }: TrustBarProps) {
	if (signals.length === 0) return null;

	return (
		<div className="border-b border-border bg-secondary/30">
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
				{signals.map((signal, i) => {
					const Icon = ICONS[i % ICONS.length];
					return (
						<span key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
							<Icon className="h-4 w-4 shrink-0 text-accent" />
							{signal}
						</span>
					);
				})}
			</div>
		</div>
	);
}
