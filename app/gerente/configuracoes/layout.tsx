"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const abas = [
  { href: "/gerente/configuracoes/metas", label: "Metas" },
  { href: "/gerente/configuracoes/comissoes", label: "Comissões" },
];

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <div className="flex gap-4 border-b">
        {abas.map((aba) => (
          <Link
            key={aba.href}
            href={aba.href}
            className={`pb-2 border-b-2 ${
              path === aba.href
                ? "border-black font-semibold"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {aba.label}
          </Link>
        ))}
      </div>

      <div>{children}</div>
    </div>
  );
}
