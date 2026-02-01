"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { calcularAcompanhamento } from "@/lib/acompanhamentoCalculos";
import { CardKPI } from "@/components/CardKPI";
import { CardVendedora } from "@/components/CardVendedora";
import { BadgeStatus } from "@/components/BadgeStatus";

export default function AcompanhamentoPage() {
  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [somenteRisco, setSomenteRisco] = useState(false);

  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, [mes, ano]);

  async function carregar() {
    setLoading(true);

    const inicioMes = new Date(ano, mes - 1, 1)
      .toISOString()
      .slice(0, 10);

    const fimMes = new Date(ano, mes, 0)
      .toISOString()
      .slice(0, 10);

    // VENDAS
    const { data: vendas } = await supabase
      .from("sales")
      .select(`
        amount,
        period,
        store:stores(id, name)
      `)
      .gte("sale_date", inicioMes)
      .lte("sale_date", fimMes);

    // METAS
    const { data: metas } = await supabase
      .from("store_period_goals")
      .select(`
        goal_value,
        period,
        store_id,
        store:stores(name)
      `)
      .eq("month", mes)
      .eq("year", ano);

    if (!vendas || !metas) {
      setLoading(false);
      return;
    }

    const resultado: any[] = [];

    metas.forEach((m: any) => {
      const vendido = vendas
        .filter(
          (v: any) =>
            v.store.id === m.store_id &&
            v.period?.toLowerCase() === m.period?.toLowerCase()
        )
        .reduce((s: number, v: any) => s + (v.amount ?? 0), 0);

      resultado.push({
        loja: m.store.name,
        periodo: m.period,
        meta: m.goal_value,
        vendido,
      });
    });

    setLinhas(resultado);
    setLoading(false);
  }

  if (loading) return <p>Carregando...</p>;

  const diasPassados = hoje.getDate();
  const diasMes = new Date(ano, mes, 0).getDate();

  const dados = calcularAcompanhamento(linhas, diasPassados, diasMes);

  return (
    <div className="space-y-6">
      {/* FILTROS */}
      <div className="flex gap-6 items-center">
        <select
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {[
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro",
          ].map((nome, index) => (
            <option key={index} value={index + 1}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {[2024, 2025, 2026].map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={somenteRisco}
            onChange={e => setSomenteRisco(e.target.checked)}
          />
          Mostrar só em risco
        </label>
      </div>

      {/* GERAL */}
      <div className="grid grid-cols-3 gap-4">
        <CardKPI titulo="Meta Geral" valor={`R$ ${dados.geral.meta}`} />
        <CardKPI titulo="Vendido" valor={`R$ ${dados.geral.vendido}`} />
        <CardKPI
          titulo="%"
          valor={`${((dados.geral.vendido / dados.geral.meta) * 100).toFixed(1)}%`}
        />
      </div>

      {/* POR LOJA */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(dados.porLoja)
          .filter(([, l]: any) => {
            if (!somenteRisco) return true;
            if (l.meta <= 0) return false;
            return (l.vendido / l.meta) * 100 < 60;
          })
          .map(([loja, l]: any) => {
            const pct = l.meta > 0 ? (l.vendido / l.meta) * 100 : 0;

            return (
              <CardKPI
                key={loja}
                titulo={
                  <div className="flex items-center gap-2">
                    {loja}
                    <BadgeStatus percentual={pct} />
                  </div>
                }
                valor={`R$ ${l.vendido} / R$ ${l.meta} • ${pct.toFixed(
                  1
                )}%`}
              />
            );
          })}
      </div>

      {/* PERÍODO POR LOJA */}
      <div className="space-y-4">
        {Object.entries(dados.porLoja)
          .filter(([, l]: any) => {
            if (!somenteRisco) return true;
            if (l.meta <= 0) return false;
            return (l.vendido / l.meta) * 100 < 60;
          })
          .map(([loja]: any) => (
            <div key={loja} className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold">{loja}</p>

              <div className="grid grid-cols-2 gap-4">
                {["manha", "noite"].map(periodo => {
                  const linha = linhas.find(
                    (l: any) => l.loja === loja && l.periodo === periodo
                  );

                  if (!linha) return null;

                  const pct =
                    linha.meta > 0
                      ? (linha.vendido / linha.meta) * 100
                      : 0;

                  if (somenteRisco && pct >= 60) return null;

                  return (
                    <CardKPI
                      key={periodo}
                      titulo={
                        <div className="flex items-center gap-2">
                          {periodo === "manha" ? "Manhã" : "Noite"}
                          <BadgeStatus percentual={pct} />
                        </div>
                      }
                      valor={`R$ ${linha.vendido} / R$ ${
                        linha.meta
                      } • ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* VENDEDORAS (opcional) */}
      <div className="grid grid-cols-2 gap-4">
        {dados.destaque && (
          <CardVendedora titulo="🏆 Destaque" v={dados.destaque} />
        )}

        {dados.vendedoras
          .filter(v => v.alerta)
          .map(v => (
            <CardVendedora key={v.nome} titulo="⚠️ Em alerta" v={v} />
          ))}
      </div>
    </div>
  );
}
