"use client";

import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CopyButton,
  CopyButtonIcon,
} from "@animate-ui/react/primitives/buttons/copy";
import { Button as PressButton } from "@animate-ui/react/primitives/buttons/button";
import { buttonVariants } from "@/components/ui/button";

type State =
  | { step: "idle" }
  | { step: "verifying" }
  | { step: "revealed"; email: string }
  | { step: "error"; message: string };

/**
 * The only place the contact address appears. It is fetched from
 * /api/contact/email after Turnstile passes, so it is never in the page HTML.
 * Turnstile loads only when the visitor asks for the address and stays
 * invisible unless Cloudflare needs an interaction.
 */
export function EmailReveal({ siteKey }: { siteKey: string }) {
  const [state, setState] = useState<State>({ step: "idle" });
  const [copied, setCopied] = useState(false);
  const widgetRef = useRef<TurnstileInstance>(undefined);

  async function reveal(token: string) {
    try {
      const response = await fetch("/api/contact/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
      };
      if (!response.ok || !result.ok || !result.email) {
        setState({
          step: "error",
          message: result.error || "The address could not be loaded.",
        });
        return;
      }
      setState({ step: "revealed", email: result.email });
    } catch {
      setState({ step: "error", message: "The address could not be loaded." });
    }
  }

  if (!siteKey) {
    return (
      <p role="status" className="contact-reveal-note">
        Email is unavailable right now. Please use the form.
      </p>
    );
  }

  if (state.step === "revealed") {
    return (
      <div className="contact-reveal-result" role="status">
        <a className="rdr-link" href={`mailto:${state.email}`}>
          {state.email}
        </a>
        <CopyButton
          asChild
          content={state.email}
          delay={1800}
          onCopiedChange={setCopied}
        >
          <button
            type="button"
            className={buttonVariants({
              variant: "ghost",
              size: "xs",
              className: "-ms-1.5 gap-1.5 text-muted-foreground",
            })}
          >
            <CopyButtonIcon
              icon={<HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />}
              copiedIcon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />}
            />
            {copied ? "Copied" : "Copy address"}
          </button>
        </CopyButton>
      </div>
    );
  }

  return (
    <div className="contact-reveal">
      {state.step === "idle" || state.step === "error" ? (
        <PressButton
          type="button"
          className={buttonVariants({ variant: "outline", size: "sm" })}
          onClick={() => {
            if (state.step === "error") widgetRef.current?.reset();
            setState({ step: "verifying" });
          }}
        >
          {state.step === "error" ? "Try again" : "Show email address"}
        </PressButton>
      ) : (
        <p className="contact-reveal-note" role="status">
          <span className="contact-reveal-spinner" aria-hidden="true" />
          Verifying you’re human…
        </p>
      )}
      {state.step === "error" ? (
        <p className="contact-reveal-note is-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.step !== "idle" ? (
        <Turnstile
          ref={widgetRef}
          siteKey={siteKey}
          onSuccess={(token) => void reveal(token)}
          onError={() =>
            setState({
              step: "error",
              message: "The security check failed. Please retry.",
            })
          }
          onExpire={() => widgetRef.current?.reset()}
          options={{
            theme: "auto",
            size: "compact",
            appearance: "interaction-only",
            action: "reveal-email",
          }}
        />
      ) : null}
    </div>
  );
}
