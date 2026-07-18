// lib/geoip.ts

// Pays utilisant le CFA (Franc CFA Ouest WAEMU)
const CFA_COUNTRIES = [
  'CI', // Côte d'Ivoire
  'SN', // Sénégal
  'BJ', // Bénin
  'BF', // Burkina Faso
  'ML', // Mali
  'NE', // Niger
  'TG', // Togo
  'GM', // Gambie
  'GW', // Guinée-Bissau
  'LR', // Liberia
  'SL', // Sierra Leone
  'CF', // Centrafrique
  'CG', // Congo
  'CM', // Cameroun
  'GA', // Gabon
  'GQ', // Guinée équatoriale
  'TD', // Tchad
];

export const maxmind = {
  getCountry: (ip: string) => {
    // Défaut : France / EUR
    return {
      iso_code: 'FR',
      country: 'France',
    };
  },
};

// Version avec Cloudflare (si sur Vercel/Edge)
export const getCountryFromRequest = (req: any): { country: string; currency: 'XOF' | 'EUR' } => {
  // Cloudflare ajoute l'header 'cf-ipcountry'
  const cfCountry = req.headers?.get?.('cf-ipcountry') || 'FR';
  
  const isCFA = CFA_COUNTRIES.includes(cfCountry);
  
  return {
    country: cfCountry,
    currency: isCFA ? 'XOF' : 'EUR',
  };
};

// Version API pour clients
export const detectCurrencyFromIP = (ip: string): 'XOF' | 'EUR' => {
  // Cette fonction devrait appeler ip-api.com ou MaxMind
  // Pour l'instant : défaut EUR
  return 'EUR';
};