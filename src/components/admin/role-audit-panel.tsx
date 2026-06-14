import Link from "next/link";
import { ArrowLeftRight, History, Download, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRoleAuditRow } from "@/lib/admin-role-audit";

interface RoleAuditPanelProps {
  items: UserRoleAuditRow[];
}

export function RoleAuditPanel({ items }: RoleAuditPanelProps) {
  return (
    <Card className="tm-surface-strong border-white/10 shadow-[0_24px_100px_-56px_rgba(0,0,0,0.9)] bg-white/[0.01] backdrop-blur-md transition-all duration-300 hover:border-white/15">
      <CardHeader className="border-b border-white/10 px-5 pb-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="tym-overline text-[#8ff0ff] flex items-center gap-1.5">
              <History size={14} className="text-[#8ff0ff]" />
              Trazabilidad
            </p>
            <CardTitle className="mt-1 text-[16px] font-semibold text-[#f5f7fb]">Cambios recientes de rol</CardTitle>
            <p className="mt-1 text-sm text-[#aab2bc]">
              Historial persistido de las últimas modificaciones hechas desde la app.
            </p>
          </div>
          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-[#d8dee6] flex items-center gap-1">
            <History size={12} />
            <span>Últimos {items.length}</span>
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/api/admin/user-role-audit/export"
            className="tym-btn-secondary inline-flex items-center gap-1.5 text-[11px] font-semibold h-8 px-3 rounded-lg border border-white/10 bg-white/[0.03] text-[#d8dee6] hover:bg-white/[0.07] hover:text-white transition-all"
          >
            <Download size={13} />
            Exportar CSV
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-5 pb-5 pt-5">
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center text-sm text-[#aab2bc]">
            Todavía no hay cambios de rol registrados.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group rounded-[1.35rem] border border-white/5 bg-white/[0.02] px-4 py-4 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/[0.04] p-1.5 text-zinc-400 group-hover:text-white transition-colors">
                  <UserCircle2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-[#f5f7fb] group-hover:text-white transition-colors">
                      {item.target_display_name}
                    </p>
                    <Badge variant="outline" className="border-white/5 bg-white/[0.04] text-[10px] text-[#b8c0cb] flex items-center gap-1">
                      <ArrowLeftRight size={10} />
                      <span>
                        {item.previous_role} → {item.new_role}
                      </span>
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-[#8f98a3]">
                    @{item.target_user_username} · {item.target_user_email}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px] font-mono text-[#6f7781]">
                    <span>Por @{item.changed_by_username}</span>
                    <span>{new Date(item.created_at).toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
