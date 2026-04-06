"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { requestAccountDeletion } from "@/app/[channel]/(main)/account/actions";

export function DeleteAccountSection() {
	const params = useParams<{ channel: string }>();
	const [showConfirm, setShowConfirm] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [sent, setSent] = useState(false);

	function handleDelete() {
		setError("");
		startTransition(async () => {
			const formData = new FormData();
			formData.set("redirectUrl", `${window.location.origin}/${params.channel}`);
			formData.set("channel", params.channel);
			const result = await requestAccountDeletion(formData);
			if (!result.success) {
				setError(result.error);
			} else {
				setSent(true);
			}
		});
	}

	if (sent) {
		return (
			<div aria-live="polite" className="rounded-lg border border-border bg-accent/5 p-4">
				<p className="text-sm text-accent">
					Eine Bestätigungs-E-Mail wurde gesendet. Bitte prüfen Sie Ihren Posteingang, um die Kontolöschung abzuschließen.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div>
				<p className="text-sm font-medium text-destructive">Konto löschen</p>
				<p className="text-sm text-muted-foreground">
					Konto und alle zugehörigen Daten dauerhaft entfernen.
				</p>
			</div>

			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}

			{!showConfirm ? (
				<Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
					Konto löschen
				</Button>
			) : (
				<div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
					<div className="space-y-3">
						<p className="text-sm">
							Diese Aktion kann nicht rückgängig gemacht werden. Sie erhalten eine Bestätigungs-E-Mail, bevor Ihr Konto gelöscht wird.
						</p>
						<div className="flex gap-2">
							<Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
								{isPending ? "Wird gesendet…" : "Ja, mein Konto löschen"}
							</Button>
							<Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
								Abbrechen
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
