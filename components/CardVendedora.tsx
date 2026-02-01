export function CardVendedora({ titulo, v }: any) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="font-semibold">{titulo}</p>
      <p>{v.nome}</p>
      <p>{v.percentual.toFixed(1)}%</p>
      <p>{v.melhorLoja} • {v.melhorPeriodo}</p>
      {v.alerta && <p className="text-red-500 font-bold">⚠️ ALERTA</p>}
    </div>
  );
}
