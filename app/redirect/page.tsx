"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RedirectPage() {
  useEffect(() => {
    async function decide() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.href = "/";
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

      if (prof?.role === "gerente") {
        window.location.href = "/gerente";
      } else {
        window.location.href = "/vendedora";
      }
    }

    decide();
  }, []);

  return <div className="p-6">Redirecionando…</div>;
}
