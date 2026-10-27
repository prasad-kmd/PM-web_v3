"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { ErrorView } from "@/components/system/states/ErrorView";
import { describeRoute } from "@/components/system/states/route-state";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { label } = describeRoute(usePathname());
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (error.digest) console.error("Workspace error:", error.digest);
  }, [error]);
  return (
    <ErrorView
      label={label === "page" ? "This window" : label}
      digest={error.digest}
      pending={pending}
      onReload={() =>
        // Re-fetch the server segment, then re-render the boundary.
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
