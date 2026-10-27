/** Inline PM mark (from public/favicon-pm.svg) for screens that can't load assets. */
export const PM_LOGO_SVG =
  '<svg width="100%" height="100%" aria-hidden="true" focusable="false" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><g><path d="M1045,158.925l-0,762.15c-0,68.396 -55.529,123.925 -123.925,123.925l-762.15,0c-68.396,0 -123.925,-55.529 -123.925,-123.925l-0,-762.15c-0,-68.396 55.529,-123.925 123.925,-123.925l762.15,-0c68.396,-0 123.925,55.529 123.925,123.925Z"/><path d="M1040,162.698l-0,754.604c-0,67.719 -54.979,122.698 -122.698,122.698l-754.604,0c-67.719,0 -122.698,-54.979 -122.698,-122.698l0,-754.604c0,-67.719 54.979,-122.698 122.698,-122.698l754.604,0c67.719,0 122.698,54.979 122.698,122.698Z" style="fill:#d2d2d2;"/></g><path d="M1017.33,144.5l0,791l-179.795,0l0,-534.011l-71.82,534.011l-127.518,0l-75.728,-521.796l-0,521.796l-179.795,0l-0,-791l266.272,-0c7.817,47.549 16.123,103.606 24.917,168.168l28.338,201.193l46.903,-369.361l268.226,-0Z" style="fill:#006f87;fill-rule:nonzero;"/><path d="M266.543,811.768l0,-248.021l158.84,-0c169.393,-0 273.351,-80.739 273.351,-213.721c0,-128.232 -109.235,-205.805 -288.655,-205.805l-348.813,-0l-0,41.161c71.768,4.749 92.876,23.219 92.876,82.85l0,543.536c0,59.631 -21.108,78.101 -92.876,82.85l-0,41.161l298.153,0l0,-41.161c-71.767,-4.749 -92.876,-23.219 -92.876,-82.85Zm0,-301.32l0,-312.929l111.346,0c130.343,0 201.584,56.992 201.584,160.95c-0,108.708 -53.826,151.979 -188.919,151.979l-124.011,0Z" style="fill-rule:nonzero;"/></svg>';

export function PmLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: PM_LOGO_SVG }}
    />
  );
}
