"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GerentePage() {
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [month, setMonth] = useState(new Date());
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [rules, setRules] = useState<any[]>([]);

  const mKey = new Date(month.getFullYear(), month.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const totalTarget = useMemo(
    () => Object.values(targets).reduce((a, b) => a + (b || 0), 0),
    [targets]
  );
  const totalAchieved = useMemo(
    () => Object.values(achieved).reduce((a, b) => a + (b || 0), 0),
    [achieved]
  );
  const totalPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  function statusColor(pct: number) {
    if (pct >= 130) return "bg-blue-100 text-blue-900 border-blue-200";
    if (pct >= 120) return "bg-purple-100 text-purple-900 border-purple-200";
    if (pct >= 100) return "bg-green-100 text-green-900 border-green-200";
    if (pct >= 80) return "bg-yellow-100 text-yellow-900 border-yellow-200";
    return "bg-red-100 text-red-900 border-red-200";
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sess.session.user.id)
        .single();

      if (!prof || prof.role !== "gerente") {
        setRoleOk(false);
        setLoading(false);
        return;
      }

      setRoleOk(true);
      const { data: st } = await supabase.from("stores").select("id, name").order("id");
      setStores(st || []);
      const { data: r } = await supabase.from("commission_rules").select("*").order("min_pct");
      setRules(r || []);
      setLoading(false);
    })();
  }, []);

  async function loadMonthData() {
    const { data: t } = await supabase
      .from("store_targets")
      .select("store_id,period,target_value")
      .eq("month", mKey);

    const tMap: Record<string, number> = {};
    (t || []).forEach((r) => {
      tMap[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
    });
    setTargets(tMap);

    const start = mKey;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    const { data: s } = await supabase
      .from("sales")
      .select("store_id,period,amount")
      .gte("sale_date", start)
      .lt("sale_date", end);

    const aMap: Record<string, number> = {};
    (s || []).forEach((r) => {
      const k = `${r.store_id}_${r.period}`;
      aMap[k] = (aMap[k] || 0) + Number(r.amount || 0);
    });
    setAchieved(aMap);
  }

  useEffect(() => {
    if (roleOk) loadMonthData();
  }, [roleOk, mKey]);

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

    if (error) alert("Erro ao salvar metas: " + error.message);
    else alert("Metas salvas com sucesso!");
    await loadMonthData();
  }

  async function saveRules() {
    const { error } = await supabase.from("commission_rules").upsert(rules);
    if (error) alert("Erro ao salvar regras: " + error.message);
    else alert("Regras atualizadas!");
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (roleOk === false) return <div className="p-6">Acesso negado: apenas gerente.</div>;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard da Gerente</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setMonth(new Date(y, m - 1, 1));
            }}
            className="border rounded-lg p-2"
          />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="border rounded-lg px-3 py-2"
          >
            Sair
          </button>
        </div>
      </header>


      {/* Metas das vendedoras por loja */}
      <section className={`border rounded-2xl p-4 ${statusColor(totalPct)}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm opacity-80">Total do mês</div>
            <div className="text-xl font-semibold">
              {totalAchieved.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })} / {totalTarget.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
          <div className="text-sm">
            <span className="font-semibold">{totalPct.toFixed(1)}%</span> do alvo
          </div>
        </div>
      </section>

      <section className="border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Metas por loja</div>
          <button className="bg-black text-white rounded-lg px-3 py-2" onClick={saveTargets}>
            Salvar metas
          </button>
        </div>

        <div className="grid gap-3 mt-4">
          {stores.map((st) => (
            <div key={st.id} className="border rounded-xl p-4">
              <div className="text-lg font-semibold mb-2">{st.name}</div>
              <div className="grid md:grid-cols-2 gap-4">
                {["manha", "noite"].map((period) => {
                  const key = `${st.id}_${period}`;
                  const t = Number(targets[key] || 0);
                  const a = Number(achieved[key] || 0);
                  const pct = t > 0 ? (a / t) * 100 : 0;
                  return (
                    <div
                      key={period}
                      className={`border p-3 rounded-xl ${statusColor(pct)}`}
                    >
                      <div className="flex justify-between">
                        <div className="font-semibold">{period === "manha" ? "Manhã" : "Noite"}</div>
                        <div>{pct.toFixed(1)}%</div>
                      </div>
                      <div className="text-sm">
                        <div>
                          <b>Realizado:</b> R${" "}
                          {a.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <div>
                          <b>Meta:</b> R${" "}
                          <input
                            className="border rounded p-1 w-24"
                            type="number"
                            step="0.01"
                            value={t}
                            onChange={(e) =>
                              setTarget(st.id, period as "manha" | "noite", Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

{/* Detalhes por vendedora */}
<section className="border rounded-2xl p-4">
<h2 className="text-lg font-semibold mb-2">Detalhes por Vendedora</h2>
<p className="text-sm opacity-70 mb-4">Essa seção irá mostrar: dias trabalhados, folgas, faltas, total vendido, porcentagem da meta e comissão estimada para cada vendedora.</p>


{/* Placeholder visual temporário */}
<div className="p-4 border rounded-xl text-sm text-gray-500">
⚠️ Essa seção está aguardando dados das tabelas <code>seller_days</code>, <code>profiles</code> e <code>sales</code> para exibir os detalhes de cada vendedora.
</div>
</section>


{/* Regras de comissão no final */}
<section className="border p-4 rounded-xl space-y-3">
<div className="flex justify-between items-center">
<h2 className="font-semibold">Regras de Comissão (%)</h2>
<button
className="bg-black text-white px-3 py-1 rounded"
onClick={saveRules}
>
Salvar
</button>
</div>
<div className="grid gap-3">
{rules.map((r, i) => (
<div key={i} className="grid md:grid-cols-4 gap-3 text-sm items-center">
<input
className="border p-2 rounded"
placeholder="Emoji"
value={r.emoji || ""}
onChange={(e) => {
const val = e.target.value;
setRules((prev) => {
const copy = [...prev];
copy[i].emoji = val;
return copy;
});
}}
/>
<input
className="border p-2 rounded"
placeholder="Label"
value={r.label || ""}
onChange={(e) => {
const val = e.target.value;
setRules((prev) => {
const copy = [...prev];
copy[i].label = val;
return copy;
});
}}
/>
<input
className="border p-2 rounded"
placeholder="Mínimo %"
inputMode="decimal"
step="any"
value={r.min_pct?.toString().replace(".", ",") || ""}
onChange={(e) => {
const val = parseFloat(e.target.value.replace(",", "."));
setRules((prev) => {
const copy = [...prev];
copy[i].min_pct = isNaN(val) ? 0 : val;
return copy;
});
}}
/>
<input
className="border p-2 rounded"
placeholder="% Comissão"
inputMode="decimal"
step="any"
value={r.percent?.toString().replace(".", ",") || ""}
onChange={(e) => {
const val = parseFloat(e.target.value.replace(",", "."));
setRules((prev) => {
const copy = [...prev];
copy[i].percent = isNaN(val) ? 0 : val;
return copy;
});
}}
/>
</div>
))}
</div>
</section>
</main>
);
} // fim do componente
