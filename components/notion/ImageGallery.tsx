"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { MediaViewer } from "./MediaViewer";

type GalleryImage = { src: string; alt: string; caption: string };

/** Scoped to one live article: never collects avatars, icons or frozen windows. */
export function ImageGallery({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const elements = Array.from(
      node.querySelectorAll<HTMLImageElement>("[data-reader-image] img"),
    );
    const old = elements.map((image) => ({
      image,
      role: image.getAttribute("role"),
      tab: image.getAttribute("tabindex"),
      label: image.getAttribute("aria-label"),
    }));
    elements.forEach((image) => {
      image.setAttribute("role", "button");
      image.tabIndex = 0;
      image.setAttribute(
        "aria-label",
        `Expand image: ${image.alt || "Page image"}`,
      );
    });
    function activate(event: MouseEvent | KeyboardEvent) {
      if (
        event instanceof KeyboardEvent &&
        event.key !== "Enter" &&
        event.key !== " "
      )
        return;
      if (
        event instanceof MouseEvent &&
        (event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.shiftKey)
      )
        return;
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !elements.includes(image))
        return;
      event.preventDefault();
      opener.current = image;
      setImages(
        elements.map((element) => ({
          src: element.dataset.fullSrc || element.currentSrc || element.src,
          alt: element.alt,
          caption:
            element
              .closest("figure")
              ?.querySelector("figcaption")
              ?.textContent?.trim() ||
            element.alt ||
            "Page image",
        })),
      );
      setFailed(false);
      setZoom(1);
      setIndex(elements.indexOf(image));
      setOpen(true);
    }
    node.addEventListener("click", activate);
    node.addEventListener("keydown", activate);
    return () => {
      node.removeEventListener("click", activate);
      node.removeEventListener("keydown", activate);
      old.forEach(({ image, role, tab, label }) => {
        for (const [key, value] of [
          ["role", role],
          ["tabindex", tab],
          ["aria-label", label],
        ]) {
          if (value === null) image.removeAttribute(key!);
          else image.setAttribute(key!, value!);
        }
      });
    };
  }, [children]);
  function navigate(direction: number) {
    if (!images.length) return;
    setIndex(
      (current) => (current + direction + images.length) % images.length,
    );
    setFailed(false);
    setZoom(1);
  }
  const image = images[index] ?? null;
  return (
    <div ref={root} className="contents">
      {children}
      <MediaViewer
        open={open && image !== null}
        onOpenChange={setOpen}
        title={
          images.length
            ? `Image ${index + 1} of ${images.length}`
            : "Expanded image"
        }
        finalFocus={opener}
        onNavigate={images.length > 1 ? navigate : undefined}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((value) => Math.max(1, value - 0.5))}
              disabled={zoom <= 1}
              aria-label="Zoom image out"
            >
              −
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(1)}
              aria-label="Fit image to view"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((value) => Math.min(4, value + 0.5))}
              disabled={zoom >= 4}
              aria-label="Zoom image in"
            >
              +
            </Button>
            {images.length > 1 ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  aria-label="Previous image"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(1)}
                  aria-label="Next image"
                >
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={18}
                    aria-hidden
                  />
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {image ? (
          <figure className="media-image-figure">
            <div
              className="media-image-scroll"
              data-zoomed={zoom > 1 ? "" : undefined}
            >
              {failed ? (
                <p role="status">
                  This image could not be loaded. Close the viewer and try
                  again.
                </p>
              ) : (
                // Full-resolution source from the already-authorized inline image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  onError={() => setFailed(true)}
                  style={
                    zoom === 1
                      ? {
                          maxWidth: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          height: "auto",
                        }
                      : {
                          width: `${zoom * 100}%`,
                          maxWidth: "none",
                          height: "auto",
                        }
                  }
                />
              )}
            </div>
            <figcaption aria-live="polite">{image.caption}</figcaption>
          </figure>
        ) : null}
      </MediaViewer>
    </div>
  );
}
