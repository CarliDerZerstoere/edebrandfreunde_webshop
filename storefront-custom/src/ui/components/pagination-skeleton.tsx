export function PaginationSkeleton() {
	return (
		<nav className="flex items-center justify-center gap-x-4 px-4 pt-12">
			<span className="h-10 w-24 animate-pulse rounded bg-muted" />
			<span className="h-10 w-24 animate-pulse rounded bg-muted" />
		</nav>
	);
}
