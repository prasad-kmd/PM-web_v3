"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as CodeBlockPrimitive from "@animate-ui/react/primitives/code-block";
import {
  CopyButton,
  CopyButtonIcon,
} from "@animate-ui/react/primitives/buttons/copy";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Animate UI's code block composition (shadcn/ui's code block, animated),
 * adapted to the workspace tokens. Highlighting stays with Shiki: callers pass
 * pre-coloured lines as `CodeBlockLine` children. `CodeBlockContent` is the
 * primitive's `pre`, which draws the cursor and follows the last line while
 * `writing`; pair it with `useCodeWriting` for the typing effect.
 */
const codeBlockVariants = cva(
  "group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl text-sm has-[>[data-slot=code-block-content]:focus-visible]:ring-3 has-[>[data-slot=code-block-content]:focus-visible]:ring-ring/30 data-[size=sm]:rounded-xl data-[size=sm]:text-xs",
  {
    variants: {
      variant: {
        default:
          "bg-muted text-foreground ring-1 ring-foreground/5 dark:ring-foreground/10",
        destructive:
          "bg-destructive/5 text-destructive ring-1 ring-destructive/15 dark:bg-destructive/10 dark:ring-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function CodeBlock({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof codeBlockVariants> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="code-block"
      data-variant={variant}
      data-size={size}
      className={cn(codeBlockVariants({ variant }), className)}
      {...props}
    />
  );
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 px-4 pt-3.5 text-muted-foreground group-data-[size=sm]/code-block:px-3 group-data-[size=sm]/code-block:pt-3 *:has-[>[data-slot=code-block-title]]:min-w-0",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-title"
      className={cn(
        "min-w-0 truncate font-sans text-sm font-medium text-foreground group-data-[size=sm]/code-block:text-xs [&_svg]:pointer-events-none [&_svg]:inline-block [&_svg]:align-middle [&_svg:not([class*='size-'])]:size-4 *:[svg]:me-1.5 *:[svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Small mono badge for the language name. */
function CodeBlockLanguage({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="code-block-language"
      className={cn(
        "shrink-0 rounded-md bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px] leading-4 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn(
        "-my-1 ms-auto -me-1.5 flex shrink-0 items-center gap-1",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlockCopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <>
      <CopyButton
        asChild
        data-slot="code-block-copy-button"
        content={value}
        delay={2000}
        onCopiedChange={setCopied}
      >
        <button
          type="button"
          data-copied={copied || undefined}
          aria-label={copied ? "Copied" : "Copy code"}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-xs" }),
            "text-muted-foreground hover:bg-foreground/5 hover:text-foreground data-copied:text-foreground dark:hover:bg-foreground/10",
            className,
          )}
        >
          <CopyButtonIcon
            icon={<HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />}
            copiedIcon={<HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />}
          />
        </button>
      </CopyButton>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}

function CodeBlockContent({
  className,
  children,
  style,
  wrap = false,
  lineNumbers = false,
  startLine = 1,
  ...props
}: React.ComponentProps<typeof CodeBlockPrimitive.Content> & {
  wrap?: boolean;
  lineNumbers?: boolean;
  startLine?: number;
}) {
  return (
    <CodeBlockPrimitive.Content
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      data-numbered={lineNumbers || undefined}
      dir="ltr"
      tabIndex={0}
      style={{ counterReset: `line ${startLine - 1}`, ...style }}
      className={cn(
        "code-block-scroll m-0 min-h-0 min-w-0 overflow-auto bg-transparent px-4 py-4 text-start font-mono text-[13px] leading-relaxed outline-none group-has-data-[slot=code-block-footer]/code-block:pb-2 group-has-data-[slot=code-block-header]/code-block:pt-2.5 group-data-[size=sm]/code-block:px-3 group-data-[size=sm]/code-block:py-3 data-wrap:wrap-break-word data-wrap:whitespace-pre-wrap",
        className,
      )}
      {...props}
    >
      <code
        data-slot="code-block-code"
        className="grid min-h-lh min-w-max content-start bg-transparent p-0 font-[inherit] text-[length:inherit] in-data-numbered:grid-cols-[auto_1fr] in-data-wrap:min-w-0"
      >
        {children}
      </code>
    </CodeBlockPrimitive.Content>
  );
}

const codeBlockLineVariants = cva(
  "relative -mx-4 block min-h-lh px-4 group-data-[size=sm]/code-block:-mx-3 group-data-[size=sm]/code-block:px-3 before:min-w-6 before:text-end before:text-muted-foreground/70 after:absolute after:start-1 after:top-0 after:text-muted-foreground after:select-none in-data-numbered:col-span-2 in-data-numbered:grid in-data-numbered:grid-cols-subgrid in-data-numbered:gap-x-4 in-data-numbered:[counter-increment:line] in-data-numbered:before:content-[counter(line)] in-data-numbered:before:select-none in-data-numbered:supports-[content:counter(line)_/_'']:before:content-[counter(line)_/_'']",
  {
    variants: {
      variant: {
        default: "",
        added: "bg-foreground/5 after:content-['+']",
        removed: "bg-destructive/10 after:text-destructive after:content-['−']",
        highlighted: "bg-foreground/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function CodeBlockLine({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof codeBlockLineVariants>) {
  // An empty line holds a newline so copying a selection keeps blank lines.
  const empty =
    children === undefined ||
    children === null ||
    children === "" ||
    (Array.isArray(children) && children.length === 0);

  return (
    <span
      data-slot="code-block-line"
      data-variant={variant}
      className={cn(codeBlockLineVariants({ variant }), className)}
      {...props}
    >
      <span
        data-slot="code-block-line-content"
        data-empty={empty || undefined}
        className="min-w-0"
      >
        {empty ? "\n" : children}
      </span>
    </span>
  );
}

function CodeBlockFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-footer"
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2 px-4 pb-3.5 text-xs text-muted-foreground group-data-[size=sm]/code-block:px-3 group-data-[size=sm]/code-block:pb-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLanguage,
  CodeBlockLine,
  CodeBlockTitle,
};
