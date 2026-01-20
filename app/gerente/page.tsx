"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
  const [roleOk, setRoleOk] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [stores, setStores] = useState<any[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [commissionRules, setCommissionRules] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const id = session.session?.user.id;
      if (!id) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();

      if (prof?.role !== "gerente") return;

      setRoleOk(true);

      const { data: st } = await supabase.from("stores").select("*").order("id");
      setStores(st || []);

      const { data: rules } = await supabase
        .from("commission_rules")
        .select("*")
        .order("min_pct");
      setCommissionRules(rules || []);
    })();
  }, []);

  useEffect(() => {
    if (!roleOk) return;
    loadData();
  }, [roleOk, month]);

  async function loadData() {
    const m = new Date(month + "-01");
    const next = new Date(m.getFullYear(), m.getMonth() + 1, 1).toISOString();
    const start = m.toISOString();

    const { data: metas } = await supabase
      .from("store_targets")
      .select("*")
      .eq("month", start);

    const tMap: Record<string, number> = {};
    metas?.forEach((t) => {
      tMap[`${t.store_id}_${t.period}`] = Number(t.target_value);
    });
    setTargets(tMap);

    const { data: vendas } = await supabase
      .from("sales")
      .select("store_id, period, amount, seller_id, profiles(name)")
      .gte("sale_date", start)
      .lt("sale_date", next);

    const aMap: Record<string, number> = {};
    vendas?.forEach((v) => {
      const k = `${v.store_id}_${v.period}`;
      aMap[k] = (aMap[k] || 0) + Number(v.amount);
    });
    setAchieved(aMap);

    const vendedores: Record<string, any> = {};
    vendas?.forEach((v) => {
      if (!vendedores[v.seller_id]) {
        vendedores[v.seller_id] = {
          nome: v.profiles?.name || "",
          total: 0,
        };
      }
      vendedores[v.seller_id].total += Number(v.amount);
    });

    const totalMetaMensal = Object.values(tMap).reduce((a, b) => a + b, 0);
    const porVendedora = totalMetaMensal / Object.keys(vendedores).length;

    const lista = Object.entries(vendedores).map(([id, obj]) => {
      const pct = porVendedora > 0 ? (obj.total / porVendedora) * 100 : 0;
      const regra = [...commissionRules].reverse().find((r) => pct >= r.min_pct);
      const comissao = regra ? obj.total * (regra.percent / 100) : 0;
      return {
        id,
        nome: obj.nome,
        vendido: obj.total,
        meta: porVendedora,
        pct,
        regra,
        comissao,
      };
    });

    setCommissions(lista);
  }

  async function updateRule(level: string, percent: number) {
    await supabase.from("commission_rules").update({ percent }).eq("level", level);
    loadData();
  }

  async function saveTargets() {
    const m = new Date(month + "-01").toISOString();
    const rows: any[] = [];

    for (const st of stores) {
      for (const period of ["manha", "noite"] as const) {
        const value = targets[`${st.id}_${period}`] || 0;
        rows.push({
          month: m,
          store_id: st.id,
          period,
          target_value: value,
        });
      }
    }

    const { error } = await supabase
      .from("store_targets")
      .upsert(rows, { onConflict: "month,store_id,period" });

    if (error) alert("Erro ao salvar metas: " + error.message);
    else alert("Metas salvas com sucesso!");
  }

  if (!roleOk) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Dashboard da Gerente</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <section className="border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold">Metas por loja e período</h2>
          <button
            className="bg-black text-white px-3 py-1 rounded"
            onClick={saveTargets}
          >
            Salvar metas
          </button>
        </div>
        <div className="grid gap-3">
          {stores.map((st) => (
            <div key={st.id} className="border rounded p-3">
              <div className="font-medium mb-2">{st.name}</div>
              <div className="grid md:grid-cols-2 gap-3">
                {["manha", "noite"].map((period) => {
                  const key = `${st.id}_${period}`;
                  const value = targets[key] || 0;
                  const a = achieved[key] || 0;
                  const pct = value > 0 ? (a / value) * 100 : 0;
                  return (
                    <div key={key} className={`rounded p-3 border ${statusColor(pct)}`}>
                      <div className="flex justify-between">
                        <span className="font-semibold">{period}</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="text-sm mt-2">
                        <div><b>Realizado:</b> {formatBRL(a)}</div>
                        <div><b>Meta:</b> {formatBRL(value)}</div>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setTargets((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                        className="w-full mt-2 border rounded px-2 py-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Regras de Comissão (%)</h2>
        <div className="grid gap-2">
          {commissionRules.map((r) => (
            <div key={r.level} className="flex items-center justify-between">
              <span>
                {r.level === "meta" && "✅ Meta"}
                {r.level === "supermeta" && "⭐ Supermeta"}
                {r.level === "megameta" && "🚀 Megameta"}
              </span>
              <input
                type="number"
                step="0.01"
                className="w-24 border rounded px-2 py-1 text-right"
                value={r.percent}
                onChange={(e) => updateRule(r.level, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Comissões por Vendedora</h2>
        <div className="grid gap-2">
          {commissions.map((c) => (
            <div key={c.id} className="border rounded p-3">
              <div className="flex justify-between">
                <span className="font-medium">{c.nome}</span>
                <span>{c.regra?.emoji || "❌"} {c.regra?.label || "Sem meta"}</span>
              </div>
              <div className="text-sm mt-2 space-y-1">
                <div><b>Meta:</b> {formatBRL(c.meta)}</div>
                <div><b>Vendido:</b> {formatBRL(c.vendido)}</div>
                <div><b>% Atingido:</b> {c.pct.toFixed(1)}%</div>
                <div><b>Comissão:</b> {formatBRL(c.comissao)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
