"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MenuGerente() {
  const router = useRouter();
  const pathname = usePathname();

  const [aberto, setAberto] = useState(true);

  // 🔹 fecha o menu sempre que a rota mudar
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  function navegar(href: string) {
    router.push(href);
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
        onClick={() => navegar(href)}
        className={`w-full text-left px-3 py-2 rounded text-sm transition ${
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
    <div className="relative">
      {/* BOTÃO ☰ — SEMPRE VISÍVEL */}
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
    </div>
  );
}
