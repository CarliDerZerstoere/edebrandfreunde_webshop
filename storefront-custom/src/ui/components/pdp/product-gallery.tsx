"use client";

import { useEffect, useRef } from "react";
import mediumZoom from "medium-zoom";
import { ImageCarousel, type ImageCarouselImage } from "@/ui/components/ui/image-carousel";

interface ProductGalleryProps {
	images: ImageCarouselImage[];
	productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const imgs = containerRef.current.querySelectorAll<HTMLImageElement>("img[data-zoomable]");
		const zoom = mediumZoom(imgs, {
			margin: 24,
			background: "rgba(0, 0, 0, 0.85)",
		});
		return () => { zoom.detach(); };
	}, [images]);

	return (
		<div ref={containerRef}>
			<ImageCarousel
				images={images}
				productName={productName}
				showArrows={true}
				showDots={true}
				showThumbnails={true}
				zoomable={true}
			/>
		</div>
	);
}
