import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

const REGISTER_MUTATION = `
  mutation AccountRegister($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      user {
        id
        email
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface RegisterRequest {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	channel: string;
	redirectUrl: string;
}

interface AccountRegisterResult {
	accountRegister?: {
		user?: { id: string; email: string };
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
	const body = (await request.json()) as RegisterRequest;
	const { email, password, firstName, lastName, channel, redirectUrl } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "E-Mail und Passwort sind erforderlich", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (redirectUrl && !isAllowedRedirectUrl(redirectUrl)) {
		return NextResponse.json(
			{ errors: [{ message: "Ungültige Weiterleitungs-URL", code: "INVALID_REDIRECT" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<AccountRegisterResult>({
		query: REGISTER_MUTATION,
		variables: {
			input: {
				email,
				password,
				firstName: firstName || "",
				lastName: lastName || "",
				channel,
				redirectUrl,
			},
		},
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Registration error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const accountRegister = result.data.accountRegister;

	// Saleor validation errors
	if (accountRegister?.errors?.length) {
		const validationResult = asValidationError(accountRegister.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Success
	return NextResponse.json({
		user: accountRegister?.user,
		message: "Konto erfolgreich erstellt. Bitte überprüfe deine E-Mail, um dein Konto zu verifizieren.",
	});
}
