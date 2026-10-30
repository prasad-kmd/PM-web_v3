"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useOptionalAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Spinner } from "@/components/ui/spinner";
import {
  BOOT_DONE_EVENT,
  BOOT_PREVIEW_EVENT,
  BOOT_TIMING,
  resolveBootVariant,
  type BootVariant,
} from "@/lib/boot";
import { PmLogo } from "./PmLogo";

declare global {
  interface Window {
    __pmBootStartedAt?: number;
  }
}

type BootPhase = "armed" | "playing" | "exiting" | "done";
type BootStatus = "starting" | "restoring" | "ready";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** The root Desktop stays mounted for SPA navigation, so this only arms once. */
let initialBootHandled = false;

export function BootSequence({ ready }: { ready: boolean }) {
  const lockOpen = useOptionalAdminAuth()?.lockOpen ?? false;
  const [phase, setPhase] = useState<BootPhase>("armed");
  const [variant, setVariant] = useState<BootVariant>("full");
  const [status, setStatus] = useState<BootStatus>("starting");
  const [runId, setRunId] = useState(0);

  const phaseRef = useRef<BootPhase>("armed");
  const variantRef = useRef<BootVariant>("full");
  const readyRef = useRef(ready);
  const startedAtRef = useRef(0);
  const previewRunRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  phaseRef.current = phase;
  readyRef.current = ready;

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) window.clearTimeout(timer);
    timersRef.current = [];
  }, []);

  const later = useCallback((handler: () => void, delay: number) => {
    const timer = window.setTimeout(
      () => {
        timersRef.current = timersRef.current.filter(
          (candidate) => candidate !== timer,
        );
        handler();
      },
      Math.max(0, delay),
    );
    timersRef.current.push(timer);
  }, []);

  const markDone = useCallback(() => {
    if (phaseRef.current === "done") return;
    clearTimers();
    phaseRef.current = "done";
    setPhase("done");
    document.documentElement.dataset.bootState = "done";
    window.dispatchEvent(new Event(BOOT_DONE_EVENT));
  }, [clearTimers]);

  const beginExit = useCallback(() => {
    if (phaseRef.current === "exiting" || phaseRef.current === "done") {
      return;
    }
    clearTimers();
    phaseRef.current = "exiting";
    setPhase("exiting");
    setStatus("ready");
    document.documentElement.dataset.bootState = "exiting";
    later(markDone, BOOT_TIMING[variantRef.current].exitMs);
  }, [clearTimers, later, markDone]);

  const scheduleRunTimers = useCallback(() => {
    const timing = BOOT_TIMING[variantRef.current];
    const elapsed = Math.max(0, performance.now() - startedAtRef.current);

    if (variantRef.current === "full") {
      later(() => setStatus("restoring"), 650 - elapsed);
    } else {
      later(() => setStatus("restoring"), 450 - elapsed);
    }

    later(() => beginExit(), timing.maxMs - elapsed);
    if (previewRunRef.current) {
      // A deliberate Settings replay plays the normal CSS timeline even
      // though Desktop is already ready.
      later(() => beginExit(), timing.previewMs - elapsed);
    } else if (readyRef.current) {
      // Initial boot has no artificial minimum hold: exit as soon as the
      // Desktop reports that it is ready.
      later(() => beginExit(), 0);
    }
  }, [beginExit, later]);

  const startRun = useCallback(
    (
      nextVariant: BootVariant,
      startedAt: number,
      {
        restartAnimations = false,
        isPreview = false,
      }: { restartAnimations?: boolean; isPreview?: boolean } = {},
    ) => {
      clearTimers();
      variantRef.current = nextVariant;
      startedAtRef.current = startedAt;
      previewRunRef.current = isPreview;
      phaseRef.current = "playing";
      setVariant(nextVariant);
      setStatus("starting");
      setPhase("playing");
      if (restartAnimations) setRunId((current) => current + 1);

      const root = document.documentElement;
      root.dataset.bootState = "playing";
      root.dataset.bootVariant = nextVariant;
      scheduleRunTimers();
    },
    [clearTimers, scheduleRunTimers],
  );

  useIsoLayoutEffect(() => {
    const root = document.documentElement;

    if (initialBootHandled) {
      // React Strict Mode replays effects in development. Re-arm only the
      // timers; the CSS animation and original start timestamp stay intact.
      if (phaseRef.current === "playing") {
        clearTimers();
        scheduleRunTimers();
      } else if (phaseRef.current !== "exiting") {
        phaseRef.current = "done";
        setPhase("done");
      }
      return;
    }
    initialBootHandled = true;

    const state = root.dataset.bootState;
    if (state === "pending" || state === "playing") {
      startRun(
        resolveBootVariant(root.dataset.bootVariant),
        window.__pmBootStartedAt ?? performance.now(),
      );
      return;
    }

    if (!state) root.dataset.bootState = "done";
    phaseRef.current = "done";
    setPhase("done");
  }, [clearTimers, scheduleRunTimers, startRun]);

  useEffect(() => {
    readyRef.current = ready;
    if (!ready || phaseRef.current !== "playing" || previewRunRef.current) {
      return;
    }
    later(() => beginExit(), 0);
  }, [beginExit, later, ready]);

  useEffect(() => {
    const onPreview = () => {
      if (lockOpen) return;
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const nextVariant: BootVariant = reducedMotion ? "short" : "full";
      const root = document.documentElement;
      root.dataset.bootState = "pending";
      root.dataset.bootVariant = nextVariant;
      startRun(nextVariant, performance.now(), {
        restartAnimations: true,
        isPreview: true,
      });
    };

    window.addEventListener(BOOT_PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(BOOT_PREVIEW_EVENT, onPreview);
  }, [lockOpen, startRun]);

  // The security lock retains priority over the mandatory brand sequence.
  useEffect(() => {
    if (lockOpen && phase !== "done") markDone();
  }, [lockOpen, markDone, phase]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && phaseRef.current !== "done") markDone();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [markDone]);

  useEffect(() => {
    const desktopRoot = document.querySelector<HTMLElement>(".desktop-root");
    if (!desktopRoot) return;
    const active = phase === "playing" || phase === "exiting";
    if (active) desktopRoot.setAttribute("inert", "");
    else desktopRoot.removeAttribute("inert");
    return () => desktopRoot.removeAttribute("inert");
  }, [phase]);

  if (phase === "done") return null;

  const exiting = phase === "exiting";
  const statusIcon = exiting ? (
    <HugeiconsIcon
      icon={Tick02Icon}
      strokeWidth={2}
      size={14}
      aria-hidden
      className="boot-status-check"
    />
  ) : (
    <Spinner
      className="boot-spinner"
      aria-hidden
      role="presentation"
      size={14}
    />
  );
  const fullStatus =
    status === "ready"
      ? "Ready"
      : status === "restoring"
        ? "Restoring windows & preferences…"
        : "Starting workspace…";
  const shortStatus = status === "ready" ? "Ready" : "Starting workspace…";
  const shortHint =
    status === "ready"
      ? "Workspace is ready"
      : status === "restoring"
        ? "Restoring your windows & preferences"
        : "Preparing the desktop";

  return (
    <section
      className={`boot-sequence${exiting ? " is-exiting" : ""}`}
      data-phase={phase}
      data-variant={variant}
      aria-label="Starting Prasad M. desktop workspace"
    >
      <div className="boot-full">
        <div className="boot-wordmark" key={`full-${runId}`}>
          <PmLogo size={176} className="boot-logo" />
          <p className="boot-name">Prasad Madhuranga</p>
          <p className="boot-role">Mechanical + Mechatronics Engineer</p>
          <span className="boot-rule" aria-hidden />
          <p className="boot-tag">Desktop Workspace</p>
        </div>
        <div className="boot-status-dock">
          {statusIcon}
          <span role="status" aria-live="polite">
            {fullStatus}
          </span>
        </div>
      </div>

      <div className="boot-short">
        <div className="boot-card" key={`short-${runId}`}>
          <PmLogo size={38} className="boot-card-logo" />
          <div className="boot-card-row">
            {statusIcon}
            <span role="status" aria-live="polite">
              {shortStatus}
            </span>
          </div>
          <div className="boot-card-bar" aria-hidden>
            <span />
          </div>
          <p className="boot-card-hint">{shortHint}</p>
        </div>
      </div>
    </section>
  );
}
