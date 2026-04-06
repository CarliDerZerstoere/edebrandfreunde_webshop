"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

type Props = {
	email: string;
	token: string;
};

export function SetPasswordMode({ email, token }: Props) {
	const router = useRouter();
	const params = useParams<{ channel: string }>();

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!password) {
			setError("Bitte gib ein neues Passwort ein");
			return;
		}

		if (password.length < 8) {
			setError("Das Passwort muss mindestens 8 Zeichen lang sein");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwörter stimmen nicht überein");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/set-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, token, password }),
			});

			const data = (await response.json()) as {
				errors?: Array<{ message: string; code?: string }>;
				success?: boolean;
			};

			if (data.errors?.length) {
				const err = data.errors[0];
				if (err.code === "INVALID_TOKEN" || err.message?.includes("token")) {
					setError("Dieser Passwort-Zurücksetzen-Link ist abgelaufen. Bitte fordere einen neuen an.");
				} else {
					setError(err.message || "Passwort konnte nicht gesetzt werden");
				}
				return;
			}

			if (data.success) {
				setSuccess(true);
				setTimeout(() => {
					router.push(`/${params.channel}/login`);
					router.refresh();
				}, 2000);
			}
		} catch {
			setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (success) {
		return (
			<div className="mx-auto my-16 w-full max-w-md">
				<div className="rounded-lg border border-border bg-card p-8 shadow-sm">
					<div className="flex flex-col items-center gap-4 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
							<CheckCircle className="h-8 w-8 text-accent" />
						</div>
						<h1 className="text-2xl font-semibold">Passwort aktualisiert!</h1>
						<p className="text-muted-foreground">
							Dein Passwort wurde erfolgreich zurückgesetzt. Du bist jetzt angemeldet.
						</p>
						<p className="text-sm text-muted-foreground">Du wirst weitergeleitet…</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto my-16 w-full max-w-md">
			<div className="rounded-lg border border-border bg-card p-8 shadow-sm">
				<div className="mb-6 text-center">
					<h1 className="text-2xl font-semibold">Neues Passwort setzen</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Neues Passwort für <span className="font-medium">{email}</span> eingeben
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div role="alert" className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="password" className="text-sm font-medium">
							Neues Passwort
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="Mindestens 8 Zeichen…"
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="h-12 pl-10 pr-10"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="confirmPassword" className="text-sm font-medium">
							Passwort bestätigen
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Passwort erneut eingeben"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="h-12 pl-10 pr-10"
								required
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base font-semibold">
						{isSubmitting ? "Wird aktualisiert…" : "Passwort aktualisieren"}
					</Button>

					<div className="text-center">
						<Link
							href={`/${params.channel}/login`}
							className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground hover:no-underline"
						>
							Zurück zur Anmeldung
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
}
