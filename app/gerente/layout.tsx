"use client";

// app/gerente/layout.tsx

import { usePathname, useRouter } from "next/navigation";

const menu = [
  { href: "/gerente/acompanhamento", label: "Acompanhamento" },
  { href: "/gerente/relatorios", label: "Relatórios" },

  // 🔹 NOVO ITEM
  { href: "/gerente/vendedoras", label: "Vendedoras" },

  { href: "/gerente/configuracoes", label: "Configurações" },
];

export default function GerenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // 👉 painel só aparece na rota /gerente
  const isPainelInicial = pathname === "/gerente";

  return (
    <div className="min-h-screen bg-white">
      {/* 🧭 PAINEL INICIAL */}
      {isPainelInicial && (
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-6">
            Painel da Gerente
          </h2>

          {menu.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full text-left px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-black"
            >
              {item.label}
            </button>
          ))}

          <form action="/logout" method="post">
            <button
              className="mt-6 text-sm underline text-gray-600"
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
      )}

      {/* 📄 PÁGINAS INTERNAS */}
      {!isPainelInicial && (
        <div className="relative min-h-screen">
          {/* ☰ BOTÃO MENU (voltar ao painel) */}
          <button
            className="fixed top-4 left-4 z-50 bg-black text-white px-3 py-2 rounded-lg"
            onClick={() => router.push("/gerente")}
          >
            ☰
          </button>

          <main className="p-6 pt-16">{children}</main>
        </div>
      )}
    </div>
  );
}
