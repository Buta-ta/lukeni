"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, memo } from "react";

// --- Coordonnées des pays (Repris de ton projet) ---
const COUNTRY_COORDS: Record<string, [number, number]> = {
  DZA: [28.0339, 1.6596], AGO: [-11.2027, 17.8739], BEN: [9.3077, 2.3158],
  BWA: [-22.3285, 24.6849], BFA: [12.3641, -1.5196], BDI: [-3.3731, 29.9189],
  CMR: [3.8480, 11.5021], CPV: [16.5388, -23.0418], CAF: [6.6111, 20.9394],
  TCD: [15.4542, 18.7322], COM: [-11.6455, 43.3333], COD: [-4.0383, 21.7587],
  COG: [-0.2280, 15.8277], CIV: [7.5400, -5.5471], DJI: [11.8251, 42.5903],
  EGY: [26.8206, 30.8025], GNQ: [1.6508, 10.2679], ERI: [15.1794, 39.7823],
  SWZ: [-26.5225, 31.4659], ETH: [9.1450, 40.4897], GAB: [-0.8037, 11.6094],
  GMB: [13.4432, -15.3101], GHA: [7.9465, -1.0232], GIN: [9.9456, -11.3247],
  GNB: [11.8037, -15.1804], KEN: [-0.0236, 37.9062], LSO: [-29.6100, 28.2336],
  LBR: [6.4281, -9.4295], LBY: [26.3351, 17.2283], MDG: [-18.7669, 46.8691],
  MWI: [-13.2543, 34.3015], MLI: [17.5707, -3.9962], MRT: [21.0079, -10.9408],
  MUS: [-20.3484, 57.5522], MAR: [31.7917, -7.0926], MOZ: [-18.6657, 35.5296],
  NAM: [-22.9576, 18.4904], NER: [17.6078, 8.0817], NGA: [9.0820, 8.6753],
  RWA: [-1.9403, 29.8739], STP: [0.1864, 6.6131], SEN: [14.4974, -14.4524],
  SLE: [8.4606, -11.7799], SOM: [5.1521, 46.1996], ZAF: [-30.5595, 22.9375],
  SSD: [4.8594, 31.5713], SDN: [12.8628, 30.2176], TZA: [-6.3690, 34.8888],
  TGO: [8.6195, 0.8248], TUN: [33.8869, 9.5375], UGA: [1.3733, 32.2903],
  ZMB: [-13.1339, 27.8493], ZWE: [-19.0154, 29.1549]
};

export interface MacroMapData {
  country_code: string;
  value: number;
  display_value: string;
}

interface MacroMapProps {
  data: MacroMapData[];
  selectedCountry: string;
  onCountrySelect: (code: string) => void;
  lang: 'fr' | 'en';
}

function getStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    name: "Lukeni Macro Globe",
    projection: { type: "globe" as const },
    sources: {
      openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    },
    layers: [
      // 1. Le fond global devient la Terre (couleur terre: #1a1a2e)
      { id: "background", type: "background", paint: { "background-color": "#1a1a2e" } },
      
      // 2. L'eau est dessinée par-dessus (couleur océan: #060d1f)
      { id: "water", type: "fill", source: "openmaptiles", "source-layer": "water", paint: { "fill-color": "#020111" } },
      
      // 3. Frontières
      {
        id: "country-boundary", type: "line", source: "openmaptiles", "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        paint: { "line-color": "rgba(100,120,160,0.3)", "line-width": 0.8 },
      },
      
      // 4. Noms des pays (Avec sécurité si le nom en français n'est pas dispo dans l'API)
      {
        id: "place-country-label", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["==", ["get", "class"], "country"],
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]], 
          "text-font": ["literal", ["Open Sans Bold"]],
          "text-size": 10, "text-transform": "uppercase",
        },
        paint: { "text-color": "rgba(255,255,255,0.4)", "text-halo-color": "#020111", "text-halo-width": 2 },
      }
    ]
  } as unknown as maplibregl.StyleSpecification;
}

function buildGeoJSON(data: MacroMapData[], selectedCountry: string): GeoJSON.FeatureCollection {
  if (!data || data.length === 0) return { type: "FeatureCollection", features: [] };

  // Calcul du min et max pour normaliser la taille des bulles
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const features: GeoJSON.Feature[] = data.map((d) => {
    const coords = COUNTRY_COORDS[d.country_code];
    if (!coords) return null;

    // Calcul de la taille de la bulle (entre 5px et 30px)
    const normalized = max === min ? 0.5 : (d.value - min) / (max - min);
    const radius = 8 + (normalized * 22);

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [coords[1], coords[0]] },
      properties: {
        code: d.country_code,
        display_value: d.display_value,
        radius: d.country_code === selectedCountry ? radius + 5 : radius,
        is_selected: d.country_code === selectedCountry
      }
    };
  }).filter(Boolean) as GeoJSON.Feature[];

  return { type: "FeatureCollection", features };
}

export default memo(function MacroMap({ data, selectedCountry, onCountrySelect, lang }: MacroMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyle(),
      center: [20, 2],
      zoom: 2.5,
      minZoom: 1,
      maxZoom: 8,
    });

    map.on('load', () => {
      map.addSource('macro-data', { type: 'geojson', data: buildGeoJSON(data, selectedCountry) });

      // Bulle floutée en fond (Halo)
      map.addLayer({
        id: 'macro-halo', type: 'circle', source: 'macro-data',
        paint: {
          'circle-radius': ['+', ['get', 'radius'], 15],
          'circle-color': '#D4AF37',
          'circle-opacity': ['case', ['get', 'is_selected'], 0.3, 0.1],
          'circle-blur': 1
        }
      });

      // Bulle principale
      map.addLayer({
        id: 'macro-circles', type: 'circle', source: 'macro-data',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': '#D4AF37',
          'circle-opacity': ['case', ['get', 'is_selected'], 0.9, 0.6],
          'circle-stroke-width': ['case', ['get', 'is_selected'], 2, 1],
          'circle-stroke-color': '#ffffff'
        }
      });

      // Interactions
      map.on('mouseenter', 'macro-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'macro-circles', () => { 
        map.getCanvas().style.cursor = ''; 
        popupRef.current?.remove();
      });

      // Infobulle au survol
      map.on('mousemove', 'macro-circles', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: false, className: 'lukeni-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="background:rgba(2,1,17,0.9);padding:8px 12px;border:1px solid #D4AF37;border-radius:8px;color:#fff;">
             <strong style="color:#D4AF37;font-size:10px;">${f.properties.code}</strong><br/>
             <span style="font-size:14px;font-weight:bold;">${f.properties.display_value}</span>
           </div>`)
          .addTo(map);
      });

      // Clic
      map.on('click', 'macro-circles', (e) => {
        const code = e.features?.[0]?.properties?.code;
        if (code) onCountrySelect(code);
      });
    });

    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Mettre à jour les données quand elles changent
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getSource('macro-data')) {
      (map.getSource('macro-data') as maplibregl.GeoJSONSource).setData(buildGeoJSON(data, selectedCountry));
      
      // Animation vers le pays sélectionné
      const coords = COUNTRY_COORDS[selectedCountry];
      if (coords) {
        map.flyTo({ center: [coords[1], coords[0]], zoom: 3.5, duration: 1500 });
      }
    }
  }, [data, selectedCountry]);

  return (
    <div className="relative w-full h-full bg-[#020111]">
      {/* Les petites étoiles en fond (CSS pur) */}
      <div className="absolute inset-0 z-0 opacity-30" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div ref={containerRef} className="absolute inset-0 z-10 rounded-3xl overflow-hidden" />
    </div>
  );
});