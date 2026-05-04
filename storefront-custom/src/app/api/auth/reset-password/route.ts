import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";
import { consume, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

// Tighter window than other auth endpoints — each call sends an email,
// so this is also email-bomb prevention.
const RATE_LIMIT = { name: "auth-reset-password", limit: 3, windowMs: 300_000 } as const;

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!, $channel: String!, $redirectUrl: String!) {
    requestPasswordReset(email: $email, channel: $channel, redirectUrl: $redirectUrl) {
      errors {
        field
        message
        code
      }
    }
  }
`;

interface ResetPasswordRequest {
	email: string;
	channel: string;
	redirectUrl: string;
}

interface RequestPasswordResetResult {
	requestPasswordReset?: {
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

const ALLOWED_REDIRECT_ORIGINS = [
	process.env.NEXT_PUBLIC_STOREFRONT_URL,
	process.env.NEXT_PUBLIC_SALEOR_API_URL?.replace("/graphql/", "").replace("/graphql", ""),
].filter(Boolean);

function isAllowedRedirectUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return ALLOWED_REDIRECT_ORIGINS.some((origin) => origin && parsed.origin === new URL(origin).origin);
	} catch {
		return false;
	}
}

export async function POST(request: NextRequest) {
	const ip = getClientIp(request);
	const rl = consume(RATE_LIMIT, ip);
	if (!rl.allowed) {
		// Match the body shape used elsewhere; success responses already mask
		// per-email enumeration, so a 429 simply tells the user to slow down.
		return NextResponse.json(
			{ errors: [{ message: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut.", code: "RATE_LIMITED" }] },
			{ status: 429, headers: rateLimitHeaders(rl, RATE_LIMIT) },
		);
	}

	const body = (await request.json()) as ResetPasswordRequest;
	const { email, channel, redirectUrl } = body;

	if (!email || !channel || !redirectUrl) {
		return NextResponse.json(
			{ errors: [{ message: "E-Mail, Channel und Weiterleitungs-URL sind erforderlich", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (!isAllowedRedirectUrl(redirectUrl)) {
		return NextResponse.json(
			{ errors: [{ message: "Ungültige Weiterleitungs-URL", code: "INVALID_REDIRECT" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<RequestPasswordResetResult>({
		query: REQUEST_PASSWORD_RESET_MUTATION,
		variables: { email, channel, redirectUrl },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Password reset error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const requestPasswordReset = result.data.requestPasswordReset;

	// Saleor validation errors - log but don't expose to prevent email enumeration
	if (requestPasswordReset?.errors?.length) {
		console.error("Password reset validation errors");
		// Still return success to prevent email enumeration
	}

	// Always return success to prevent email enumeration
	return NextResponse.json({ success: true });
}
