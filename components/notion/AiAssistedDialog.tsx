"use client";

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  SecurityCheckIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * AI-assisted disclosure — the v1 indicator's explanation and v2's structured
 * dialog, in v3's neutral reader language.
 *
 * The trigger is a real <button> (keyboard reachable, announced), and the
 * disclosure is a coss Dialog: a focus-trapped overlay the reader explicitly
 * asks for, instead of a collapsed note at the end of the entry.
 */

/* Disclosure copy: describes AI assistance in general terms so it stays true
 * for every entry carrying the badge. Adjust the lists to match how you work. */
const AI_DISCLOSURE = {
  usedFor: [
    "Drafting and restructuring sections",
    "Cleaning up code samples, tables and diagrams",
    "Copy-editing for clarity and consistency",
    "Summarising source material before rewriting it",
  ],
  humanKept: [
    "The technical decisions and the conclusions drawn from them",
    "Every measurement, figure and specification quoted",
    "The final read-through before publishing",
  ],
} as const;

function Section({
  icon,
  heading,
  items,
}: {
  icon: IconSvgElement;
  heading: string;
  items: readonly string[];
}) {
  return (
    <section className="grid gap-2.5">
      <h3 className="flex items-center gap-2 font-medium text-foreground text-sm">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-md border bg-muted text-muted-foreground"
        >
          <HugeiconsIcon icon={icon} size={14} />
        </span>
        {heading}
      </h3>
      <ul className="grid gap-1.5 ps-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-muted-foreground text-sm leading-6"
          >
            <span
              aria-hidden="true"
              className="mt-2.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AiAssistedDialog({
  contentTitle,
  variant = "chip",
}: {
  /** Entry title, echoed in the dialog so readers know which page it covers. */
  contentTitle: string;
  /** `chip` sits with the category in the reader header; `note` closes the entry. */
  variant?: "chip" | "note";
}) {
  // Focus "Got it" (in the footer, outside the scroll panel) on open. The
  // default first-focusable is the correction link, which would scroll the
  // panel and hide the introduction.
  const closeRef = useRef<HTMLButtonElement>(null);
  const correctionHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Correction: ${contentTitle}`,
  )}`;

  return (
    <Dialog>
      {variant === "chip" ? (
        <DialogTrigger
          className="rdr-ai-chip"
          aria-label="AI-assisted: what does this mean for this entry?"
        >
          <HugeiconsIcon icon={SparklesIcon} size={13} aria-hidden />
          AI-assisted
        </DialogTrigger>
      ) : (
        <DialogTrigger className="rdr-ai-note">
          <HugeiconsIcon icon={SparklesIcon} size={15} aria-hidden />
          <span>
            Parts of this entry were produced with AI assistance and reviewed by
            the author.
          </span>
          <span className="rdr-ai-note-link">How AI was used</span>
        </DialogTrigger>
      )}

      <DialogPopup className="sm:max-w-xl" initialFocus={closeRef}>
        <DialogHeader className="pe-12">
          <span
            aria-hidden="true"
            className="mb-1 grid size-9 place-items-center rounded-lg border bg-muted text-foreground"
          >
            <HugeiconsIcon icon={SparklesIcon} size={18} />
          </span>
          <DialogTitle className="font-semibold text-lg leading-tight">
            About AI assistance
          </DialogTitle>
          <DialogDescription>
            How AI tools were involved in producing “{contentTitle}”, and what
            that means for you as a reader.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="grid gap-6">
          <p className="rounded-lg border bg-muted/50 p-4 text-muted-foreground text-sm leading-6">
            This entry carries the{" "}
            <span className="font-medium text-foreground">AI-assisted</span>{" "}
            badge because AI tools were used somewhere in producing it. All
            content is reviewed by hand before publishing. The badge is a
            disclosure, not a warning: it tells you where to read a little more
            carefully, not that the page is unreliable.
          </p>

          <Section
            icon={PencilEdit02Icon}
            heading="AI was used for"
            items={AI_DISCLOSURE.usedFor}
          />

          <Section
            icon={SecurityCheckIcon}
            heading="Kept human"
            items={AI_DISCLOSURE.humanKept}
          />

          <section className="grid gap-2 rounded-lg border border-foreground/15 p-4">
            <h3 className="flex items-center gap-2 font-medium text-foreground text-sm">
              <HugeiconsIcon icon={Alert02Icon} size={16} aria-hidden />
              Read with care
            </h3>
            <p className="text-muted-foreground text-sm leading-6">
              Language models can state something incorrect with complete
              confidence, and they are weakest exactly where technical writing
              is most useful: precise numbers, version-specific behaviour and
              citations. Verify anything you are about to build on, and treat a
              claim without a source as unverified.
            </p>
          </section>

          <section className="flex items-start gap-2.5 text-muted-foreground text-sm leading-6">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              aria-hidden
              className="mt-1 shrink-0 text-foreground"
            />
            <p>
              Spotted an error?{" "}
              <a
                href={correctionHref}
                className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
              >
                Send a correction
              </a>
              . Fixes can be credited and published.
            </p>
          </section>
        </DialogPanel>

        <DialogFooter variant="bare">
          <DialogClose ref={closeRef} render={<Button variant="outline" />}>
            Got it
          </DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
