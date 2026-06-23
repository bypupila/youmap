import { Mail } from "lucide-react";
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
  dark: "border-white/10 bg-white/[0.03] text-white",
  light: "border-[#d7dce4] bg-white text-[#111827]",
};

const toneTextClasses: Record<NonNullable<ContactStripProps["tone"]>, string> = {
  dark: "text-white/55",
  light: "text-[#64748b]",
};

const toneButtonClasses: Record<NonNullable<ContactStripProps["tone"]>, string> = {
  dark: "border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.08]",
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

  return (
    <section className={cn("mt-8 border-t pt-5", toneClasses[tone], className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn("text-[11px] font-bold uppercase tracking-[0.22em]", tone === "dark" ? "text-[#ff5a3d]" : "text-[#ff5a3d]")}>{title}</p>
          {description ? <p className={cn("mt-2 max-w-[58ch] text-sm leading-6", toneTextClasses[tone])}>{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {resolvedItems.map((item) => {
            const email = APP_EMAILS[item.email];
            return (
              <a
                key={item.email}
                href={`mailto:${email}`}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[12px] font-bold transition",
                  toneButtonClasses[tone]
                )}
              >
                <Mail className="size-3.5" />
                <span>{item.label}</span>
                <span className={cn("font-normal normal-case tracking-normal", tone === "dark" ? "text-white/55" : "text-[#64748b]")}>
                  {email}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
