export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`bg-white border border-line rounded-[3px] ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  description,
}: {
  title: string;
  action?: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {description && <p className="text-[12px] text-ink-soft mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}
