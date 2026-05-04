/**
 * In-memory sliding-window rate limiter.
 *
 * Designed for the single-process Next.js storefront. If we ever scale
 * horizontally, swap the Map for a Redis-backed implementation — the
 * `consume()` interface stays the same.
 *
 * Window is sliding (not fixed-bucket), so a burst at minute boundary
 * cannot double-fire. Memory is bounded via periodic eviction of expired
 * entries plus a hard cap on the Map size.
 */
import type { NextRequest } from "next/server";

interface Bucket {
	hits: number[]; // millisecond timestamps within the current window
}

const STORE = new Map<string, Bucket>();
const MAX_KEYS = 10_000; // hard cap to bound memory under attack

/**
 * Periodic eviction. Runs at most every 30 s; touches at most 1000 keys per
 * pass so a single sweep can't stall the event loop under pressure.
 */
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
	if (now - lastSweep < 30_000) return;
	lastSweep = now;
	let scanned = 0;
	for (const [key, bucket] of STORE) {
		if (scanned++ > 1000) break;
		bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
		if (bucket.hits.length === 0) STORE.delete(key);
	}
}

export interface RateLimitOptions {
	/** Limit identifier — used as a key prefix so different policies don't collide. */
	name: string;
	/** Max number of hits allowed in the window. */
	limit: number;
	/** Sliding window in milliseconds. */
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetMs: number; // ms until oldest hit in window expires
}

/**
 * Try to consume one slot from the bucket identified by `name + key`.
 */
export function consume(opts: RateLimitOptions, key: string): RateLimitResult {
	const now = Date.now();
	sweep(now, opts.windowMs);

	const storeKey = `${opts.name}:${key}`;
	let bucket = STORE.get(storeKey);
	if (!bucket) {
		// Hard memory cap — under sustained attack we drop new entries instead
		// of letting the Map grow unbounded. New requests then fall back to
		// always-allowed which is the safer failure mode for legitimate traffic.
		if (STORE.size >= MAX_KEYS) {
			return { allowed: true, remaining: opts.limit - 1, resetMs: 0 };
		}
		bucket = { hits: [] };
		STORE.set(storeKey, bucket);
	}

	// Drop expired hits from this bucket before evaluating.
	bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

	if (bucket.hits.length >= opts.limit) {
		const oldest = bucket.hits[0];
		return {
			allowed: false,
			remaining: 0,
			resetMs: opts.windowMs - (now - oldest),
		};
	}

	bucket.hits.push(now);
	return {
		allowed: true,
		remaining: opts.limit - bucket.hits.length,
		resetMs: opts.windowMs,
	};
}

/**
 * Best-effort client IP extraction. Caddy is the only ingress and sets
 * `X-Forwarded-For`, so we trust the leftmost entry there.
 */
export function getClientIp(request: NextRequest): string {
	const xff = request.headers.get("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	const real = request.headers.get("x-real-ip");
	if (real) return real;
	return "unknown";
}

/**
 * Standard "Retry-After" + RFC 6585 headers for a 429 response.
 */
export function rateLimitHeaders(result: RateLimitResult, opts: RateLimitOptions): HeadersInit {
	return {
		"X-RateLimit-Limit": String(opts.limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
		...(result.allowed ? {} : { "Retry-After": String(Math.ceil(result.resetMs / 1000)) }),
	};
}
