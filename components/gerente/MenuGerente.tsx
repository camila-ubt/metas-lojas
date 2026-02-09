"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

type Props = {
  aberto: boolean;
  fechar: () => void;
};

export default function MenuGerente({ aberto, fechar }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // fecha o menu sempre que mudar a rota
  useEffect(() => {
    if (aberto) fechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!aberto) return null;

  function irPara(href: string) {
    router.push(href);
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center space-y-4">
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
