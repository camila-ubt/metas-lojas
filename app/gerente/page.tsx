"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Store = { id: number; name: string };

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

export default function GerentePage() {
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});

  const mKey = monthKey(month);

  const totalTarget = useMemo(
    () => Object.values(targets).reduce((a, b) => a + (b || 0), 0),
    [targets]
  );
  const totalAchieved = useMemo(
    () => Object.values(achieved).reduce((a, b) => a + (b || 0), 0),
    [achieved]
  );
  const totalPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof, error: pe } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sess.session.user.id)
        .single();

      if (pe || !prof || prof.role !== "gerente") {
        setRoleOk(false);
        setLoading(false);
        return;
      }
      setRoleOk(true);

      const { data: st } = await supabase.from("stores").select("id,name").order("id");
      setStores((st as Store[]) || []);

      setLoading(false);
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

    const start = mKey;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    const { data: s } = await supabase
      .from("sales")
      .select("store_id,period,amount,sale_date")
      .gte("sale_date", start)
      .lt("sale_date", end);

    const aMap: Record<string, number> = {};
    (s as any[] | null)?.forEach((r) => {
      const k = `${r.store_id}_${r.period}`;
      aMap[k] = (aMap[k] || 0) + Number(r.amount || 0);
    });
    setAchieved(aMap);
  }

  useEffect(() => {
    if (roleOk) loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (error) alert(error.message);
    else alert("Metas salvas!");
    await loadMonthData();
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (roleOk === false) return <div className="p-6">Acesso negado: apenas gerente.</div>;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard da Gerente</h1>
          <p className="opacity-70 text-sm">Metas por loja/período + total (3 lojas).</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm opacity-80">Total do mês (3 lojas)</div>
            <div className="text-xl font-semibold">
              {formatBRL(totalAchieved)} / {formatBRL(totalTarget)}
            </div>
          </div>
          <div className="text-sm">
            <span className="font-semibold">{totalPct.toFixed(1)}%</span> do alvo
          </div>
        </div>
      </section>

      <section className="border rounded-2xl p-4">
        <div className="font-semibold mb-2">Legenda</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <div className="border rounded-lg p-2 bg-red-100">Risco (&lt;80%)</div>
          <div className="border rounded-lg p-2 bg-yellow-100">Atenção (80–99%)</div>
          <div className="border rounded-lg p-2 bg-green-100">Meta (100–119%)</div>
          <div className="border rounded-lg p-2 bg-purple-100">Supermeta (120–129%)</div>
          <div className="border rounded-lg p-2 bg-blue-100">Megameta (130%+)</div>
        </div>
      </section>

      <section className="border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Metas por loja e período</div>
          <button className="bg-black text-white rounded-lg px-3 py-2" onClick={saveTargets}>
            Salvar metas
          </button>
        </div>

        <div className="text-sm opacity-70">
          (MVP) meta diária = <b>meta mensal ÷ {daysInMonth(month)} dias</b>.
        </div>

        <div className="grid gap-3">
          {stores.map((st) => {
            const blocks = (["manha", "noite"] as const).map((period) => {
              const key = `${st.id}_${period}`;
              const t = Number(targets[key] || 0);
              const a = Number(achieved[key] || 0);
              const pct = t > 0 ? (a / t) * 100 : 0;
              const daily = t / daysInMonth(month);

              return (
                <div key={key} className={`border rounded-2xl p-4 ${statusColor(pct)}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{period === "manha" ? "Manhã" : "Noite"}</div>
                    <div className="text-sm opacity-80">{pct.toFixed(1)}%</div>
                  </div>

                  <div className="mt-2 text-sm">
                    <div><b>Realizado:</b> {formatBRL(a)}</div>
                    <div><b>Meta:</b> {formatBRL(t)} <span className="opacity-70">(≈ {formatBRL(daily)}/dia)</span></div>
                  </div>

                  <div className="mt-3">
                    <label className="text-sm block mb-1">Editar meta mensal</label>
                    <input
                      className="w-full border rounded-lg p-2"
                      type="number"
                      step="0.01"
                      value={Number.isFinite(t) ? t : 0}
                      onChange={(e) => setTarget(st.id, period, Number(e.target.value || 0))}
                    />
                  </div>
                </div>
              );
            });

            return (
              <div key={st.id} className="border rounded-2xl p-4">
                <div className="text-lg font-semibold mb-3">{st.name}</div>
                <div className="grid md:grid-cols-2 gap-3">{blocks}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
