// app/gerente/layout.tsx

import Link from "next/link";

const menu = [
  { href: "/gerente/acompanhamento", label: "Acompanhamento" },
  { href: "/gerente/relatorios", label: "Relatórios" },
  { href: "/gerente/configuracoes", label: "Configurações" },
];

export default function GerenteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-100 p-4 space-y-3">
        <h2 className="text-xl font-semibold mb-4">Painel da Gerente</h2>
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded-lg hover:bg-gray-200 text-black"
          >
            {item.label}
          </Link>
        ))}
        <form action="/logout" method="post">
          <button
            className="mt-6 text-sm underline"
            type="submit"
          >
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6 bg-white">{children}</main>
    </div>
  );
}
