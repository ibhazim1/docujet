/**
 * The amber "you're looking at sample/default data" banner.
 *
 * Originally lived only in `admin/leads/page.tsx`; extracted here once the
 * Settings page needed the identical shape for its own not-yet-configured
 * degrade path, so the two don't drift.
 */
type DemoNoticeProps = {
  title: string;
  reason: string;
  className?: string;
  children?: React.ReactNode;
};

export default function DemoNotice({
  title,
  reason,
  className = "",
  children,
}: DemoNoticeProps) {
  return (
    <div
      role="status"
      className={`rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 ${className}`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-2 leading-6">{reason}</p>
      {children ? <p className="mt-2 leading-6">{children}</p> : null}
    </div>
  );
}
