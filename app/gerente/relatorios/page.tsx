// app/gerente/relatorios/page.tsx

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [relatorio, setRelatorio] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroVendedora, setFiltroVendedora] = useState("");
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => {
    carregarRelatorio();
  }, [filtroLoja, filtroVendedora, filtroData]);

  async function carregarRelatorio() {
    setLoading(true);

    const { data, error } = await supabase
      .from("sales")
      .select(`amount, sale_date, stores(name), profiles(name)`);

    if (error || !data) {
      console.error("Erro ao carregar relatório:", error?.message);
      setLoading(false);
      return;
    }

    let resultado = data.map((v: any) => ({
      loja: Array.isArray(v.stores)
        ? v.stores[0]?.name
        : v.stores?.name,

      vendedora: Array.isArray(v.profiles)
        ? v.profiles[0]?.name
        : v.profiles?.name,

      valor: v.amount,
      data: v.sale_date,
    }));

    if (filtroLoja) {
      resultado = resultado.filter((r) => r.loja === filtroLoja);
    }
    if (filtroVendedora) {
      resultado = resultado.filter((r) => r.vendedora === filtroVendedora);
    }
    if (filtroData) {
      resultado = resultado.filter((r) => r.data === filtroData);
    }

    setRelatorio(resultado);
    setTotal(resultado.reduce((acc, r) => acc + r.valor, 0));
    setLoading(false);
  }

  function exportarExcel() {
    const worksheet = XLSX.utils.json_to_sheet(relatorio);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(blob, "relatorio-vendas.xlsx");
  }

  if (loading) return <div className="p-6">Carregando relatório…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Relatório de Vendas</h1>

      <div className="grid gap-2 grid-cols-1 md:grid-cols-3 text-sm">
        <input
          className="border rounded p-2"
          placeholder="Filtrar por loja"
          value={filtroLoja}
          onChange={(e) => setFiltroLoja(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Filtrar por vendedora"
          value={filtroVendedora}
          onChange={(e) => setFiltroVendedora(e.target.value)}
        />
        <input
          type="date"
          className="border rounded p-2"
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
        />
      </div>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border">Loja</th>
            <th className="text-left p-2 border">Vendedora</th>
            <th className="text-left p-2 border">Data</th>
            <th className="text-left p-2 border">Total vendido (R$)</th>
          </tr>
        </thead>
        <tbody>
          {relatorio.map((linha, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 border">{linha.loja}</td>
              <td className="p-2 border">{linha.vendedora}</td>
              <td className="p-2 border">{linha.data}</td>
              <td className="p-2 border">
                {linha.valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold bg-gray-50">
            <td className="p-2 border" colSpan={3}>
              Total geral
            </td>
            <td className="p-2 border">
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </td>
          </tr>
        </tfoot>
      </table>

      <button
        className="mt-4 px-4 py-2 border rounded hover:bg-gray-100 text-sm"
        onClick={exportarExcel}
      >
        📥 Exportar para Excel
      </button>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Gráfico de Desempenho</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={relatorio}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="vendedora" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="valor" fill="#8884d8" name="Vendas" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
