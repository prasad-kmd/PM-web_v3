"use client";

import { usePathname } from "next/navigation";
import { LoadingView } from "@/components/system/states/LoadingView";
import { describeRoute } from "@/components/system/states/route-state";

export default function Loading() {
  const { label, layout } = describeRoute(usePathname());
  return <LoadingView label={label} layout={layout} />;
}
