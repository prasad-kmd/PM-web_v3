"use client";
import { useEffect } from "react";
import { StateSurface } from "@/components/system/StateSurface";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.digest) console.error("Workspace error:", error.digest);
  }, [error]);
  return <StateSurface kind="error" reset={reset} />;
}
