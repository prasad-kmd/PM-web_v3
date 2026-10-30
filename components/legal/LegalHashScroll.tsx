"use client";

import { useEffect } from "react";

const HEADING_OFFSET = 72;

/** Scrolls a legal deep link inside the DesktopOS window, not the document. */
export function LegalHashScroll() {
  useEffect(() => {
    let frame = 0;
    let timer = 0;

    const scrollToHash = () => {
      const rawHash = window.location.hash.replace(/^#/, "");
      if (!rawHash) return;
      let id = rawHash;
      try {
        id = decodeURIComponent(rawHash);
      } catch {
        // Keep the raw hash if it is not valid URI encoding.
      }
      const target = document.getElementById(id);
      if (!target) return;
      const scroller = target.closest<HTMLElement>(".window-body");
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!scroller) {
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        return;
      }
      const top =
        scroller.scrollTop +
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        HEADING_OFFSET;
      scroller.scrollTo({
        top: Math.max(0, top),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    // The routed window can mount a frame before its scroll body is measurable.
    frame = requestAnimationFrame(scrollToHash);
    timer = window.setTimeout(scrollToHash, 180);
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return null;
}
