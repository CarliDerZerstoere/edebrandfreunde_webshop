import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE, encodeCookieName } from "@/lib/auth/constants";
import { consume, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";

const RATE_LIMIT = { name: "auth-set-password", limit: 5, windowMs: 60_000 } as const;

const SET_PASSWORD_MUTATION = `
  mutation SetPassword($email: String!, $token: String!, $password: String!) {
    setPassword(email: $email, token: $token, password: $password) {
      token
      refreshToken
      errors {
        field
        message
        code
      }
    }
  }
`;

interface SetPasswordRequest {
	email: string;
	token: string;
	password: string;
}

interface SetPasswordResult {
	setPassword?: {
		token?: string;
		refreshToken?: string;
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	const ip = getClientIp(request);
	const rl = consume(RATE_LIMIT, ip);
	if (!rl.allowed) {
		return NextResponse.json(
			{ errors: [{ message: "Zu viele Versuche. Bitte warte einen Moment.", code: "RATE_LIMITED" }] },
			{ status: 429, headers: rateLimitHeaders(rl, RATE_LIMIT) },
		);
	}

	const body = (await request.json()) as SetPasswordRequest;
	const { email, token, password } = body;

	if (!email || !token || !password) {
		return NextResponse.json(
			{ errors: [{ message: "E-Mail, Token und Passwort sind erforderlich", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (password.length < 8) {
		return NextResponse.json(
			{ errors: [{ message: "Passwort muss mindestens 8 Zeichen lang sein", code: "PASSWORD_TOO_SHORT" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<SetPasswordResult>({
		query: SET_PASSWORD_MUTATION,
		variables: { email, token, password },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Set password error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const setPassword = result.data.setPassword;

	// Saleor validation errors
	if (setPassword?.errors?.length) {
		console.error("Set password validation errors");
		const validationResult = asValidationError(setPassword.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	if (setPassword?.token && setPassword?.refreshToken) {
		// Set auth cookies under SDK-compatible names so the client-side
		// Saleor Auth SDK picks up the session immediately after redirect.
		const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
		if (!saleorApiUrl) {
			console.error("Missing NEXT_PUBLIC_SALEOR_API_URL env variable");
			return NextResponse.json(
				{ errors: [{ message: "Serverkonfiguration fehlerhaft", code: "SERVER_MISCONFIGURED" }] },
				{ status: 500 },
			);
		}

		const accessKey = encodeCookieName(`${saleorApiUrl}+saleor_auth_access_token`);
		const refreshKey = encodeCookieName(`${saleorApiUrl}+saleor_auth_refresh_token`);

		const cookieStore = await cookies();
		const isSecure = process.env.NODE_ENV === "production";

		// httpOnly: false is intentional — the client-side SDK must be able
		// to read these cookies to attach the Authorization header on requests.
		cookieStore.set(accessKey, setPassword.token, {
			httpOnly: false,
			secure: isSecure,
			sameSite: "lax",
			path: "/",
			maxAge: ACCESS_TOKEN_MAX_AGE,
		});

		cookieStore.set(refreshKey, setPassword.refreshToken, {
			httpOnly: false,
			secure: isSecure,
			sameSite: "lax",
			path: "/",
			maxAge: REFRESH_TOKEN_MAX_AGE,
		});

		return NextResponse.json({
			success: true,
			message: "Passwort erfolgreich aktualisiert",
		});
	}

	return NextResponse.json(
		{ errors: [{ message: "Passwort konnte nicht gesetzt werden", code: "UNKNOWN" }] },
		{ status: 500 },
	);
}
