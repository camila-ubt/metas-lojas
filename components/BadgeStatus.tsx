type Props = {
  percentual: number;
  projecao?: number;
  meta?: number;
};

export function BadgeStatus({ percentual, projecao, meta }: Props) {
  const emRisco =
    percentual < 60 ||
    (projecao !== undefined && meta !== undefined && projecao < meta);

  if (emRisco) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-semibold">
        EM RISCO
      </span>
    );
  }

  if (percentual < 80) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-semibold">
        ATENÇÃO
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">
      OK
    </span>
  );
}
