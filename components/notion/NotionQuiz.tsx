"use client";

// Adapted from PM-Web_V2 (AGPL-3.0); see THIRD_PARTY_NOTICES.md.

import { useState } from "react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  RefreshCcwIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type QuizSpec = {
  id?: string;
  title?: string;
  questions: QuizQuestion[];
};

export function NotionQuiz({ quiz }: { quiz: QuizSpec }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = quiz.questions[index];

  if (!question || quiz.questions.length === 0) return null;

  const checkAnswer = () => {
    if (selected === null || answered) return;
    if (selected === question.answer) setScore((current) => current + 1);
    setAnswered(true);
  };

  const nextQuestion = () => {
    if (index + 1 < quiz.questions.length) {
      setIndex((current) => current + 1);
      setSelected(null);
      setAnswered(false);
      return;
    }

    const finalScore = score;
    setFinished(true);
    if (quiz.id && typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `quiz_status_${quiz.id}`,
          JSON.stringify({
            completed: true,
            score: finalScore,
            total: quiz.questions.length,
            date: new Date().toISOString(),
          }),
        );
        window.dispatchEvent(new Event("quiz_updated"));
      } catch {
        // Quiz progress is optional when storage is unavailable.
      }
    }
  };

  const reset = () => {
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  const percent = Math.round((score / quiz.questions.length) * 100);

  return (
    <section
      className="my-8 overflow-hidden rounded-2xl border border-border bg-card"
      aria-label={quiz.title || "Knowledge check"}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4 md:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Knowledge check
          </p>
          <h3 className="mt-1 font-sans text-lg font-semibold text-foreground">
            {quiz.title || "Test your understanding"}
          </h3>
        </div>
        {!finished ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {index + 1} / {quiz.questions.length}
          </span>
        ) : null}
      </header>

      {finished ? (
        <div
          className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
          role="status"
        >
          <div>
            <p className="font-sans text-2xl font-semibold text-foreground">
              {percent}% correct
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You got {score} of {quiz.questions.length} questions right.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            className="gap-2"
          >
            <HugeiconsIcon
              icon={RefreshCcwIcon}
              strokeWidth={2}
              aria-hidden="true"
              className="size-4"
            />{" "}
            Try again
          </Button>
        </div>
      ) : (
        <div className="p-5 md:p-6">
          <p className="text-base font-medium leading-7 text-foreground md:text-lg">
            {question.question}
          </p>
          <div className="mt-4 grid gap-2">
            {question.options.map((option, optionIndex) => {
              const isCorrect = answered && optionIndex === question.answer;
              const isWrong =
                answered &&
                optionIndex === selected &&
                optionIndex !== question.answer;
              const isSelected = selected === optionIndex;
              return (
                <button
                  key={`${optionIndex}-${option}`}
                  type="button"
                  disabled={answered}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(optionIndex)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm leading-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCorrect ? "border-primary/50 bg-muted text-foreground" : isWrong ? "border-destructive/50 bg-destructive/10 text-foreground" : isSelected ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-background text-foreground hover:bg-muted/60"}`}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current/30">
                    {isCorrect ? (
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="size-3.5 text-foreground"
                      />
                    ) : isWrong ? (
                      <HugeiconsIcon
                        icon={Cancel01Icon}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="size-3.5 text-destructive"
                      />
                    ) : (
                      <span
                        className={`size-2 rounded-full ${isSelected ? "bg-primary" : ""}`}
                      />
                    )}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {answered && question.explanation ? (
            <p className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
              {question.explanation}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end">
            {!answered ? (
              <Button
                type="button"
                onClick={checkAnswer}
                disabled={selected === null}
              >
                Check answer
              </Button>
            ) : (
              <Button type="button" onClick={nextQuestion} className="gap-2">
                {index + 1 === quiz.questions.length
                  ? "See result"
                  : "Next question"}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="size-4"
                />
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
