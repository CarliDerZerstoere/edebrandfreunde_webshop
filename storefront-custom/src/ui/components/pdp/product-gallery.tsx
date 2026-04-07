"use client";

import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { ImageCarousel, type ImageCarouselImage } from "@/ui/components/ui/image-carousel";

interface ProductGalleryProps {
	images: ImageCarouselImage[];
	productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	const openLightbox = useCallback((index: number) => {
		setLightboxIndex(index);
	}, []);

	const closeLightbox = useCallback(() => {
		setLightboxIndex(null);
	}, []);

	const prevImage = useCallback(() => {
		setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
	}, [images.length]);

	const nextImage = useCallback(() => {
		setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
	}, [images.length]);

	// Keyboard navigation and scroll lock
	useEffect(() => {
		if (lightboxIndex === null) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeLightbox();
			if (e.key === "ArrowLeft") prevImage();
			if (e.key === "ArrowRight") nextImage();
		};

		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [lightboxIndex, closeLightbox, prevImage, nextImage]);

	return (
		<>
			<ImageCarousel
				images={images}
				productName={productName}
				showArrows={true}
				showDots={true}
				showThumbnails={true}
				onImageClick={openLightbox}
			/>

			{/* Fullscreen Lightbox */}
			{lightboxIndex !== null && images[lightboxIndex] && (
				<div
					className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
					onClick={closeLightbox}
					role="dialog"
					aria-modal="true"
					aria-label={`${productName} - Vollbild`}
				>
					{/* Close Button */}
					<button
						type="button"
						className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
						onClick={closeLightbox}
						aria-label="Schließen"
					>
						<X className="h-6 w-6" />
					</button>

					{/* Image Counter */}
					{images.length > 1 && (
						<span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
							{lightboxIndex + 1} / {images.length}
						</span>
					)}

					{/* Prev button */}
					{images.length > 1 && (
						<button
							type="button"
							className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
							onClick={(e) => { e.stopPropagation(); prevImage(); }}
							aria-label="Vorheriges Bild"
						>
							<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M15 18l-6-6 6-6" />
							</svg>
						</button>
					)}

					{/* Next button */}
					{images.length > 1 && (
						<button
							type="button"
							className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
							onClick={(e) => { e.stopPropagation(); nextImage(); }}
							aria-label="Nächstes Bild"
						>
							<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</button>
					)}

					{/* Full-resolution Image */}
					<div
						className="relative max-h-[90vh] max-w-[90vw]"
						style={{ aspectRatio: "auto" }}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Use a regular img tag for lightbox to avoid fill constraints */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={images[lightboxIndex].url}
							alt={images[lightboxIndex].alt || `${productName} - Vollbild`}
							className="block max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
							style={{ width: "auto", height: "auto" }}
						/>
					</div>
				</div>
			)}
		</>
	);
}

