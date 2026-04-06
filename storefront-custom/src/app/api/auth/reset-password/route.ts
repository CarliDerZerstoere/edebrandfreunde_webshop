import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";

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
	const body = (await request.json()) as ResetPasswordRequest;
	const { email, channel, redirectUrl } = body;

	if (!email || !channel || !redirectUrl) {
		return NextResponse.json(
			{ errors: [{ message: "Email, channel, and redirectUrl are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (!isAllowedRedirectUrl(redirectUrl)) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid redirect URL", code: "INVALID_REDIRECT" }] },
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
