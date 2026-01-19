"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Store = { id: number; name: string };

type CommissionRule = {
  level: "meta" | "supermeta" | "megameta";
  min_pct: number;
  percent: number;
};

function monthKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

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

function commissionLabel(pct: number) {
  if (pct >= 130) return { icon: "🚀", label: "Megameta" };
  if (pct >= 120) return { icon: "⭐", label: "Supermeta" };
  if (pct >= 100) return { icon: "✅", label: "Meta" };
  return { icon: "❌", label: "Sem meta" };
}

export default function GerentePage() {
  const [loading, setLoading] = useState(true);
  const [roleOk, setRoleOk] = useState<boolean | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});

  const [sellerDays, setSellerDays] = useState<
    {
      seller_id: string;
      name: string;
      folgas: number;
      faltas: number;
      trabalhados: number;
    }[]
  >([]);

  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);

  const [sellerTargets, setSellerTargets] = useState<
    {
      seller_id: string;
      name: string;
      meta: number;
      realizado: number;
      pct: number;
      commission: number;
      commissionPct: number;
      level: { icon: string; label: string };
    }[]
  >([]);

  const mKey = monthKey(month);
  const diasMes = daysInMonth(month);

  // 🔒 Proteção
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return (window.location.href = "/");

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

      const { data: st } = await supabase
        .from("stores")
        .select("id,name")
        .order("id");

      setStores((st as Store[]) || []);
      setLoading(false);
    })();
  }, []);

  // 📊 Carregar dados
  async function loadMonthData() {
    const start = mKey;
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    // regras de comissão
    const { data: cr } = await supabase
      .from("commission_rules")
      .select("*")
      .order("min_pct");

    setCommissionRules((cr as CommissionRule[]) || []);

    // metas
    const { data: t } = await supabase
      .from("store_targets")
      .select("store_id,period,target_value")
      .eq("month", mKey);

    const tMap: Record<string, number> = {};
    (t as any[] | null)?.forEach((r) => {
      tMap[`${r.store_id}_${r.period}`] = Number(r.target_value || 0);
    });
    setTargets(tMap);

    // vendas
    const { data: s } = await supabase
      .from("sales")
      .select("seller_id,store_id,period,amount")
      .gte("sale_date", start)
      .lt("sale_date", end);

    const aMap: Record<string, number> = {};
    (s as any[] | null)?.forEach((r) => {
      const k = `${r.store_id}_${r.period}`;
      aMap[k] = (aMap[k] || 0) + Number(r.amount || 0);
    });
    setAchieved(aMap);

    // dias
    const { data: sd } = await supabase
      .from("seller_days")
      .select("seller_id,status,profiles(name)")
      .gte("day", start)
      .lt("day", end);

    const dayMap: Record<
      string,
      { name: string; folgas: number; faltas: number }
    > = {};

    (sd as any[] | null)?.forEach((r) => {
      const id = r.seller_id;
      if (!dayMap[id]) {
        dayMap[id] = {
          name: r.profiles?.name || "Vendedora",
          folgas: 0,
          faltas: 0,
        };
      }
      if (r.status === "folga") dayMap[id].folgas++;
      if (r.status === "falta") dayMap[id].faltas++;
    });

    const sellersArr = Object.entries(dayMap).map(([seller_id, v]) => ({
      seller_id,
      name: v.name,
      folgas: v.folgas,
      faltas: v.faltas,
      trabalhados: Math.max(diasMes - v.folgas - v.faltas, 0),
    }));

    setSellerDays(sellersArr);

    // 🎯 comissão
    const sellerCalc: Record<
      string,
      { name: string; dias: number; meta: number; realizado: number }
    > = {};

    sellersArr.forEach((s) => {
      sellerCalc[s.seller_id] = {
        name: s.name,
        dias: s.trabalhados,
        meta: 0,
        realizado: 0,
      };
    });

    (s as any[] | null)?.forEach((sale) => {
      if (sellerCalc[sale.seller_id]) {
        sellerCalc[sale.seller_id].realizado += Number(sale.amount || 0);
      }
    });

    for (const sellerId in sellerCalc) {
      let meta = 0;
      for (const st of stores) {
        for (const period of ["manha", "noite"] as const) {
          const metaMensal =
            tMap[`${st.id}_${period}`] || 0;
          meta += (metaMensal / diasMes) * sellerCalc[sellerId].dias;
        }
      }
      sellerCalc[sellerId].meta = meta;
    }

    setSellerTargets(
      Object.entries(sellerCalc).map(([id, v]) => {
        const pct = v.meta > 0 ? (v.realizado / v.meta) * 100 : 0;

        const rule =
          commissionRules
            .slice()
            .reverse()
            .find((r) => pct >= r.min_pct) || null;

        const percent = rule ? rule.percent : 0;
        const commission = v.realizado * (percent / 100);

        return {
          seller_id: id,
          name: v.name,
          meta: v.meta,
          realizado: v.realizado,
          pct,
          commission,
          commissionPct: percent,
          level: commissionLabel(pct),
        };
      })
    );
  }

  useEffect(() => {
    if (roleOk) loadMonthData();
  }, [roleOk, mKey]);

  async function saveCommissionRule(
    level: string,
    percent: number
  ) {
    await supabase
      .from("commission_rules")
      .update({ percent })
      .eq("level", level);

    await loadMonthData();
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (roleOk === false) return <div className="p-6">Acesso negado</div>;

  return (
    <main className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard da Gerente</h1>

      {/* 🔧 REGRAS DE COMISSÃO */}
      <section className="border rounded-2xl p-4">
        <div className="font-semibold mb-2">Regras de comissão (%)</div>

        <div className="grid gap-2 text-sm">
          {commissionRules.map((r) => (
            <div
              key={r.level}
              className="flex items-center justify-between border rounded-lg p-2"
            >
              <span>
                {r.level === "meta" && "✅ Meta"}
                {r.level === "supermeta" && "⭐ Supermeta"}
                {r.level === "megameta" && "🚀 Megameta"}
              </span>

              <input
                type="number"
                step="0.1"
                className="w-20 border rounded p-1 text-right"
                value={r.percent}
                onChange={(e) =>
                  saveCommissionRule(r.level, Number(e.target.value))
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* 💰 COMISSÃO */}
      <section className="border rounded-2xl p-4">
        <div className="font-semibold mb-2">Comissão por vendedora</div>

        <div className="grid gap-2 text-sm">
          {sellerTargets.map((s) => (
            <div
              key={s.seller_id}
              className={`border rounded-lg p-2 ${statusColor(
                s.pct
              )}`}
            >
              <div className="font-medium">{s.name}</div>
              <div className="mt-1">
                <div><b>Meta:</b> {formatBRL(s.meta)}</div>
                <div><b>Realizado:</b> {formatBRL(s.realizado)}</div>
                <div><b>Atingimento:</b> {s.pct.toFixed(1)}%</div>
                <div>
                  <b>Comissão:</b>{" "}
                  {s.level.icon} {s.level.label} —{" "}
                  {s.commissionPct}% → {formatBRL(s.commission)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
