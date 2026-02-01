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

// 🎯 regras de meta
const SUPER_META_MULT = 1.2;
const MEGA_META_MULT = 1.3;

/* ======================
   STATUS & LABELS
====================== */
function calcularStatus(meta: number, vendido: number) {
  if (vendido >= meta * MEGA_META_MULT) return "mega";
  if (vendido >= meta * SUPER_META_MULT) return "super";
  if (vendido >= meta) return "meta";
  return "abaixo";
}

function statusLabel(status: "abaixo" | "meta" | "super" | "mega") {
  switch (status) {
    case "mega":
      return "👑 Megameta incrível";
    case "super":
      return "🚀 Supermeta alcançada";
    case "meta":
      return "🎯 Meta batida";
    default:
      return "✨ Em progresso";
  }
}

/* ======================
   PROJEÇÃO (INTELIGENTE)
====================== */
function calcularProjecao(
  vendido: number,
  meta: number,
  month: number,
  year: number
) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const totalDiasMes = new Date(year, month, 0).getDate();

  // 📅 mês passado
  if (year < anoAtual || (year === anoAtual && month < mesAtual)) {
    return {
      projecao: vendido,
      previsao: "📅 Mês encerrado",
    };
  }

  // ⏳ mês futuro
  if (year > anoAtual || (year === anoAtual && month > mesAtual)) {
    return {
      projecao: 0,
      previsao: "⏳ Mês ainda não iniciado",
    };
  }

  // ✅ mês atual
  const diaAtual = hoje.getDate();
  const diasDecorridos = Math.max(diaAtual, 1);

  const mediaDiaria = vendido / diasDecorridos;
  const projecao = mediaDiaria * totalDiasMes;

  let previsao = "⚠️ Mantendo o ritmo, não bate a meta";

  if (projecao >= meta * MEGA_META_MULT) {
    previsao = "👑 Mantendo o ritmo, bate a Megameta";
  } else if (projecao >= meta * SUPER_META_MULT) {
    previsao = "🚀 Mantendo o ritmo, bate a Supermeta";
  } else if (projecao >= meta) {
    previsao = "🎯 Mantendo o ritmo, bate a Meta";
  }

  return { projecao, previsao };
}

/* ======================
   R$/DIA (BASE)
====================== */
function calcularNecessarioPorDia(
  vendido: number,
  alvo: number,
  month: number,
  year: number
) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const totalDiasMes = new Date(year, month, 0).getDate();

  // se não for mês atual, não calcula ritmo diário
  if (year !== anoAtual || month !== mesAtual) return 0;

  const diaAtual = hoje.getDate();
  const diasRestantes = totalDiasMes - diaAtual;

  const falta = alvo - vendido;

  if (falta <= 0) return 0;
  if (diasRestantes <= 0) return falta;

  return falta / diasRestantes;
}

/* ======================
   R$/DIA DINÂMICO
====================== */
function calcularNecessarioPorDiaDinamico(
  vendido: number,
  meta: number,
  month: number,
  year: number
) {
  const status = calcularStatus(meta, vendido);

  if (status === "abaixo") {
    return {
      label: "🎯 p/ Meta",
      valor: calcularNecessarioPorDia(vendido, meta, month, year),
    };
  }

  if (status === "meta") {
    return {
      label: "🚀 p/ Super",
      valor: calcularNecessarioPorDia(
        vendido,
        meta * SUPER_META_MULT,
        month,
        year
      ),
    };
  }

  if (status === "super") {
    return {
      label: "👑 p/ Mega",
      valor: calcularNecessarioPorDia(
        vendido,
        meta * MEGA_META_MULT,
        month,
        year
      ),
    };
  }

  return {
    label: "👑 Megameta batida",
    valor: 0,
  };
}

/* ======================
   COMPONENTE
====================== */
export default function AcompanhamentoGerentePage() {
  const hoje = new Date();
  const [month, setMonth] = useState(hoje.getMonth() + 1);
  const [year, setYear] = useState(hoje.getFullYear());
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<Linha[]>([]);

  useEffect(() => {
    carregar();
  }, [month, year]);

  async function carregar() {
    setLoading(true);

    const { data: lojas } = await supabase
      .from("stores")
      .select("id, name")
      .order("id");

    const { data: metas } = await supabase
      .from("store_period_goals")
      .select("*")
      .eq("month", month)
      .eq("year", year);

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

  // 🔢 totais por loja (cards)
  const totaisPorLoja = Object.values(
    dados.reduce((acc: any, d) => {
      if (!acc[d.store_id]) {
        acc[d.store_id] = {
          store_id: d.store_id,
          store_name: d.store_name,
          meta: 0,
          vendido: 0,
        };
      }
      acc[d.store_id].meta += d.meta;
      acc[d.store_id].vendido += d.vendido;
      return acc;
    }, {})
  );

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Acompanhamento de Metas</h1>

      {/* 📅 FILTRO MÊS / ANO */}
      <div className="flex gap-3 items-center">
        <select
          className="border rounded p-2"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {[
            "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
            "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
          ].map((nome, i) => (
            <option key={i + 1} value={i + 1}>
              {nome}
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

      {/* 🧩 CARDS POR LOJA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {totaisPorLoja.map((l: any) => {
          const status = calcularStatus(l.meta, l.vendido);
          const { projecao, previsao } = calcularProjecao(
            l.vendido,
            l.meta,
            month,
            year
          );
          const necessarioDia = calcularNecessarioPorDiaDinamico(
            l.vendido,
            l.meta,
            month,
            year
          );

          return (
            <div key={l.store_id} className="border rounded-xl p-4 space-y-2">
              <h2 className="font-semibold text-lg">{l.store_name}</h2>

              <p className="text-sm">
                Vendido: <strong>R$ {l.vendido.toLocaleString("pt-BR")}</strong>
              </p>

              <p className="text-sm">
                📈 Projeção:{" "}
                <strong>R$ {projecao.toLocaleString("pt-BR")}</strong>
              </p>

              <p className="text-sm">
                📆 Precisa vender/dia {necessarioDia.label}:{" "}
                <strong>
                  {necessarioDia.valor === 0
                    ? "—"
                    : `R$ ${necessarioDia.valor.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`}
                </strong>
              </p>

              <p className="text-sm font-medium text-brand-turquoise">
                {previsao}
              </p>

              <span className="text-sm text-gray-500">
                {statusLabel(status)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 📊 TABELA POR PERÍODO */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Loja</th>
            <th className="border p-2">Período</th>
            <th className="border p-2 text-right">Meta</th>
            <th className="border p-2 text-right">Vendido</th>
            <th className="border p-2 text-right">R$/dia</th>
            <th className="border p-2 text-right">Status</th>
          </tr>
        </thead>

        <tbody>
          {dados.map((d, i) => {
            const status = calcularStatus(d.meta, d.vendido);
            const necessarioDia = calcularNecessarioPorDiaDinamico(
              d.vendido,
              d.meta,
              month,
              year
            );

            return (
              <tr key={i}>
                <td className="border p-2">
                  <Link
                    href={`/gerente/acompanhamento/loja/${d.store_id}?month=${month}&year=${year}`}
                    className="text-brand-turquoise underline"
                  >
                    {d.store_name}
                  </Link>
                </td>

                <td className="border p-2 capitalize">
                  <Link
                    href={`/gerente/acompanhamento/periodo/${d.period}?month=${month}&year=${year}`}
                    className="underline"
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
                  {necessarioDia.valor === 0
                    ? "—"
                    : `R$ ${necessarioDia.valor.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`}
                </td>

                <td className="border p-2 text-right font-medium">
                  {statusLabel(status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
