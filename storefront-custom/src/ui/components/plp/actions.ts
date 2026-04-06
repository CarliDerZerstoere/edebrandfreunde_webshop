"use server";

import { revalidatePath } from "next/cache";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import { CheckoutAddLineDocument } from "@/gql/graphql";
import * as Checkout from "@/lib/checkout";

export async function quickAddToCart(channel: string, variantId: string) {
	try {
		const checkout = await Checkout.findOrCreate({
			checkoutId: await Checkout.getIdFromCookies(channel),
			channel,
		});

		if (!checkout) {
			return { success: false };
		}

		await Checkout.saveIdToCookie(channel, checkout.id);

		const result = await executeAuthenticatedGraphQL(CheckoutAddLineDocument, {
			variables: {
				id: checkout.id,
				productVariantId: variantId,
			},
			cache: "no-cache",
		});

		if (!result.ok) {
			return { success: false };
		}

		revalidatePath("/cart");
		return { success: true };
	} catch {
		return { success: false };
	}
}
