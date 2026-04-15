"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type ImageCarouselProps = {
  urls: string[];
  alt: string;
};

export function ImageCarousel({ urls, alt }: ImageCarouselProps) {
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-muted">
        <Image
          src={urls[0]}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 48rem"
        />
      </div>
    );
  }

  return (
    <Carousel className="relative w-full max-w-3xl">
      <CarouselContent>
        {urls.map((url, i) => (
          <CarouselItem key={`${url}-${i}`}>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <Image
                src={url}
                alt={`${alt} ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 48rem"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}
