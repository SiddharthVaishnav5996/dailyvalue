"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { AddButton } from "@/components/AddButton/AddButton";
import { CarouselDot } from "@/components/CarouselDot/CarouselDot";
import { Text } from "@/components/Text/Text";
import type { CarouselSlide } from "@/data/landing";
import styles from "./Carousel.module.css";

export interface CarouselProps {
  slides: CarouselSlide[];
  className?: string;
}

const AUTO_ADVANCE_MS = 5000;

/**
 * A swipeable promo carousel. One slide is visible at a time; the track slides
 * horizontally. Navigate by dragging/swiping or by clicking the pagination
 * dots (the "Carousel swipe" component). Slide images are supplied later — until
 * then each slide shows a labelled placeholder.
 */
export function Carousel({ slides, className }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const count = slides.length;

  function goTo(next: number) {
    setIndex((prev) => {
      const target = Math.max(0, Math.min(count - 1, next));
      return target === prev ? prev : target;
    });
  }

  // Auto-advance, looping back to the first slide — paused while the user is
  // hovering the carousel or actively dragging a slide.
  useEffect(() => {
    if (isHovering || isDragging || count <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [isHovering, isDragging, count]);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Don't begin a drag when the press lands on a control (the pagination
    // dots or a slide's CTA). Capturing the pointer here would retarget the
    // follow-up click to this element and swallow the button's onClick.
    if ((e.target as HTMLElement).closest("button, a")) return;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    dragDelta.current = e.clientX - dragStartX.current;
  }

  function handlePointerUp() {
    if (dragStartX.current === null) return;
    const threshold = 50;
    if (dragDelta.current > threshold) goTo(index - 1);
    else if (dragDelta.current < -threshold) goTo(index + 1);
    dragStartX.current = null;
    dragDelta.current = 0;
    setIsDragging(false);
  }

  return (
    <div
      className={[styles.carousel, className].filter(Boolean).join(" ")}
      role="group"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        className={styles.viewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className={styles.track}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => {
            const hasArtwork = Boolean(slide.textImageSrc || slide.imageSrc);
            return (
              <div
                key={slide.id}
                className={styles.slide}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i === index ? undefined : true}
                style={slide.background ? { background: slide.background } : undefined}
              >
                {slide.bannerSrc ? (
                  /* A self-contained banner: fitted whole so its baked-in
                     headline and CTA are never cropped. */
                  <Image
                    src={slide.bannerSrc}
                    alt={slide.alt}
                    fill
                    sizes="(max-width: 900px) 100vw, 1160px"
                    className={[
                      styles.banner,
                      slide.bannerFit === "cover" ? styles.bannerCover : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    draggable={false}
                    priority={i === 0}
                  />
                ) : hasArtwork ? (
                  <div className={styles.split}>
                    {/* Left half: headline artwork with the CTA beneath it. */}
                    <div className={styles.textHalf}>
                      {slide.textImageSrc && (
                        <div className={styles.textArtWrap}>
                          <Image
                            src={slide.textImageSrc}
                            alt={slide.alt}
                            fill
                            sizes="(max-width: 900px) 90vw, 45vw"
                            className={styles.textArt}
                            draggable={false}
                            priority={i === 0}
                          />
                        </div>
                      )}
                      <AddButton />
                    </div>

                    {/* Right half: the visual. */}
                    {slide.imageSrc && (
                      <div className={styles.visualHalf}>
                        <Image
                          src={slide.imageSrc}
                          alt=""
                          fill
                          sizes="(max-width: 900px) 90vw, 50vw"
                          className={styles.visual}
                          draggable={false}
                          priority={i === 0}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.placeholder}>
                    <ImageIcon size={40} strokeWidth={1.5} aria-hidden="true" />
                    <Text as="span" variant="smallRegular" className={styles.placeholderLabel}>
                      {slide.alt}
                    </Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination sits inside the banner, bottom-centered. It lives on the
            viewport (not the track) so it stays put while the slides move. */}
        <div className={styles.dots} role="tablist" aria-label="Choose slide">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={styles.dotButton}
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
            >
              <CarouselDot selected={i === index} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
