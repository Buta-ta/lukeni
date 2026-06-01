// lib/countries.ts

export interface Country {
  code: string;
  name_fr: string;
  name_en: string;
  flag: string;
  lat: number;
  lng: number;
  region: 'africa' | 'americas' | 'europe' | 'caribbean' | 'indian_ocean' | 'asia' | 'diaspora';
}

export const AFRICAN_COUNTRIES: Record<string, Country> = {
  DZA: { code: 'DZA', lat: 28.0339,  lng: 1.6596,   name_fr: "Algérie",           name_en: "Algeria",         flag: "🇩🇿", region: 'africa' },
  AGO: { code: 'AGO', lat: -11.2027, lng: 17.8739,  name_fr: "Angola",            name_en: "Angola",          flag: "🇦🇴", region: 'africa' },
  BEN: { code: 'BEN', lat: 9.3077,   lng: 2.3158,   name_fr: "Bénin",             name_en: "Benin",           flag: "🇧🇯", region: 'africa' },
  BWA: { code: 'BWA', lat: -22.3285, lng: 24.6849,  name_fr: "Botswana",          name_en: "Botswana",        flag: "🇧🇼", region: 'africa' },
  BFA: { code: 'BFA', lat: 12.3641,  lng: -1.5275,  name_fr: "Burkina Faso",      name_en: "Burkina Faso",    flag: "🇧🇫", region: 'africa' },
  BDI: { code: 'BDI', lat: -3.3731,  lng: 29.9189,  name_fr: "Burundi",           name_en: "Burundi",         flag: "🇧🇮", region: 'africa' },
  CMR: { code: 'CMR', lat: 3.8480,   lng: 11.5021,  name_fr: "Cameroun",          name_en: "Cameroon",        flag: "🇨🇲", region: 'africa' },
  CPV: { code: 'CPV', lat: 16.5388,  lng: -23.0418, name_fr: "Cap-Vert",          name_en: "Cape Verde",      flag: "🇨🇻", region: 'africa' },
  CAF: { code: 'CAF', lat: 6.6111,   lng: 20.9394,  name_fr: "Centrafrique",      name_en: "C. African Rep.", flag: "🇨🇫", region: 'africa' },
  TCD: { code: 'TCD', lat: 15.4542,  lng: 18.7322,  name_fr: "Tchad",             name_en: "Chad",            flag: "🇹🇩", region: 'africa' },
  COM: { code: 'COM', lat: -11.6455, lng: 43.3333,  name_fr: "Comores",           name_en: "Comoros",         flag: "🇰🇲", region: 'indian_ocean' },
  COD: { code: 'COD', lat: -4.0383,  lng: 21.7587,  name_fr: "Congo (RDC)",       name_en: "Congo (DRC)",     flag: "🇨🇩", region: 'africa' },
  COG: { code: 'COG', lat: -0.2280,  lng: 15.8277,  name_fr: "Congo",             name_en: "Congo",           flag: "🇨🇬", region: 'africa' },
  CIV: { code: 'CIV', lat: 7.5400,   lng: -5.5471,  name_fr: "Côte d'Ivoire",     name_en: "Ivory Coast",     flag: "🇨🇮", region: 'africa' },
  DJI: { code: 'DJI', lat: 11.8251,  lng: 42.5903,  name_fr: "Djibouti",          name_en: "Djibouti",        flag: "🇩🇯", region: 'africa' },
  EGY: { code: 'EGY', lat: 26.8206,  lng: 30.8025,  name_fr: "Égypte",            name_en: "Egypt",           flag: "🇪🇬", region: 'africa' },
  GNQ: { code: 'GNQ', lat: 1.6508,   lng: 10.2679,  name_fr: "Guinée Équatoriale", name_en: "Eq. Guinea",     flag: "🇬🇶", region: 'africa' },
  ERI: { code: 'ERI', lat: 15.1794,  lng: 39.7823,  name_fr: "Érythrée",          name_en: "Eritrea",         flag: "🇪🇷", region: 'africa' },
  SWZ: { code: 'SWZ', lat: -26.5225, lng: 31.4659,  name_fr: "Eswatini",          name_en: "Eswatini",        flag: "🇸🇿", region: 'africa' },
  ETH: { code: 'ETH', lat: 9.1450,   lng: 40.4897,  name_fr: "Éthiopie",          name_en: "Ethiopia",        flag: "🇪🇹", region: 'africa' },
  GAB: { code: 'GAB', lat: -0.8037,  lng: 11.6094,  name_fr: "Gabon",             name_en: "Gabon",           flag: "🇬🇦", region: 'africa' },
  GMB: { code: 'GMB', lat: 13.4432,  lng: -15.3101, name_fr: "Gambie",            name_en: "Gambia",          flag: "🇬🇲", region: 'africa' },
  GHA: { code: 'GHA', lat: 7.9465,   lng: -1.0232,  name_fr: "Ghana",             name_en: "Ghana",           flag: "🇬🇭", region: 'africa' },
  GIN: { code: 'GIN', lat: 9.9456,   lng: -11.7422, name_fr: "Guinée",            name_en: "Guinea",          flag: "🇬🇳", region: 'africa' },
  GNB: { code: 'GNB', lat: 11.8037,  lng: -15.1804, name_fr: "Guinée-Bissau",     name_en: "Guinea-Bissau",   flag: "🇬🇼", region: 'africa' },
  KEN: { code: 'KEN', lat: -0.0236,  lng: 37.9062,  name_fr: "Kenya",             name_en: "Kenya",           flag: "🇰🇪", region: 'africa' },
  LSO: { code: 'LSO', lat: -29.6100, lng: 28.2336,  name_fr: "Lesotho",           name_en: "Lesotho",         flag: "🇱🇸", region: 'africa' },
  LBR: { code: 'LBR', lat: 6.4281,   lng: -9.4295,  name_fr: "Libéria",           name_en: "Liberia",         flag: "🇱🇷", region: 'africa' },
  LBY: { code: 'LBY', lat: 26.3351,  lng: 17.2283,  name_fr: "Libye",             name_en: "Libya",           flag: "🇱🇾", region: 'africa' },
  MDG: { code: 'MDG', lat: -18.7669, lng: 46.8691,  name_fr: "Madagascar",        name_en: "Madagascar",      flag: "🇲🇬", region: 'indian_ocean' },
  MWI: { code: 'MWI', lat: -13.2543, lng: 34.3015,  name_fr: "Malawi",            name_en: "Malawi",          flag: "🇲🇼", region: 'africa' },
  MLI: { code: 'MLI', lat: 17.5707,  lng: -3.9962,  name_fr: "Mali",              name_en: "Mali",            flag: "🇲🇱", region: 'africa' },
  MRT: { code: 'MRT', lat: 21.0079,  lng: -10.9408, name_fr: "Mauritanie",        name_en: "Mauritania",      flag: "🇲🇷", region: 'africa' },
  MUS: { code: 'MUS', lat: -20.3484, lng: 57.5522,  name_fr: "Maurice",           name_en: "Mauritius",       flag: "🇲🇺", region: 'indian_ocean' },
  MAR: { code: 'MAR', lat: 31.7917,  lng: -7.0926,  name_fr: "Maroc",             name_en: "Morocco",         flag: "🇲🇦", region: 'africa' },
  MOZ: { code: 'MOZ', lat: -18.6657, lng: 35.5296,  name_fr: "Mozambique",        name_en: "Mozambique",      flag: "🇲🇿", region: 'africa' },
  NAM: { code: 'NAM', lat: -22.9576, lng: 18.4904,  name_fr: "Namibie",           name_en: "Namibia",         flag: "🇳🇦", region: 'africa' },
  NER: { code: 'NER', lat: 17.6078,  lng: 8.0817,   name_fr: "Niger",             name_en: "Niger",           flag: "🇳🇪", region: 'africa' },
  NGA: { code: 'NGA', lat: 9.0820,   lng: 8.6753,   name_fr: "Nigéria",           name_en: "Nigeria",         flag: "🇳🇬", region: 'africa' },
  RWA: { code: 'RWA', lat: -1.9403,  lng: 29.8739,  name_fr: "Rwanda",            name_en: "Rwanda",          flag: "🇷🇼", region: 'africa' },
  STP: { code: 'STP', lat: 0.1864,   lng: 6.6131,   name_fr: "São Tomé",          name_en: "São Tomé",        flag: "🇸🇹", region: 'africa' },
  SEN: { code: 'SEN', lat: 14.4974,  lng: -14.4524, name_fr: "Sénégal",           name_en: "Senegal",         flag: "🇸🇳", region: 'africa' },
  SLE: { code: 'SLE', lat: 8.4606,   lng: -11.7799, name_fr: "Sierra Leone",      name_en: "Sierra Leone",    flag: "🇸🇱", region: 'africa' },
  SOM: { code: 'SOM', lat: 5.1521,   lng: 46.1996,  name_fr: "Somalie",           name_en: "Somalia",         flag: "🇸🇴", region: 'africa' },
  ZAF: { code: 'ZAF', lat: -30.5595, lng: 22.9375,  name_fr: "Afrique du Sud",    name_en: "South Africa",    flag: "🇿🇦", region: 'africa' },
  SSD: { code: 'SSD', lat: 6.8770,   lng: 31.3070,  name_fr: "Soudan du Sud",     name_en: "South Sudan",     flag: "🇸🇸", region: 'africa' },
  SDN: { code: 'SDN', lat: 12.8628,  lng: 30.2176,  name_fr: "Soudan",            name_en: "Sudan",           flag: "🇸🇩", region: 'africa' },
  TZA: { code: 'TZA', lat: -6.3690,  lng: 34.8888,  name_fr: "Tanzanie",          name_en: "Tanzania",        flag: "🇹🇿", region: 'africa' },
  TGO: { code: 'TGO', lat: 8.6195,   lng: 0.8248,   name_fr: "Togo",              name_en: "Togo",            flag: "🇹🇬", region: 'africa' },
  TUN: { code: 'TUN', lat: 33.8869,  lng: 9.5375,   name_fr: "Tunisie",           name_en: "Tunisia",         flag: "🇹🇳", region: 'africa' },
  UGA: { code: 'UGA', lat: 1.3733,   lng: 32.2903,  name_fr: "Ouganda",           name_en: "Uganda",          flag: "🇺🇬", region: 'africa' },
  ZMB: { code: 'ZMB', lat: -13.1339, lng: 27.8493,  name_fr: "Zambie",            name_en: "Zambia",          flag: "🇿🇲", region: 'africa' },
  ZWE: { code: 'ZWE', lat: -19.0154, lng: 29.1549,  name_fr: "Zimbabwe",          name_en: "Zimbabwe",        flag: "🇿🇼", region: 'africa' },
  // Diaspora / Monde
  BRA: { code: 'BRA', lat: -14.235,  lng: -51.9253, name_fr: "Brésil",            name_en: "Brazil",          flag: "🇧🇷", region: 'americas' },
  USA: { code: 'USA', lat: 37.0902,  lng: -95.7129, name_fr: "États-Unis",        name_en: "United States",   flag: "🇺🇸", region: 'americas' },
  JAM: { code: 'JAM', lat: 18.1096,  lng: -77.2975, name_fr: "Jamaïque",          name_en: "Jamaica",         flag: "🇯🇲", region: 'caribbean' },
  CUB: { code: 'CUB', lat: 21.5218,  lng: -77.7812, name_fr: "Cuba",              name_en: "Cuba",            flag: "🇨🇺", region: 'caribbean' },
  HTI: { code: 'HTI', lat: 18.9712,  lng: -72.2852, name_fr: "Haïti",             name_en: "Haiti",           flag: "🇭🇹", region: 'caribbean' },
  TTO: { code: 'TTO', lat: 10.6918,  lng: -61.2225, name_fr: "Trinité-et-Tobago", name_en: "Trinidad & Tobago", flag: "🇹🇹", region: 'caribbean' },
  COL: { code: 'COL', lat: 4.5709,   lng: -74.2973, name_fr: "Colombie",          name_en: "Colombia",        flag: "🇨🇴", region: 'americas' },
  FRA: { code: 'FRA', lat: 46.2276,  lng: 2.2137,   name_fr: "France",            name_en: "France",          flag: "🇫🇷", region: 'europe' },
  GBR: { code: 'GBR', lat: 55.3781,  lng: -3.4360,  name_fr: "Royaume-Uni",       name_en: "United Kingdom",  flag: "🇬🇧", region: 'europe' },
  PRT: { code: 'PRT', lat: 39.3999,  lng: -8.2245,  name_fr: "Portugal",          name_en: "Portugal",        flag: "🇵🇹", region: 'europe' },
  ESP: { code: 'ESP', lat: 40.4637,  lng: -3.7492,  name_fr: "Espagne",           name_en: "Spain",           flag: "🇪🇸", region: 'europe' },
  IND: { code: 'IND', lat: 20.5937,  lng: 78.9629,  name_fr: "Inde",              name_en: "India",           flag: "🇮🇳", region: 'asia' },
};

// Helper pour obtenir les coordonnées d'un pays
export function getCountryCoords(code: string): { lat: number; lng: number } | null {
  const country = AFRICAN_COUNTRIES[code];
  if (!country) return null;
  return { lat: country.lat, lng: country.lng };
}

// Helper pour obtenir les infos complètes d'un pays
export function getCountryInfo(code: string): Country | null {
  return AFRICAN_COUNTRIES[code] || null;
}