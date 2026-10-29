/** The Budget mark: a square-cut £. Uses currentColor so it follows the theme. */
export function LogoMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M16.5 7.5A4.5 4.5 0 0 0 9 10.5V18M4.5 18H19.5M4.5 12H15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="butt" strokeLinejoin="miter" />
    </svg>
  );
}
