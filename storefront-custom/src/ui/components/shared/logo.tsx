/**
 * Shared Logo Component — Edelbrandfreunde
 *
 * The source PNG has an opaque cream background (no alpha channel).
 * - Normal: shown as-is (dark logo on cream bg, blends with light page)
 * - Inverted (dark backgrounds): uses `invert` + `mix-blend-screen`
 *   to make the cream background disappear and the logo appear white.
 */

interface LogoProps {
	className?: string;
	ariaLabel?: string;
	inverted?: boolean;
}

export const Logo = ({ className, ariaLabel = "Edelbrandfreunde", inverted = false }: LogoProps) => {
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src="/logo-edelbrandfreunde.png"
			alt={ariaLabel}
			width={140}
			height={140}
			className={`${inverted ? "invert mix-blend-screen" : ""} ${className ?? ""}`}
		/>
	);
};
