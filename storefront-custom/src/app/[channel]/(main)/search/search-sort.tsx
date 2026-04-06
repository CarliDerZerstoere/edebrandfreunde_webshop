"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/ui/components/ui/dropdown-menu";
import { Button } from "@/ui/components/ui/button";
import { ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
	{ value: "relevance", label: "Relevanz" },
	{ value: "price-asc", label: "Preis: Aufsteigend" },
	{ value: "price-desc", label: "Preis: Absteigend" },
	{ value: "name", label: "Name" },
	{ value: "newest", label: "Neueste" },
] as const;

export function SearchSort() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const currentSort = searchParams.get("sort") || "relevance";
	const currentLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || "Relevanz";

	const handleSortChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === "relevance") {
			params.delete("sort");
		} else {
			params.set("sort", value);
		}
		// Reset pagination when sort changes
		params.delete("cursor");
		params.delete("direction");
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline-solid" size="sm" className="gap-2">
					<ArrowUpDown className="h-4 w-4" />
					<span className="hidden sm:inline">{currentLabel}</span>
					<span className="sm:hidden">Sortieren</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
					{SORT_OPTIONS.map((option) => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
