"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GerentePage() {
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);

  const [stores, setStores] = useState<any[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [commissionRules, setCommissionRules] = useState<any[]>([]);

  const mKey = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);

  const totalTarget = useMemo(() => Object.values(targets).reduce((a, b) => a + (b || 0), 0), [targets]);
  const totalAchieved = useMemo(() => Object.values(achieved).reduce((a, b) => a + (b || 0), 0), [achieved]);
  const totalPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("role").eq("id", sess.session.user.id).single();

      if (!prof || prof.role !== "gerente") {
        setRoleOk(false);
        setLoading(false);
        return;
      }

      setRoleOk(true);

      const { data: st } = await supabase.from("stores").select("id,name").order("id");
      setStores(st || []);

      const { data: rules } = await supabase.from("commission_rules").select("*").order("min_pct");
      setCommissionRules(rules || []);

      setLoading(false);
    })();
  }, []);

  async function loadMonthData() {
    const { data: t } = await supabase.from("store_targets").select("store_id,period,target_value").eq("month", mKey);
    const tMap: Record<string, number> = {};
    t?.forEach((r) => {
      tMap[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
    });
    setTargets(tMap);

    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString().slice(0, 10);
    const { data: s } = await supabase
      .from("sales")
      .select("store_id,period,amount")
      .gte("sale_date", mKey)
      .lt("sale_date", end);

    const aMap: Record<string, number> = {};
    s?.forEach((r) => {
      const k = `${r.store_id}_${r.period}`;
      aMap[k] = (aMap[k] || 0) + Number(r.amount || 0);
    });
    setAchieved(aMap);
  }

  useEffect(() => {
    if (roleOk) loadMonthData();
  }, [roleOk, mKey]);

  function statusColor(pct: number) {
    if (pct >= 130) return "bg-blue-100 text-blue-900 border-blue-200";
    if (pct >= 120) return "bg-purple-100 text-purple-900 border-purple-200";
    if (pct >= 100) return "bg-green-100 text-green-900 border-green-200";
    if (pct >= 80) return "bg-yellow-100 text-yellow-900 border-yellow-200";
    return "bg-red-100 text-red-900 border-red-200";
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (roleOk === false) return <div className="p-6">Acesso negado: apenas gerente.</div>;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard da Gerente</h1>
          <p className="opacity-70 text-sm">Metas por loja/período + total geral</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            className="border rounded-lg p-2"
            type="month"
            value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setMonth(new Date(y, m - 1, 1));
            }}
          />
          <button
            className="border rounded-lg px-3 py-2"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <section className={`border rounded-2xl p-4 ${statusColor(totalPct)}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">Total do mês</div>
            <div className="text-xl font-semibold">
              {totalAchieved.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {totalTarget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </div>
          <div className="text-sm">
            <b>{totalPct.toFixed(1)}%</b> do alvo
          </div>
        </div>
      </section>

      <section className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-2">Legenda</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <div className="border rounded-lg p-2 bg-red-100">Risco (&lt;80%)</div>
          <div className="border rounded-lg p-2 bg-yellow-100">Atenção (80–99%)</div>
          <div className="border rounded-lg p-2 bg-green-100">Meta (100–119%)</div>
          <div className="border rounded-lg p-2 bg-purple-100">Supermeta (120–129%)</div>
          <div className="border rounded-lg p-2 bg-blue-100">Megameta (130%+)</div>
        </div>
      </section>

      <section className="border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Metas por loja e período</h2>
        <div className="grid gap-3">
          {stores.map((st) => (
            <div key={st.id} className="border rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">{st.name}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {(["manha", "noite"] as const).map((period) => {
                  const key = `${st.id}_${period}`;
                  const t = Number(targets[key] || 0);
                  const a = Number(achieved[key] || 0);
                  const pct = t > 0 ? (a / t) * 100 : 0;
                  return (
                    <div key={key} className={`border rounded-2xl p-4 ${statusColor(pct)}`}>
                      <div className="flex justify-between">
                        <b>{period === "manha" ? "Manhã" : "Noite"}</b>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 text-sm">
                        <div><b>Realizado:</b> {a.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                        <div><b>Meta:</b> {t.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-2xl p-4">
        <h2 className="font-semibold mb-2">Regras de Comissão</h2>
        <ul className="space-y-1">
          {commissionRules.map((r) => (
            <li key={r.id} className="text-sm">
              {r.emoji} {r.label}: {r.percent.toFixed(2)}% a partir de {r.min_pct}% da meta
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
