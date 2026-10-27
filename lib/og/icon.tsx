import type { CSSProperties } from "react";

type IconNode = readonly (readonly [string, Record<string, string | number>])[];

/**
 * Renders a Hugeicons data array as a plain `<svg>` for Satori, which
 * can't run the hook-based `HugeiconsIcon` component.
 */
export function OgIcon({
  icon,
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  style,
}: {
  icon: unknown;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  const nodes = icon as IconNode;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
    >
      {nodes.map(([tag, attrs], index) => {
        const { key: _key, ...rest } = attrs;
        const props: Record<string, string | number> = {};
        for (const [name, value] of Object.entries(rest)) {
          props[name] = value === "currentColor" ? color : value;
        }
        if ("strokeWidth" in props) props.strokeWidth = strokeWidth;
        const Tag = tag as "path";
        return <Tag key={index} {...props} />;
      })}
    </svg>
  );
}
