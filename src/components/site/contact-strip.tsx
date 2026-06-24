import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { APP_EMAILS, type AppEmailKey } from "@/lib/app-emails";
import { cn } from "@/lib/utils";

export interface ContactStripProps {
  title?: string;
  description?: string;
  items?: Array<{ label: string; email: AppEmailKey }>;
  tone?: "dark" | "light";
  className?: string;
}

const defaultItems: Array<{ label: string; email: AppEmailKey }> = [
  { label: "General", email: "hello" },
  { label: "Marketing", email: "marketing" },
  { label: "Soporte", email: "support" },
];

const toneClasses: Record<NonNullable<ContactStripProps["tone"]>, string> = {
  dark: "border-white/10 bg-[#0c1014] text-white shadow-[0_28px_80px_-56px_rgba(0,0,0,0.95)]",
  light: "border-[#d7dce4] bg-white text-[#111827] shadow-[0_18px_40px_-28px_rgba(17,24,39,0.18)]",
};

const toneTextClasses: Record<NonNullable<ContactStripProps["tone"]>, string> = {
  dark: "text-white/60",
  light: "text-[#64748b]",
};

const toneButtonClasses: Record<NonNullable<ContactStripProps["tone"]>, string> = {
  dark: "border-white/10 bg-white/[0.035] text-white hover:bg-white/[0.07]",
  light: "border-[#d7dce4] bg-[#f8fafc] text-[#111827] hover:bg-white",
};

export function ContactStrip({
  title = "Contacto",
  description,
  items = defaultItems,
  tone = "dark",
  className,
}: ContactStripProps) {
  const resolvedItems = items.length > 0 ? items : defaultItems;
  const detailByLabel: Record<string, string> = {
    General: "Propuestas de negocios",
    Marketing: "problemas en la plataforma",
    Soporte: "Preguntas generales",
  };

  return (
    <section className={cn("relative mt-8 overflow-hidden rounded-[28px] border p-6 sm:p-7 lg:p-8", toneClasses[tone], className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,90,61,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(255,255,255,0.05),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ff5a3d]">{title}</p>
          <h2 className={cn("mt-3 max-w-[12ch] text-[34px] font-extrabold leading-[1.02] tracking-[-0.05em] sm:text-[42px]", tone === "dark" ? "text-white" : "text-[#111827]")}>
            Hablemos directo.
          </h2>
          {description ? <p className={cn("mt-4 max-w-[58ch] text-sm leading-6 sm:text-[15px] sm:leading-7", toneTextClasses[tone])}>{description}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:justify-self-end">
          {resolvedItems.map((item) => {
            const email = APP_EMAILS[item.email];
            return (
              <a
                key={item.email}
                href={`mailto:${email}`}
                className={cn(
                  "group flex min-h-[84px] flex-col justify-between rounded-[18px] border px-4 py-4 text-left transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  toneButtonClasses[tone]
                )}
              >
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff5a3d]">
                  <EnvelopeSimple size={15} weight="bold" />
                  {item.label}
                </span>
                <span className={cn("text-[12px] font-medium tracking-normal", tone === "dark" ? "text-white/88" : "text-[#111827]")}>
                  {email}
                </span>
                <span className={cn("text-[11px] leading-5", toneTextClasses[tone])}>{detailByLabel[item.label] ?? "Contacto directo"}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
