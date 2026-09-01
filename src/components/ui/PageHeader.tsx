export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 md:px-6 pt-5 pb-4 flex-wrap">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
        {description && <p className="text-[13px] text-ink-soft mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
