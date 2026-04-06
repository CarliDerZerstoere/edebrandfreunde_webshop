interface WavePatternProps {
	className?: string;
}

/**
 * Subtle gradient background for category/collection headers without images.
 * Uses the Obstgarten & Creme palette — soft green-to-cream gradient
 * with a light leaf-inspired texture.
 */
export function WavePattern({ className }: WavePatternProps) {
	return (
		<div className={className} style={{ position: "relative", overflow: "hidden" }}>
			{/* Base gradient — soft green to cream */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"linear-gradient(135deg, oklch(0.515 0.082 155 / 0.12) 0%, oklch(0.928 0.022 82) 40%, oklch(0.963 0.009 80) 100%)",
				}}
			/>

			{/* Radial accent glow */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 60% 80% at 20% 80%, oklch(0.515 0.082 155 / 0.08), transparent)",
				}}
			/>

			{/* Film-grain texture for depth */}
			<div
				className="absolute inset-0 opacity-[0.025]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
				}}
			/>
		</div>
	);
}
