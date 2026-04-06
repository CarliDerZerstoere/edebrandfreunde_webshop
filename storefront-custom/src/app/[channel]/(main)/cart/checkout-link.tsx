"use client";

type Props = {
	disabled?: boolean;
	checkoutId?: string;
	className?: string;
};

export const CheckoutLink = ({ disabled, checkoutId, className = "" }: Props) => {
	return (
		<a
			data-testid="CheckoutLink"
			aria-disabled={disabled}
			onClick={(e) => disabled && e.preventDefault()}
			href={`/checkout?checkout=${checkoutId}`}
			className={`inline-block max-w-full rounded border border-transparent bg-primary px-6 py-3 text-center font-medium text-primary-foreground hover:bg-primary/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:px-16 ${className}`}
		>
			Zur Kasse
		</a>
	);
};
