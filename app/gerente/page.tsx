"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { calcularAcompanhamento } from "@/lib/acompanhamentoCalculos";
import { CardKPI } from "@/components/CardKPI";
import { CardVendedora } from "@/components/CardVendedora";
import { BadgeStatus } from "@/components/BadgeStatus";

export default function AcompanhamentoPage() {
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);

    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    const inicioMes = new Date(ano, mes - 1, 1)
      .toISOString()
      .slice(0, 10);

    const fimMes = new Date(ano, mes, 0)
      .toISOString()
      .slice(0, 10);

    const { data: vendas } = await supabase
      .from("sales")
      .select(`
        amount,
        period,
        store:stores(id, name)
      `)
      .gte("sale_date", inicioMes)
      .lte("sale_date", fimMes);

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

  const hoje = new Date();
  const diasPassados = hoje.getDate();
  const diasMes = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + 1,
    0
  ).getDate();

  const dados = calcularAcompanhamento(linhas, diasPassados, diasMes);

  return (
    <div className="space-y-6">
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
        {Object.entries(dados.porLoja).map(([loja, l]: any) => {
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
              valor={`R$ ${l.vendido} / R$ ${l.meta} • ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* POR PERÍODO */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(dados.porPeriodo).map(([p, v]: any) => {
          const pct = v.meta > 0 ? (v.vendido / v.meta) * 100 : 0;

          return (
            <CardKPI
              key={p}
              titulo={
                <div className="flex items-center gap-2">
                  Período {p}
                  <BadgeStatus percentual={pct} />
                </div>
              }
              valor={`R$ ${v.vendido} / R$ ${v.meta} • ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* VENDEDORAS */}
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
