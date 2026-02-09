"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MenuGerente from "@/components/gerente/MenuGerente";

const HEADER_HEIGHT = 56;

function getTitulo(pathname: string) {
  if (pathname.startsWith("/gerente/acompanhamento"))
    return "Acompanhamento";
  if (pathname.startsWith("/gerente/relatorios"))
    return "Relatórios";
  if (pathname.startsWith("/gerente/vendedoras"))
    return "Vendedoras";
  if (pathname.startsWith("/gerente/escala"))
    return "Escala do mês";

  return "Menu";
}

export default function GerenteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(true);

  const titulo = getTitulo(pathname);

  useEffect(() => {
    async function checkRole() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "gerente") {
        router.replace("/vendedora");
        return;
      }

      setLoading(false);
    }

    checkRole();
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER FIXO COM TÍTULO */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center gap-4 bg-white border-b px-4"
        style={{ height: HEADER_HEIGHT }}
      >
        <button
          onClick={() => setMenuAberto(true)}
          className="p-2 rounded hover:bg-gray-100"
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <h1 className="text-lg font-semibold truncate">
          {titulo}
        </h1>
      </header>

      {/* MENU OVERLAY */}
      <MenuGerente
        aberto={menuAberto}
        fechar={() => setMenuAberto(false)}
        topOffset={HEADER_HEIGHT}
      />

      {/* CONTEÚDO */}
      <main
        className="px-4 pb-6"
        style={{ paddingTop: HEADER_HEIGHT + 16 }}
      >
        {children}
      </main>
    </div>
  );
}
