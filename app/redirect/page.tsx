"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RedirectPage() {
  useEffect(() => {
    async function decide() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.replace("/");
        return;
      }

      const userId = sessionData.session.user.id;

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !prof) {
        // fallback seguro
        window.location.replace("/");
        return;
      }

      if (prof.role === "gerente") {
        window.location.replace("/gerente");
      } else {
        window.location.replace("/vendedora");
      }
    }

    decide();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecionando…</p>
    </div>
  );
}
