"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LojaResumo = {
  store_id: number;
  store_name: string;
  period: "manha" | "noite";
  meta: number;
  vendido: number;
};

export default function AcompanhamentoGerentePage() {
  const hoje = new Date();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [month, setMonth] = useState<number>(hoje.getMonth() + 1);
  const [year, setYear] = useState<number>(hoje.getFullYear());

  const [dados, setDados] = useState<LojaResumo[]>([]);

  // 🔐 valida gerente + carrega dados
  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function carregarDados() {
    setLoading(true);
    setErro("");

    // 🔐 sessão
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;

    if (!userId) {
      window.location.href = "/";
      return;
    }

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

    if (!lojas) return;

    // 🎯 metas
    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("year", year)
      .eq("month", month);

    // 💰 vendas
    const inicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const fim = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: vendas } = await supabase
      .from("sales")
      .select("store_id, period, amount")
      .gte("sale_date", inicio)
      .lte("sale_date", fim);

    // 🔄 consolidar
    const resultado: LojaResumo[] = [];

    for (const loja of lojas) {
      for (const periodo of ["manha", "noite"] as const) {
        const meta =
          metas?.find(
            (m) =>
              m.store_id === loja.id &&
              m.period === periodo &&
              m.year === year &&
              m.month === month
          )?.goal_value || 0;

        const vendido =
          vendas
            ?.filter(
              (v) =>
                v.store_id === loja.id && v.period === periodo
            )
            .reduce((s, v) => s + Number(v.amount), 0) || 0;

        resultado.push({
          store_id: loja.id,
          store_name: loja.name,
          period: periodo,
          meta,
          vendido,
        });
      }
    }

    setDados(resultado);
    setLoading(false);
  }

  if (loading) return <div className="p-6">Carregando…</div>;
  if (erro) return <div className="p-6 text-red-600">{erro}</div>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Acompanhamento de Metas</h1>

      {/* 🎛️ FILTRO */}
      <div className="flex gap-3 items-center">
        <select
          className="border rounded p-2"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
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

        <button
          className="bg-black text-white rounded px-4 py-2"
          onClick={carregarDados}
        >
          Aplicar
        </button>
      </div>

      {/* 📊 TABELA */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Loja</th>
            <th className="border p-2">Período</th>
            <th className="border p-2 text-right">Meta</th>
            <th className="border p-2 text-right">Vendido</th>
            <th className="border p-2 text-right">% Atingido</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => {
            const pct =
              d.meta > 0 ? (d.vendido / d.meta) * 100 : 0;

            return (
              <tr key={i}>
                <td className="border p-2">{d.store_name}</td>
                <td className="border p-2 capitalize">{d.period}</td>
                <td className="border p-2 text-right">
                  R$ {d.meta.toLocaleString("pt-BR")}
                </td>
                <td className="border p-2 text-right">
                  R$ {d.vendido.toLocaleString("pt-BR")}
                </td>
                <td
                  className={`border p-2 text-right font-medium ${
                    pct >= 100 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {pct.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
