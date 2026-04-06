import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { brandConfig, formatPageTitle } from "@/config/brand";

export const metadata = {
	title: formatPageTitle("Kasse"),
	description: brandConfig.description,
};

export default function RootLayout(props: { children: ReactNode }) {
	return (
		<main>
			<AuthProvider>{props.children}</AuthProvider>
		</main>
	);
}
