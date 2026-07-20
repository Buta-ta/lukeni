// ============================================================================
// HELPERS — CSV, statistiques, texte alternatif
// ============================================================================

export function parseCSV(raw: string): string[][] {
  const delimiter = raw.includes(';') && !raw.includes('\t') ? ';' : (raw.includes('\t') ? '\t' : ',');
  return raw
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, '')));
}

export function toCSV(rows: (string | number)[][]): string {
  return rows.map(row => row.map(cell => {
    const str = String(cell ?? '');
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(',')).join('\n');
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = toCSV(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Stats { min: number; max: number; mean: number; median: number; evolutionPct: number | null; }

export function computeStats(values: number[]): Stats {
  const clean = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (clean.length === 0) return { min: 0, max: 0, mean: 0, median: 0, evolutionPct: null };
  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const first = clean[0];
  const last = clean[clean.length - 1];
  const evolutionPct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;
  return { min: Math.min(...clean), max: Math.max(...clean), mean, median, evolutionPct };
}

export function generateAltTextFR(title: string, chartType: string, points: { label: string; value: number }[]): string {
  if (points.length === 0) return `Graphique ${chartType} : ${title}. Aucune donnée disponible.`;
  const top = [...points].sort((a, b) => b.value - a.value).slice(0, 3);
  const list = top.map(p => `${p.label} (${p.value})`).join(', ');
  return `Graphique de type ${chartType} intitulé "${title}". Principales valeurs : ${list}.`;
}

export function generateAltTextEN(title: string, chartType: string, points: { label: string; value: number }[]): string {
  if (points.length === 0) return `${chartType} chart: ${title}. No data available.`;
  const top = [...points].sort((a, b) => b.value - a.value).slice(0, 3);
  const list = top.map(p => `${p.label} (${p.value})`).join(', ');
  return `A ${chartType} chart titled "${title}". Main values: ${list}.`;
}

// Pivot: transforme les points "longs" (par série) en lignes "larges" pour Recharts
export function pivotSeriesData(
  dataPoints: { label_fr: string; period?: string | null; series_id: string | null; value: number | null; sort_order: number }[],
  series: { id: string; name_fr: string }[]
) {
  const rowsMap = new Map<string, any>();
  const order: string[] = [];

  dataPoints.forEach(dp => {
    const rowKey = dp.period || dp.label_fr;
    if (!rowsMap.has(rowKey)) {
      rowsMap.set(rowKey, { name: dp.label_fr, __sort: dp.sort_order });
      order.push(rowKey);
    }
    const seriesName = series.find(s => s.id === dp.series_id)?.name_fr || 'Valeur';
    rowsMap.get(rowKey)[seriesName] = dp.value ?? 0;
  });

  return order
    .map(k => rowsMap.get(k))
    .sort((a, b) => a.__sort - b.__sort);
}

export function toStackedPercent(rows: any[], seriesNames: string[]) {
  return rows.map(row => {
    const total = seriesNames.reduce((sum, name) => sum + (Number(row[name]) || 0), 0) || 1;
    const newRow: any = { name: row.name };
    seriesNames.forEach(name => { newRow[name] = ((Number(row[name]) || 0) / total) * 100; });
    return newRow;
  });
}