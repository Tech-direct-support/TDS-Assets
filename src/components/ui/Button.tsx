import Link from "next/link";

const VARIANT_CLASSES = {
  primary: "bg-red text-white border-red hover:bg-red-dark",
  dark: "bg-black text-white border-black hover:bg-ink",
  outline: "bg-white text-ink border-line-strong hover:border-black",
  ghost: "bg-transparent text-ink border-transparent hover:bg-surface-sunken",
} as const;

type Variant = keyof typeof VARIANT_CLASSES;

const base =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[3px] border text-[13px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "outline",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "outline",
  className = "",
  href,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link href={href} className={`${base} ${VARIANT_CLASSES[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
