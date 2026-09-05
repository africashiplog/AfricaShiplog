interface BarChartSeries {
  label: string;
  color: string;
  values: number[];
}

/** Minimal dependency-free inline-SVG grouped bar chart. */
export default function SimpleBarChart({
  categories,
  series,
  height = 220,
}: {
  categories: string[];
  series: BarChartSeries[];
  height?: number;
}) {
  const width = Math.max(categories.length * series.length * 28 + 40, 320);
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => Math.abs(v))));
  const chartHeight = height - 40;
  const groupWidth = (width - 40) / categories.length;
  const barWidth = groupWidth / (series.length + 1);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="chart">
        <line x1={30} y1={height - 30} x2={width - 10} y2={height - 30} stroke="#e2e8f0" />
        {categories.map((cat, ci) => (
          <g key={cat}>
            {series.map((s, si) => {
              const value = s.values[ci] ?? 0;
              const barHeight = (Math.abs(value) / max) * chartHeight;
              const x = 30 + ci * groupWidth + si * barWidth + 4;
              const y = height - 30 - barHeight;
              return <rect key={s.label} x={x} y={y} width={barWidth - 4} height={barHeight} fill={s.color} rx={2} />;
            })}
            <text x={30 + ci * groupWidth + groupWidth / 2} y={height - 12} fontSize={9} textAnchor="middle" fill="#64748b">
              {cat}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
