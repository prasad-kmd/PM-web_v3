"use client";

import {
  ArrowDown01Icon,
  Copy01Icon,
  Download04Icon,
  LinkSquare02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CinemaDownloadListing } from "@/lib/cinema/types";

/**
 * YTS releases — always available, never a silent disappearance.
 *
 * The reference returned `null` on any YTS problem, so "no release exists" and
 * "YTS is down" looked the same. Here `state` is explicit and printed.
 */
export function DownloadPanel({
  imdbId,
  title,
}: {
  imdbId: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [listing, setListing] = useState<CinemaDownloadListing | null>(null);
  const [message, setMessage] = useState("");
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const query = new URLSearchParams({ title });
      if (imdbId) query.set("imdb", imdbId);
      const response = await fetch(
        `/api/cinema/downloads?${query.toString()}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        (CinemaDownloadListing & { error?: string }) | null;
      if (!response.ok || !payload) {
        setStatus("error");
        setMessage(payload?.error ?? "YTS did not answer.");
        return;
      }
      setListing(payload);
      setStatus("ready");
      loadedRef.current = true;
    } catch {
      setStatus("error");
      setMessage("Could not reach the studio service.");
    }
  }, [imdbId, title]);

  useEffect(() => {
    if (open && !loadedRef.current) void load();
  }, [load, open]);

  async function copyMagnet(magnet: string) {
    try {
      await navigator.clipboard.writeText(magnet);
      toast.success("Magnet link copied");
    } catch {
      toast.error(
        "Clipboard is not available — copy from the open link instead",
      );
    }
  }

  return (
    <section className="cinema-downloads" aria-label="Downloads">
      <button
        type="button"
        className="cinema-downloads-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <HugeiconsIcon icon={Download04Icon} strokeWidth={2} size={13} />
        <span>Downloads</span>
        <span className="cinema-downloads-hint">YTS</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          size={12}
          className={open ? "is-flipped" : undefined}
        />
      </button>

      {open ? (
        status === "loading" ? (
          <div className="cinema-download-list" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : status === "error" ? (
          <p className="cinema-panel-hint">
            {message}{" "}
            <button
              type="button"
              className="cinema-link-btn"
              onClick={() => void load()}
            >
              Retry
            </button>
          </p>
        ) : listing && listing.state !== "ready" ? (
          <p className="cinema-panel-hint">
            {listing.message ?? "No release for this title on YTS."}
          </p>
        ) : listing ? (
          <div
            className="cinema-download-table"
            role="table"
            aria-label="YTS releases"
          >
            <div className="cinema-download-row is-head" role="row">
              <span role="columnheader">Quality</span>
              <span role="columnheader">Source</span>
              <span role="columnheader">Size</span>
              <span role="columnheader">Seeds</span>
              <span role="columnheader" aria-label="Actions" />
            </div>
            {listing.downloads.map((item) => (
              <div className="cinema-download-row" role="row" key={item.hash}>
                <span role="cell" className="cinema-download-quality">
                  {item.quality}
                </span>
                <span role="cell" className="cinema-download-source">
                  {item.type}
                </span>
                <span role="cell" className="cinema-tabular">
                  {item.size}
                </span>
                <span
                  role="cell"
                  className="cinema-tabular cinema-download-seeds"
                >
                  <HugeiconsIcon
                    icon={UserGroupIcon}
                    strokeWidth={2}
                    size={11}
                  />
                  {item.seeds}
                </span>
                <span role="cell" className="cinema-download-actions">
                  <button
                    type="button"
                    className="cinema-icon-btn is-plain"
                    onClick={() => void copyMagnet(item.magnet)}
                    aria-label={`Copy magnet link for ${item.quality}`}
                    title="Copy magnet link"
                  >
                    <HugeiconsIcon
                      icon={Copy01Icon}
                      strokeWidth={2}
                      size={12}
                    />
                  </button>
                  {item.torrentUrl ? (
                    <a
                      href={item.torrentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cinema-icon-btn is-plain"
                      aria-label={`Open torrent file for ${item.quality}`}
                      title="Open torrent file"
                    >
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        strokeWidth={2}
                        size={12}
                      />
                    </a>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null
      ) : null}

      {open ? (
        <p className="cinema-panel-hint cinema-download-legal">
          Third-party torrents are unlicensed distribution in most
          jurisdictions. You are the only account that can reach this page.
        </p>
      ) : null}
    </section>
  );
}
