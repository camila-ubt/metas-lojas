export function CardVendedora({ titulo, v }: any) {
  const percentual =
    typeof v.percentual === "number" && !isNaN(v.percentual)
      ? v.percentual
      : 0;

  const isDestaque = titulo === "🏆 Destaque";
  const isAlerta = titulo === "⚠️ Em alerta";

  return (
    <div className="rounded-xl bg-white p-4 shadow space-y-1">
      <p className="font-semibold flex items-center gap-2">
        {isDestaque && <span>🏆</span>}
        {isAlerta && <span>⚠️</span>}
        {isDestaque ? "Destaque" : isAlerta ? "Em alerta" : "Vendedora"}
      </p>

      <p>{v.nome ?? "—"}</p>

      <p>{percentual.toFixed(1)}%</p>

      <p>
        {v.melhorLoja ?? "—"} • {v.melhorPeriodo ?? "—"}
      </p>

      {isAlerta && (
        <p className="text-red-500 font-bold flex items-center gap-1">
          ⚠️ EM RISCO
        </p>
      )}
    </div>
  );
}
