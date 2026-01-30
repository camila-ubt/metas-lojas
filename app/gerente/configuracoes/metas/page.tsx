// app/gerente/configuracoes/metas/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function monthKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function statusColor(pct: number) {
  if (pct >= 130) return "bg-blue-100 text-blue-900 border-blue-200";
  if (pct >= 120) return "bg-purple-100 text-purple-900 border-purple-200";
  if (pct >= 100) return "bg-green-100 text-green-900 border-green-200";
  if (pct >= 80) return "bg-yellow-100 text-yellow-900 border-yellow-200";
  return "bg-red-100 text-red-900 border-red-200";
}

type Store = { id: number; name: string };

export default function MetasPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [month, setMonth] = useState(new Date());
  const [targets, setTargets] = useState<Record<string, number>>({});

  const mKey = monthKey(month);

  useEffect(() => {
    (async () => {
      const { data: st } = await supabase.from("stores").select("id,name").order("id");
      setStores((st as Store[]) || []);
    })();
  }, []);

  async function loadMonthData() {
    const { data: t } = await supabase
      .from("store_targets")
      .select("store_id,period,target_value")
      .eq("month", mKey);

    const tMap: Record<string, number> = {};
    (t as any[] | null)?.forEach((r) => {
      tMap[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
    });
    setTargets(tMap);
  }

  useEffect(() => {
    loadMonthData();
  }, [mKey]);

  function setTarget(storeId: number, period: "manha" | "noite", value: number) {
    setTargets((prev) => ({ ...prev, [`${storeId}_${period}`]: value }));
  }

  async function saveTargets() {
    const rows: any[] = [];
    for (const st of stores) {
      for (const period of ["manha", "noite"] as const) {
        const v = Number(targets[`${st.id}_${period}`] || 0);
        rows.push({ month: mKey, store_id: st.id, period, target_value: v });
      }
    }
    const { error } = await supabase
      .from("store_targets")
      .upsert(rows, { onConflict: "month,store_id,period" });

    if (error) alert(error.message);
    else alert("Metas salvas!");
    await loadMonthData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <input
          className="border rounded-lg p-2"
          type="month"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setMonth(new Date(y, m - 1, 1));
          }}
        />
        <button onClick={saveTargets} className="bg-black text-white rounded px-4 py-2">
          Salvar metas
        </button>
      </div>

      <div className="grid gap-4">
        {stores.map((st) => (
          <div key={st.id} className="border rounded-xl p-4 space-y-2">
            <h2 className="font-semibold text-lg">{st.name}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {(["manha", "noite"] as const).map((period) => {
                const key = `${st.id}_${period}`;
                const value = Number(targets[key] || 0);
                return (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium block">
                      {period === "manha" ? "Manhã" : "Noite"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded p-2 w-full"
                      value={value}
                      onChange={(e) => setTarget(st.id, period, Number(e.target.value || 0))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
