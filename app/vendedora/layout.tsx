"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MenuVendedora from "@/components/vendedora/MenuVendedora";

const HEADER_HEIGHT = 56;

function getTitulo(pathname: string) {
  if (pathname.startsWith("/vendedora")) {
    return "Lançamento de Vendas";
  }
  return "Vendedora";
}

export default function VendedoraLayout({
  children,
}: {
  children: React.ReactNode;
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
        .select("role, active")
        .eq("id", user.id)
        .single();

      if (
        profile?.role !== "vendedora" ||
        profile?.active === false
      ) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    checkRole();
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER FIXO */}
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
      <MenuVendedora
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
