"use client";

import { useRouter } from "next/navigation";

type Props = {
  aberto: boolean;
  fechar: () => void;
  topOffset: number;
};

export default function MenuGerente({ aberto, fechar, topOffset }: Props) {
  const router = useRouter();

  if (!aberto) return null;

  function irPara(href: string) {
    fechar();          // 🔴 FECHA IMEDIATAMENTE
    router.push(href); // depois navega
  }

  function Item({ label, href }: { label: string; href: string }) {
    return (
      <button
        onClick={() => irPara(href)}
        className="w-full text-left text-lg px-6 py-4 rounded hover:bg-gray-100"
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-white flex flex-col items-center justify-center"
      style={{ top: topOffset }}
    >
      <h1 className="text-2xl font-semibold mb-6">Menu Gerente</h1>

      <div className="w-full max-w-sm space-y-2">
        <Item label="Acompanhamento" href="/gerente/acompanhamento" />
        <Item label="Relatórios" href="/gerente/relatorios" />
        <Item label="Vendedoras" href="/gerente/vendedoras" />
        <Item label="Escala do mês" href="/gerente/escala" />
      </div>
    </div>
  );
}
