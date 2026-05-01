import { ArrowLeftRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRoleAuditRow } from "@/lib/admin-role-audit";

interface RoleAuditPanelProps {
  items: UserRoleAuditRow[];
}

export function RoleAuditPanel({ items }: RoleAuditPanelProps) {
  return (
    <Card className="tm-surface-strong border-white/10 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)]">
      <CardHeader className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="yt-overline text-[#8ff0ff]">Trazabilidad</p>
            <CardTitle className="mt-1 text-[16px] font-semibold text-[#f5f7fb]">Cambios recientes de rol</CardTitle>
            <p className="mt-1 text-sm text-[#aab2bc]">
              Historial persistido de las últimas modificaciones hechas desde la app.
            </p>
          </div>
          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[#d8dee6]">
            <History className="h-3 w-3" />
            <span>Últimos {items.length}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-5 pb-5 pt-5">
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center text-sm text-[#aab2bc]">
            Todavía no hay cambios de rol registrados.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-[#f5f7fb]">{item.target_display_name}</p>
                    <Badge variant="outline" className="border-white/10 bg-white/[0.05] text-[#d8dee6]">
                      <ArrowLeftRight className="h-3 w-3" />
                      <span>{item.previous_role} → {item.new_role}</span>
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-[#8f98a3]">
                    @{item.target_user_username} · {item.target_user_email}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#6f7781]">
                    Por @{item.changed_by_username} · {new Date(item.created_at).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
