export type PeriodType = 'year' | 'quarter' | 'month' | 'week';
export type Trend = 'up' | 'down' | 'stable';

export interface MacroGlobeData {
  id: string;
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  lat: number;
  lng: number;
  category_id: string;
  indicator_fr: string;
  indicator_en: string;
  period_type: PeriodType;
  period_value: string;
  value: number;
  unit_fr?: string;
  unit_en?: string;
  trend?: Trend;
  source?: string;
  source_url?: string;
  is_featured: boolean;
  category?: {
    id: string;
    name_fr: string;
    name_en: string;
    color: string;
  };
}

export interface MacroGlobeRelation {
  id: string;
  origin_country_code: string;
  origin_lat: number;
  origin_lng: number;
  target_country_code: string;
  target_lat: number;
  target_lng: number;
  relation_type: string;
  description_fr?: string;
  description_en?: string;
  article_id?: string;
}

export interface CountryPin {
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  lat: number;
  lng: number;
}