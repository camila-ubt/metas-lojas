"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Linha = {
  store_id: number;
  store_name: string;
  period: "manha" | "noite";
  meta: number;
  vendido: number;
};

// ✅ meses com nome
const meses = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

// 🎯 regras de meta
const SUPER_META_MULT = 1.2; // +20%
const MEGA_META_MULT = 1.3;  // +30%

function calcularFalta(meta: number, vendido: number, mult = 1) {
  const alvo = meta * mult;
  return Math.max(alvo - vendido, 0);
}

function calcularStatus(meta: number, vendido: number) {
  if (vendido >= meta * MEGA_META_MULT) return "mega";
  if (vendido >= meta * SUPER_META_MULT) return "super";
  if (vendido >= meta) return "meta";
  return "abaixo";
}

export default function AcompanhamentoGerentePage() {
  const hoje = new Date();

  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const [year, setYear] = useState(hoje.getFullYear());
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<Linha[]>([]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function carregar() {
    setLoading(true);

    // 🔐 valida gerente
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return (window.location.href = "/");

    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!perfil || !perfil.role.startsWith("gerente")) {
      window.location.href = "/";
      return;
    }

    // 🏬 lojas
    const { data: lojas } = await supabase
      .from("stores")
      .select("id, name")
      .order("id");

    // 🎯 metas
    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("month", month)
      .eq("year", year);

    // 💰 vendas
    const inicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const fim = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: vendas } = await supabase
      .from("sales")
      .select("store_id, period, amount")
      .gte("sale_date", inicio)
      .lte("sale_date", fim);

    const linhas: Linha[] = [];

    for (const loja of lojas || []) {
      for (const period of ["manha", "noite"] as const) {
        const meta =
          metas?.find(
            (m) => m.store_id === loja.id && m.period === period
          )?.goal_value || 0;

        const vendido =
          vendas
            ?.filter(
              (v) => v.store_id === loja.id && v.period === period
            )
            .reduce((s, v) => s + Number(v.amount), 0) || 0;

        linhas.push({
          store_id: loja.id,
          store_name: loja.name,
          period,
          meta,
          vendido,
        });
      }
    }

    setDados(linhas);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Carregando…</div>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Acompanhamento de Metas</h1>

      {/* 🎛️ FILTROS */}
      <div className="flex gap-3 items-center">
        <select
          className="border rounded p-2"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* 📊 TABELA */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Loja</th>
            <th className="border p-2">Período</th>
            <th className="border p-2 text-right">Meta</th>
            <th className="border p-2 text-right">Vendido</th>
            <th className="border p-2 text-right">Falta Meta</th>
            <th className="border p-2 text-right">Falta Super</th>
            <th className="border p-2 text-right">Falta Mega</th>
            <th className="border p-2 text-right">Status</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((d, i) => {
            const faltaMeta = calcularFalta(d.meta, d.vendido);
            const faltaSuper = calcularFalta(d.meta, d.vendido, SUPER_META_MULT);
            const faltaMega = calcularFalta(d.meta, d.vendido, MEGA_META_MULT);
            const status = calcularStatus(d.meta, d.vendido);

            return (
              <tr key={i}>
                <td className="border p-2">
                  <Link
                    href={`/gerente/acompanhamento/loja/${d.store_id}?month=${month}&year=${year}`}
                    className="text-brand-turquoise font-medium hover:text-brand-turquoiseDark transition-colors"
                  >
                    {d.store_name}
                  </Link>
                </td>

                <td className="border p-2 capitalize">
                  <Link
                    href={`/gerente/acompanhamento/periodo/${d.period}?month=${month}&year=${year}`}
                    className="text-brand-turquoise font-medium hover:text-brand-turquoiseDark transition-colors"
                  >
                    {d.period}
                  </Link>
                </td>

                <td className="border p-2 text-right">
                  R$ {d.meta.toLocaleString("pt-BR")}
                </td>

                <td className="border p-2 text-right">
                  R$ {d.vendido.toLocaleString("pt-BR")}
                </td>

                <td className="border p-2 text-right">
                  {faltaMeta === 0
                    ? <span className="text-brand-turquoise font-medium">Batida</span>
                    : `R$ ${faltaMeta.toLocaleString("pt-BR")}`}
                </td>

                <td className="border p-2 text-right">
                  {faltaSuper === 0
                    ? <span className="text-brand-turquoise font-medium">Batida</span>
                    : `R$ ${faltaSuper.toLocaleString("pt-BR")}`}
                </td>

                <td className="border p-2 text-right">
                  {faltaMega === 0
                    ? <span className="text-brand-turquoise font-medium">Batida</span>
                    : `R$ ${faltaMega.toLocaleString("pt-BR")}`}
                </td>

                <td className="border p-2 text-right font-medium">
                  {status === "mega" && "👑 Mega"}
                  {status === "super" && "🚀 Super"}
                  {status === "meta" && "🎯 Meta"}
                  {status === "abaixo" && "Em progresso"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
