// app/gerente/configuracoes/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function formatPercent(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "%";
}

export default function ConfiguracoesPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [stores, setStores] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  const totalTarget = useMemo(
    () => Object.values(targets).reduce((a, b) => a + (b || 0), 0),
    [targets]
  );

  useEffect(() => {
    (async () => {
      const { data: st } = await supabase.from("stores").select("id, name").order("id");
      setStores(st || []);

      const { data: r } = await supabase.from("commission_rules").select("id, level, min_pct, percent, emoji, label").order("min_pct");
      setRules(r || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const start = new Date(month);
      const mKey = new Date(start.getFullYear(), start.getMonth(), 1).toISOString().slice(0, 10);

      const { data: t } = await supabase
        .from("store_targets")
        .select("store_id, period, target_value")
        .eq("month", mKey);

      const map: Record<string, number> = {};
      (t || []).forEach((r) => {
        map[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
      });
      setTargets(map);
    })();
  }, [month]);

  function setTarget(storeId: number, period: "manha" | "noite", value: number) {
    setTargets((prev) => ({ ...prev, [`${storeId}_${period}`]: value }));
  }

  async function saveTargets() {
    const start = new Date(month);
    const mKey = new Date(start.getFullYear(), start.getMonth(), 1).toISOString().slice(0, 10);

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

    if (error) alert("Erro ao salvar metas: " + error.message);
    else alert("Metas salvas com sucesso!");
  }

  function setRuleField(ruleId: number, field: string, value: string) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, [field]: field === "percent" || field === "min_pct" ? parseFloat(value) : value } : r
      )
    );
  }

  async function saveRules() {
    const { error } = await supabase.from("commission_rules").upsert(rules, {
      onConflict: "id",
    });

    if (error) alert("Erro ao salvar regras: " + error.message);
    else alert("Regras salvas com sucesso!");
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <section className="border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Metas por Loja e Turno</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="grid gap-3">
          {stores.map((st) => (
            <div key={st.id} className="border rounded-xl p-4">
              <h3 className="font-semibold text-lg mb-2">{st.name}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {(["manha", "noite"] as const).map((period) => {
                  const key = `${st.id}_${period}`;
                  const value = targets[key] || 0;
                  return (
                    <div key={key} className="space-y-2">
                      <label className="block text-sm font-medium">
                        Meta {period === "manha" ? "Manhã" : "Noite"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full border rounded p-2"
                        value={value}
                        onChange={(e) => setTarget(st.id, period, Number(e.target.value))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button className="bg-black text-white rounded-lg px-4 py-2" onClick={saveTargets}>
          Salvar Metas
        </button>
      </section>

      <section className="border rounded-xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">Regras de Comissão</h2>
        <div className="grid gap-4">
          {rules.map((r) => (
            <div key={r.id} className="grid md:grid-cols-5 gap-2 items-center">
              <input
                className="border rounded p-2"
                value={r.emoji || ""}
                placeholder="Emoji"
                onChange={(e) => setRuleField(r.id, "emoji", e.target.value)}
              />
              <input
                className="border rounded p-2"
                value={r.label || ""}
                placeholder="Descrição"
                onChange={(e) => setRuleField(r.id, "label", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                className="border rounded p-2"
                value={r.min_pct || 0}
                placeholder="Mínimo (%)"
                onChange={(e) => setRuleField(r.id, "min_pct", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                className="border rounded p-2"
                value={r.percent || 0}
                placeholder="Comissão (%)"
                onChange={(e) => setRuleField(r.id, "percent", e.target.value)}
              />
              <div className="text-sm opacity-70">
                {formatPercent(r.percent || 0)} de comissão para metas ≥ {formatPercent(r.min_pct || 0)}
              </div>
            </div>
          ))}
        </div>
        <button className="bg-black text-white rounded-lg px-4 py-2" onClick={saveRules}>
          Salvar Regras
        </button>
      </section>
    </main>
  );
}
