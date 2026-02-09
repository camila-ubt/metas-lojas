"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function MenuGerente() {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(true);

  function irPara(href: string) {
    router.push(href);
    setAberto(false); // fecha após navegar
  }

  function Item({
    label,
    href,
  }: {
    label: string;
    href: string;
  }) {
    const ativo = pathname.startsWith(href);

    return (
      <button
        onClick={() => irPara(href)}
        className={`w-full text-left px-3 py-2 rounded text-sm ${
          ativo
            ? "bg-black text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <>
      {/* BOTÃO ☰ SEMPRE VISÍVEL */}
      <button
        onClick={() => setAberto(!aberto)}
        className="mb-4 p-2 rounded hover:bg-gray-100"
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {/* MENU */}
      {aberto && (
        <nav className="space-y-1">
          <h2 className="font-semibold mb-3">Gerente</h2>

          <Item label="Acompanhamento" href="/gerente/acompanhamento" />
          <Item label="Relatórios" href="/gerente/relatorios" />
          <Item label="Vendedoras" href="/gerente/vendedoras" />
          <Item label="Escala do mês" href="/gerente/escala" />
        </nav>
      )}
    </>
  );
}
