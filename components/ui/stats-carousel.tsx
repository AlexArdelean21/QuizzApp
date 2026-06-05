"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { cn } from "@/lib/utils"

type StatsCarouselProps = {
  children: React.ReactNode[]
  autoplayDelay?: number
  className?: string
}

export function StatsCarousel({
  children,
  autoplayDelay = 3500,
  className,
}: StatsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", containScroll: false },
    [Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: true })]
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
  }, [emblaApi, onSelect])

  return (
    <div className={cn("relative w-full", className)}>
      <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
        <div className="flex">
          {children.map((child, idx) => (
            <div
              key={idx}
              className="min-w-0 flex-[0_0_85%] pl-3 first:pl-0"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      {/* Dot indicators */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {children.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => emblaApi?.scrollTo(idx)}
            aria-label={`Mergi la slide ${idx + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === selectedIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-slate-300 dark:bg-slate-700"
            )}
          />
        ))}
      </div>
    </div>
  )
}
