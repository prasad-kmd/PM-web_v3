"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToolViewProps } from "@/lib/tools/registry";
import {
  REGEX_LIMITS,
  buildHighlightSegments,
  sanitizeFlags,
  type RegexEvaluation,
} from "@/lib/tools/logic/regex";
import { REGEX_WORKER_SOURCE } from "@/lib/tools/regex-worker-source";
import {
  ToolActions,
  ToolCopyButton,
  ToolField,
  ToolPane,
  ToolSection,
  ToolStatus,
  ToolTextarea,
  ToolView,
} from "./shared";

const EMPTY_EVALUATION: RegexEvaluation = {
  matches: [],
  error: null,
  timedOut: false,
  truncated: false,
};

const DEFAULT_PATTERN = "([a-z0-9._%+-]+)@([a-z0-9.-]+\\.[a-z]{2,})";
const DEFAULT_FLAGS = "gi";
const DEFAULT_TEXT =
  "Contact support@example.com or sales@company.org. Invalid: not-an-email@";

export default function RegexArchitect({ toolId }: ToolViewProps) {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [flagsInput, setFlagsInput] = useState(DEFAULT_FLAGS);
  const [testString, setTestString] = useState(DEFAULT_TEXT);
  const [evaluation, setEvaluation] =
    useState<RegexEvaluation>(EMPTY_EVALUATION);
  const [pending, setPending] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  const flagValidation = useMemo(() => sanitizeFlags(flagsInput), [flagsInput]);

  useEffect(() => {
    const runId = (runIdRef.current += 1);
    let debounceTimer: number | undefined;
    let objectUrl: string | undefined;

    const clearWorker = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = undefined;
      }
    };

    clearWorker();
    const reset = (next: RegexEvaluation) => {
      setPending(false);
      setEvaluation(next);
    };

    if (!pattern) {
      reset(EMPTY_EVALUATION);
      return;
    }
    if (flagValidation.error) {
      reset({ ...EMPTY_EVALUATION, error: flagValidation.error });
      return;
    }
    if (pattern.length > REGEX_LIMITS.maxPatternLength) {
      reset({
        ...EMPTY_EVALUATION,
        error: `Pattern is limited to ${REGEX_LIMITS.maxPatternLength} characters.`,
      });
      return;
    }
    if (testString.length > REGEX_LIMITS.maxTestLength) {
      reset({
        ...EMPTY_EVALUATION,
        error: `Test string is limited to ${REGEX_LIMITS.maxTestLength.toLocaleString()} characters.`,
      });
      return;
    }
    if (typeof Worker === "undefined") {
      reset({
        ...EMPTY_EVALUATION,
        error: "Web workers are unavailable in this browser.",
      });
      return;
    }

    setPending(true);
    debounceTimer = window.setTimeout(() => {
      if (runId !== runIdRef.current) return;
      try {
        const blob = new Blob([REGEX_WORKER_SOURCE], {
          type: "text/javascript",
        });
        objectUrl = URL.createObjectURL(blob);
        const worker = new Worker(objectUrl);
        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<RegexEvaluation>) => {
          if (runId !== runIdRef.current) return;
          reset(event.data);
          clearWorker();
        };
        worker.onerror = () => {
          if (runId !== runIdRef.current) return;
          reset({ ...EMPTY_EVALUATION, error: "The matcher worker failed." });
          clearWorker();
        };
        worker.postMessage({
          pattern,
          flags: flagValidation.flags,
          text: testString,
          maxMatches: REGEX_LIMITS.maxMatches,
        });
        timeoutRef.current = window.setTimeout(() => {
          if (runId !== runIdRef.current) return;
          reset({
            ...EMPTY_EVALUATION,
            timedOut: true,
            error: `Stopped after ${REGEX_LIMITS.timeoutMs} ms to protect the window. Simplify nested quantifiers.`,
          });
          clearWorker();
        }, REGEX_LIMITS.timeoutMs);
      } catch {
        reset({
          ...EMPTY_EVALUATION,
          error: "Could not start the matcher worker.",
        });
        clearWorker();
      }
    }, 180);

    return () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      clearWorker();
    };
  }, [
    pattern,
    flagsInput,
    testString,
    flagValidation.flags,
    flagValidation.error,
  ]);

  const segments = useMemo(
    () => buildHighlightSegments(testString, evaluation.matches),
    [testString, evaluation.matches],
  );

  const preview: ReactNode[] = useMemo(
    () =>
      segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.value}</span>;
        }
        if (segment.type === "zero") {
          return (
            <span
              key={index}
              className="tool-regex-zero"
              aria-label={`Empty match ${segment.matchNumber ?? index + 1}`}
            />
          );
        }
        return (
          <span
            key={index}
            className="tool-regex-match"
            aria-label={`Match ${segment.matchNumber ?? index + 1}`}
          >
            {segment.value}
          </span>
        );
      }),
    [segments],
  );

  const regexLiteral = `/${pattern}/${flagValidation.flags}`;

  const status = evaluation.error
    ? {
        tone: evaluation.timedOut ? ("warning" as const) : ("error" as const),
        text: evaluation.error,
      }
    : pending
      ? { tone: "neutral" as const, text: "Matching…" }
      : evaluation.truncated
        ? {
            tone: "warning" as const,
            text: `Stopped at ${REGEX_LIMITS.maxMatches} matches. Narrow the pattern or test string.`,
          }
        : {
            tone: "success" as const,
            text: `${evaluation.matches.length.toLocaleString()} match${evaluation.matches.length === 1 ? "" : "es"} · ${regexLiteral}`,
          };

  return (
    <ToolView>
      <ToolSection
        title="Pattern"
        description="Matching runs in a short-lived worker with bounded input, flags, matches and time."
        actions={
          <ToolCopyButton value={regexLiteral} label="Copy regex literal" />
        }
      >
        <div className="tool-regex-controls">
          <ToolField label="Expression" className="tool-regex-pattern">
            <Input
              unstyled
              nativeInput
              className="tool-input"
              value={pattern}
              onChange={(event) => setPattern(event.currentTarget.value)}
              placeholder="Enter a regular expression…"
              aria-label={`${toolId} pattern`}
              spellCheck={false}
            />
          </ToolField>
          <ToolField label="Flags" className="tool-regex-flags">
            <Input
              unstyled
              nativeInput
              className="tool-input"
              value={flagsInput}
              onChange={(event) => setFlagsInput(event.currentTarget.value)}
              placeholder="gim"
              maxLength={12}
              aria-label="Regex flags"
              spellCheck={false}
            />
          </ToolField>
        </div>
        {flagValidation.error ? (
          <ToolStatus tone="error">{flagValidation.error}</ToolStatus>
        ) : null}
      </ToolSection>

      <ToolSection title="Test string and result">
        <div className="tool-split">
          <ToolPane label="Test string">
            <ToolTextarea
              value={testString}
              onChange={(event) => setTestString(event.currentTarget.value)}
              placeholder="Enter text to test…"
              aria-label={`${toolId} test string`}
            />
          </ToolPane>
          <ToolPane label="Highlighted preview">
            <div className="tool-regex-preview" aria-live="polite">
              {preview.length ? preview : testString}
            </div>
          </ToolPane>
        </div>

        <ToolActions>
          <span className="tool-inline-note">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              size={14}
              aria-hidden
            />
            Live matching
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPattern(DEFAULT_PATTERN);
              setFlagsInput(DEFAULT_FLAGS);
              setTestString(DEFAULT_TEXT);
            }}
          >
            Reset example
          </Button>
        </ToolActions>

        <ToolStatus tone={status.tone}>{status.text}</ToolStatus>

        {evaluation.matches.length ? (
          <div className="tool-match-list">
            {evaluation.matches.slice(0, 50).map((match, index) => (
              <div className="tool-match" key={index}>
                <span className="tool-match-meta">
                  #{index + 1} · index {match.index}
                </span>
                <code className="tool-match-value">
                  {match.value || "(empty match)"}
                </code>
                {match.groups.length ? (
                  <span className="tool-match-groups">
                    {match.groups.map((group, groupIndex) => (
                      <code key={groupIndex}>{group ?? "—"}</code>
                    ))}
                  </span>
                ) : null}
                {match.namedGroups ? (
                  <span className="tool-match-groups">
                    {Object.entries(match.namedGroups).map(([name, value]) => (
                      <code key={name}>
                        {name}: {value ?? "—"}
                      </code>
                    ))}
                  </span>
                ) : null}
              </div>
            ))}
            {evaluation.matches.length > 50 ? (
              <p className="tool-match-more">
                Showing the first 50 of {evaluation.matches.length} matches.
              </p>
            ) : null}
          </div>
        ) : null}
      </ToolSection>

      <ToolSection
        title="Guard notes"
        description="Allowed flags and safety limits for this workspace."
      >
        <ul className="tool-notes">
          <li>
            Allowed flags: d, g, i, m, s, u, v, y. Duplicates are ignored.
          </li>
          <li>
            Pattern ≤ {REGEX_LIMITS.maxPatternLength} characters · test string ≤{" "}
            {REGEX_LIMITS.maxTestLength.toLocaleString()} characters · matches ≤{" "}
            {REGEX_LIMITS.maxMatches}.
          </li>
          <li>
            A worker is terminated after {REGEX_LIMITS.timeoutMs} ms, so
            catastrophic patterns such as (a+)+$ cannot freeze the window.
          </li>
        </ul>
      </ToolSection>
    </ToolView>
  );
}
