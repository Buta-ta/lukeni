export type ChartType =
  | 'bar' | 'line' | 'pie' | 'donut'
  | 'stacked_bar' | 'stacked_bar_100' | 'multi_line' | 'combo'
  | 'radar' | 'scatter' | 'bubble' | 'population_pyramid' | 'waterfall';

export type WorkflowStatus = 'draft' | 'review' | 'validated' | 'published' | 'archived';
export type DataStatus = 'final' | 'provisional' | 'estimated' | 'forecast';

export interface Category { id: string; name_fr: string; name_en: string; color: string; }

export interface MacroSeries {
  id: string;
  chart_id?: string;
  name_fr: string;
  name_en: string;
  color: string;
  render_as: 'bar' | 'line';
  axis: 'primary' | 'secondary';
  sort_order: number;
}

export interface MacroDataPoint {
  id: string;
  chart_id?: string;
  series_id: string | null;
  label_fr: string;
  label_en: string;
  period: string;
  value: number | null;
  x_value: number | null;
  y_value: number | null;
  size_value: number | null;
  color: string;
  sort_order: number;
  is_total: boolean;
  data_status: DataStatus | null;
  annotation_fr: string;
  annotation_en: string;
}

export interface MacroAnnotation {
  id: string;
  chart_id?: string;
  period: string;
  label_fr: string;
  label_en: string;
  color: string;
}

export interface MacroChart {
  id: string;
  category_id: string;
  slug: string;
  title_fr: string; title_en: string;
  description_fr: string; description_en: string;
  meta_description_fr: string; meta_description_en: string;
  alt_text_fr: string; alt_text_en: string;
  chart_type: ChartType;
  unit_fr: string; unit_en: string;
  secondary_unit_fr: string; secondary_unit_en: string;
  source_fr: string; source_en: string; source_url: string;
  methodology_fr: string; methodology_en: string;
  population_scope_fr: string; population_scope_en: string;
  data_status: DataStatus;
  reference_date: string;
  publication_date: string;
  has_break_in_series: boolean;
  break_note_fr: string; break_note_en: string;
  margin_error: number | null;
  workflow_status: WorkflowStatus;

  validated_at?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  dataPoints?: MacroDataPoint[];
  macro_chart_series?: MacroSeries[];
  macro_chart_annotations?: MacroAnnotation[];
}

export const CHART_TYPES: { id: ChartType; label: string; group: string }[] = [
  { id: 'bar', label: 'Barres', group: 'Composition' },
  { id: 'line', label: 'Ligne', group: 'Évolution' },
  { id: 'pie', label: 'Camembert', group: 'Composition' },
  { id: 'donut', label: 'Anneau', group: 'Composition' },
  { id: 'stacked_bar', label: 'Barres empilées', group: 'Composition' },
  { id: 'stacked_bar_100', label: 'Barres empilées (100%)', group: 'Composition' },
  { id: 'multi_line', label: 'Courbes multiples', group: 'Évolution' },
  { id: 'combo', label: 'Combiné (barres + ligne)', group: 'Évolution' },
  { id: 'radar', label: 'Radar', group: 'Comparaison' },
  { id: 'scatter', label: 'Nuage de points', group: 'Distribution' },
  { id: 'bubble', label: 'Bulles', group: 'Distribution' },
  { id: 'population_pyramid', label: 'Pyramide des âges', group: 'Démographie' },
  { id: 'waterfall', label: 'Cascade', group: 'Évolution' },
];

export const MULTI_SERIES_TYPES: ChartType[] = ['stacked_bar', 'stacked_bar_100', 'multi_line', 'combo', 'radar', 'population_pyramid'];
export const POINT_TYPES: ChartType[] = ['scatter', 'bubble'];
export const TEMPORAL_TYPES: ChartType[] = ['line', 'multi_line', 'combo', 'stacked_bar', 'stacked_bar_100'];
export const SIMPLE_MATRIX_TYPES: ChartType[] = ['bar', 'line', 'pie', 'donut', 'waterfall'];

export const WORKFLOW_LABELS: Record<WorkflowStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: '#9ca3af' },
  review: { label: 'En relecture', color: '#f59e0b' },
  validated: { label: 'Validé', color: '#3b82f6' },
  published: { label: 'Publié', color: '#10b981' },
  archived: { label: 'Archivé', color: '#6b7280' },
};

export const DATA_STATUS_LABELS: Record<DataStatus, string> = {
  final: 'Définitif',
  provisional: 'Provisoire',
  estimated: 'Estimé',
  forecast: 'Prévision',
};