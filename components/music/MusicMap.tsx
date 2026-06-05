// components/music/MusicMap.tsx
"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useCallback, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Navigation, Info, X } from "lucide-react";



// Ajoutez cette fonction utilitaire au début du fichier
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CountryMusicData {
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  city: string | null;
  lat: number;
  lng: number;
  track_count: number;
  is_cluster: boolean;
  cluster_name: string;
  track_ids?: string[];
  dominant_color: string;
  genres: string[];
  eras: number[];
  region?: 'africa' | 'americas' | 'europe' | 'caribbean' | 'indian_ocean' | 'asia' | 'diaspora';
}

export interface MusicMapProps {
  countries: CountryMusicData[];
  selectedCountry: string | null;
  activeEra: number | null;
  lang: "fr" | "en";
  onCountrySelect: (code: string) => void;
  playingCountry: string | null;
  onDownloadTrack?: (trackId: string, title: string) => void;
  viewMode?: 'africa' | 'world';
  onViewModeChange?: (mode: 'africa' | 'world') => void;
  theme?: 'dark' | 'light';
  genreRelations?: any[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const GOLD_COLOR = "#D4AF37";
const SRC_MARKERS     = "lukeni-markers";
const SRC_RIPPLES     = "lukeni-ripples";
const SRC_TEXT_LABELS = "lukeni-labels";
const LYR_HALO_FILL      = "lukeni-halo-fill";
const LYR_MARKER_FILL    = "lukeni-marker-fill";
const LYR_MARKER_RING    = "lukeni-marker-ring";
const LYR_RIPPLE         = "lukeni-ripple";
const LYR_COUNTRY_LABELS = "lukeni-country-labels";
const LYR_CLUSTER_CIRCLE = "lukeni-cluster-circle";
const LYR_CLUSTER_COUNT  = "lukeni-cluster-count";
const SRC_RELATIONS     = "lukeni-relations";
const LYR_RELATIONS     = "lukeni-relations-line";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function markerRadius(count: number): number {
  if (count <= 0) return 5;
  return Math.min(6 + Math.sqrt(count) * 2.5, 26);
}

function eraOpacity(
  eras: number[] | undefined,
  active: number | null,
  has: boolean
): number {
  if (!active || !has) return 1;
  if (!eras?.length) return 0.12;
  return eras.includes(active) ? 1 : 0.12;
}

function fmt(n: number, lang: "fr" | "en"): string {
  return n.toLocaleString(lang === "fr" ? "fr-FR" : "en-US");
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
  const int = parseInt(normalized, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function getGeoJSONSource(
  map: maplibregl.Map,
  id: string
): maplibregl.GeoJSONSource | undefined {
  const src = map.getSource(id);
  if (!src || src.type !== "geojson") return undefined;
  return src as maplibregl.GeoJSONSource;
}

// ─── Styles Globe ─────────────────────────────────────────────────────────────

function buildGlobeStyle(theme: 'dark' | 'light'): maplibregl.StyleSpecification {
  const isDark = theme === 'dark';

  const bg         = isDark ? "#020111"  : "#C8DCF0";
  const water      = isDark ? "#060d1f"  : "#5BA4CF";
  const land       = isDark ? "#1a2535"  : "#F0EDE4";
  const residential= isDark ? "#111827"  : "#E8E4D8";
  const park       = isDark ? "#0a1f12"  : "#C8D8C4";
  const waterway   = isDark ? "#060d1f"  : "#5BA4CF";

  const boundaryColor = isDark
    ? ["interpolate", ["linear"], ["zoom"], 0, "rgba(100,120,160,0.3)", 4, "rgba(120,140,180,0.45)", 8, "rgba(140,160,200,0.6)"]
    : ["interpolate", ["linear"], ["zoom"], 0, "rgba(80,100,140,0.5)", 4, "rgba(60,80,120,0.6)", 8, "rgba(40,60,100,0.7)"];

  const countryLabelColor = isDark ? "rgba(200,200,220,0.65)" : "rgba(40,50,80,0.8)";
  const labelHalo         = isDark ? "rgba(2,1,17,0.95)"      : "rgba(240,237,228,0.95)";
  const capitalColor      = isDark ? "rgba(230,220,180,0.9)"  : "rgba(40,40,60,0.9)";
  const cityLargeColor    = isDark
    ? ["interpolate", ["linear"], ["zoom"], 3, "rgba(200,190,150,0.7)", 7, "rgba(220,210,170,0.9)"]
    : ["interpolate", ["linear"], ["zoom"], 3, "rgba(60,60,90,0.7)",   7, "rgba(40,40,70,0.9)"];
  const cityMedColor      = isDark ? "rgba(190,185,155,0.75)" : "rgba(70,70,100,0.75)";
  const townColor         = isDark ? "rgba(170,165,140,0.6)"  : "rgba(80,80,110,0.6)";
  const stateColor        = isDark ? "rgba(160,170,200,0.45)" : "rgba(80,90,130,0.5)";

  return {
    version: 8,
    name: isDark ? "Lukeni Night Globe" : "Lukeni Day Globe",
    projection: { type: "globe" as const },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
    },
    sky: {
      "atmosphere-blend": [
        "interpolate", ["linear"], ["zoom"], 0, 1, 5, 0,
      ] as maplibregl.ExpressionSpecification,
    },
    layers: [
      {
        id: "background", type: "background",
        paint: { "background-color": bg },
      },
      {
        id: "water", type: "fill", source: "openmaptiles", "source-layer": "water",
        paint: { "fill-color": water },
      },
      {
        id: "land", type: "fill", source: "openmaptiles", "source-layer": "land",
        paint: { "fill-color": land },
      },
      {
        id: "landuse-residential", type: "fill", source: "openmaptiles", "source-layer": "landuse",
        filter: ["==", ["get", "class"], "residential"],
        paint: {
          "fill-color": residential,
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 10, 0.6] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "landuse-park", type: "fill", source: "openmaptiles", "source-layer": "landuse",
        filter: ["in", ["get", "class"], ["literal", ["park", "forest", "nature_reserve"]]],
        paint: {
          "fill-color": park,
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 0.5] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "country-boundary", type: "line", source: "openmaptiles", "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": boundaryColor as maplibregl.ExpressionSpecification,
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 4, 0.9, 8, 1.8] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "country-boundary-glow", type: "line", source: "openmaptiles", "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": isDark ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.12)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 4, 3, 8, 5] as maplibregl.ExpressionSpecification,
          "line-blur": 3,
        },
      },
      {
        id: "region-boundary", type: "line", source: "openmaptiles", "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 4],
        minzoom: 4,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": isDark ? "rgba(100,120,160,0.15)" : "rgba(100,120,160,0.3)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.3, 8, 0.8] as maplibregl.ExpressionSpecification,
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "road-motorway", type: "line", source: "openmaptiles", "source-layer": "transportation",
        filter: ["==", ["get", "class"], "motorway"],
        minzoom: 5,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["interpolate", ["linear"], ["zoom"],
            5, isDark ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.4)",
            9, isDark ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.65)",
            12, isDark ? "rgba(212,175,55,0.65)" : "rgba(212,175,55,0.85)",
          ] as maplibregl.ExpressionSpecification,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 8, 2, 12, 4] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "waterway", type: "line", source: "openmaptiles", "source-layer": "waterway",
        minzoom: 5,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": waterway,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 10, 2, 14, 4] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "place-country-label", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["==", ["get", "class"], "country"],
        maxzoom: 6,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 3, 12, 5, 15] as maplibregl.ExpressionSpecification,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.15,
          "text-max-width": 8,
        },
        paint: {
          "text-color": countryLabelColor,
          "text-halo-color": labelHalo,
          "text-halo-width": 2,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 3, 0.7, 5, 1] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "place-state-label", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["==", ["get", "class"], "state"],
        minzoom: 4, maxzoom: 8,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 8, 7, 11] as maplibregl.ExpressionSpecification,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.1,
          "text-max-width": 6,
        },
        paint: {
          "text-color": stateColor,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "place-capital", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["==", ["get", "capital"], 2],
        minzoom: 2,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 2, 8, 4, 11, 7, 14] as maplibregl.ExpressionSpecification,
          "text-anchor": "top",
          "text-offset": [0, 0.4] as [number, number],
          "text-max-width": 8,
        },
        paint: {
          "text-color": capitalColor,
          "text-halo-color": labelHalo,
          "text-halo-width": 2,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 0.7, 5, 1] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "place-city-large", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["all",
          ["==", ["get", "class"], "city"],
          [">=", ["coalesce", ["get", "rank"], 99], 1],
          ["<=", ["coalesce", ["get", "rank"], 99], 5],
        ],
        minzoom: 3,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 7, 6, 11, 9, 14] as maplibregl.ExpressionSpecification,
          "text-anchor": "top",
          "text-offset": [0, 0.3] as [number, number],
          "text-max-width": 8,
        },
        paint: {
          "text-color": cityLargeColor as maplibregl.ExpressionSpecification,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.8,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4, 0.6, 6, 1] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "place-city-medium", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["all",
          ["in", ["get", "class"], ["literal", ["city", "town"]]],
          [">=", ["coalesce", ["get", "rank"], 99], 6],
          ["<=", ["coalesce", ["get", "rank"], 99], 10],
        ],
        minzoom: 6,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 6, 8, 10, 12] as maplibregl.ExpressionSpecification,
          "text-anchor": "top",
          "text-offset": [0, 0.25] as [number, number],
          "text-max-width": 6,
        },
        paint: {
          "text-color": cityMedColor,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.5,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 7, 0.6, 9, 1] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "place-town-small", type: "symbol", source: "openmaptiles", "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["town", "village"]]],
        minzoom: 9,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 9, 7, 13, 11] as maplibregl.ExpressionSpecification,
          "text-max-width": 5,
        },
        paint: {
          "text-color": townColor,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.2,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0, 10, 0.7] as maplibregl.ExpressionSpecification,
        },
      },
    ],
  } as unknown as maplibregl.StyleSpecification;
}

// ─── GeoJSON Builders ─────────────────────────────────────────────────────────

function buildMarkersGeoJSON(
  countries: CountryMusicData[],
  selectedCountry: string | null,
  activeEra: number | null
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = countries.map((data) => {
    const has = data.track_count > 0;
    const r = markerRadius(data.track_count);
    const color = has ? data.dominant_color : "#334155";
    const op = eraOpacity(data.eras, activeEra, has);
    const isSel = data.country_code === selectedCountry;
    const [cr, cg, cb] = hexToRgb(color);
    const [gr, gg, gb] = hexToRgb(GOLD_COLOR);

    return {
      type: "Feature",
      id: data.city ? `${data.country_code}::${data.city}` : data.country_code,
      geometry: { type: "Point", coordinates: [data.lng, data.lat] },
      properties: {
        code: data.country_code,
        city: data.city,
        cluster_name: data.cluster_name,
        is_cluster: data.is_cluster,
        name_fr: data.country_name_fr,
        name_en: data.country_name_en,
        has,
        radius: isSel ? r + 4 : r,
        halo_radius: isSel ? r + 18 : r + 8,
        fill_color: isSel
          ? "rgba(255,255,255,0.95)"
          : has
          ? `rgba(${cr},${cg},${cb},${0.75 * op})`
          : "rgba(51,65,85,0.15)",
        ring_color: isSel ? GOLD_COLOR : has ? color : "#475569",
        ring_width: isSel ? 3 : has ? 1.5 : 0.8,
        ring_opacity: op,
        halo_color: isSel
          ? `rgba(${gr},${gg},${gb},0.18)`
          : has
          ? `rgba(${cr},${cg},${cb},${0.12 * op})`
          : "rgba(0,0,0,0)",
        track_count: data.track_count,
        genres: JSON.stringify(data.genres ?? []),
        eras: JSON.stringify(data.eras ?? []),
        dominant_color: data.dominant_color ?? GOLD_COLOR,
        is_selected: isSel,
        opacity: op,
        region: data.region || "africa",
      },
    };
  });

  return { type: "FeatureCollection", features };
}

function buildLabelsGeoJSON(
  selectedCountry: string | null,
  countries: CountryMusicData[],
  lang: "fr" | "en"
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = countries.map((data) => {
    const isSel = data.country_code === selectedCountry;
    return {
      type: "Feature",
      id: `${data.country_code}_label`,
      geometry: {
        type: "Point",
        coordinates: [data.lng + (isSel ? 1.5 : 0.8), data.lat],
      },
      properties: {
        code: data.country_code,
        text: lang === "fr" ? data.country_name_fr : data.country_name_en,
        has: data.track_count > 0,
        is_selected: isSel,
      },
    };
  });
  return { type: "FeatureCollection", features };
}

function buildRelationsGeoJSON(relations: any[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  console.log("🔍 buildRelationsGeoJSON input:", relations.length, "relations");

  for (const rel of relations) {
    const oLat = rel.origin_lat;
    const oLng = rel.origin_lng;
    const dLat = rel.derived_lat;
    const dLng = rel.derived_lng;

    console.log("📍 Relation:", {
      origin: rel.origin_genre?.nom_fr,
      derived: rel.derived_genre?.nom_fr,
      oLat, oLng, dLat, dLng,
      valid: oLat != null && oLng != null && dLat != null && dLng != null
    });

    if (oLat == null || oLng == null || dLat == null || dLng == null) {
      console.warn("⚠️ Relation ignorée (coords manquantes):", rel.origin_genre?.nom_fr, "→", rel.derived_genre?.nom_fr);
      continue;
    }

    features.push({
      type: "Feature",
      id: rel.id,
      geometry: {
        type: "LineString",
        coordinates: [[oLng, oLat], [dLng, dLat]],
      },
      properties: {
        relation_type: rel.relation_type || "influence",
        origin_name: rel.origin_genre?.nom_fr || "",
        derived_name: rel.derived_genre?.nom_fr || "",
        origin_lat: oLat,
        origin_lng: oLng,
        derived_lat: dLat,
        derived_lng: dLng,
        description_fr: rel.description_fr || "",
        description_en: rel.description_en || "",
      },
    });
  }

  console.log("✅ buildRelationsGeoJSON output:", features.length, "features");
  return { type: "FeatureCollection", features };
}

function buildRipplesGeoJSON(
  playingCountry: string | null,
  countries: CountryMusicData[],
  ripplePhases: [number, number, number]
): GeoJSON.FeatureCollection {
  if (!playingCountry) return { type: "FeatureCollection", features: [] };
  const country = countries.find((c) => c.country_code === playingCountry);
  if (!country) return { type: "FeatureCollection", features: [] };

  const color = country.dominant_color ?? GOLD_COLOR;
  const [cr, cg, cb] = hexToRgb(color);

  const features: GeoJSON.Feature[] = [
    { expand: 35, delay: 0 },
    { expand: 48, delay: 0.32 },
    { expand: 60, delay: 0.64 },
  ].map(({ expand, delay }, i) => {
    const t = (ripplePhases[i] + delay) % 1;
    const ease = 1 - (1 - t) ** 2;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [country.lng, country.lat] },
      properties: {
        radius: 10 + ease * expand,
        opacity: 0.55 * (1 - ease),
        color: `rgba(${cr},${cg},${cb},1)`,
        width: Math.max(0.3, 2 * (1 - ease)),
      },
    };
  });

  return { type: "FeatureCollection", features };
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function makeTooltipHTML(
  code: string,
  countries: CountryMusicData[],
  lang: "fr" | "en",
  activeEra: number | null
): string {
  const data = countries.find(
    (c) => c.country_code === code || c.cluster_name === code
  );
  if (!data) return "";

  const name = lang === "fr" ? data.country_name_fr : data.country_name_en;
  const has = data.track_count > 0;
  const locationName = data.city ? `${data.city}, ${name}` : name;
  const isAfrica = data.region === "africa" || !data.region;

  const regionBadge = data.region
    ? `<span style="font-size:8px;padding:1px 6px;border-radius:100px;
        background:${isAfrica ? "rgba(212,175,55,.2)" : "rgba(100,120,160,.2)"};
        color:${isAfrica ? "#D4AF37" : "rgba(255,255,255,.5)"};
        font-weight:600;text-transform:uppercase;letter-spacing:.04em;
        border:1px solid ${isAfrica ? "rgba(212,175,55,.3)" : "transparent"};">
        ${isAfrica
          ? (lang === "fr" ? "🌍 Berceau" : "🌍 Source")
          : (lang === "fr" ? "🌐 Diaspora" : "🌐 Diaspora")}
      </span>`
    : "";

  if (!has) {
    return `<div style="background:rgba(2,1,17,.92);border:1px solid rgba(255,255,255,.08);
      border-radius:12px;padding:10px 14px;backdrop-filter:blur(8px);">
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0 0 4px;font-weight:600;">${locationName}</p>
      ${regionBadge}
      <p style="color:rgba(255,255,255,.25);font-size:10px;margin:6px 0 0;font-style:italic;">
        ${lang === "fr" ? "Soyez le premier à contribuer" : "Be the first to contribute"} ✨
      </p></div>`;
  }

  const label =
    data.track_count > 1
      ? lang === "fr" ? "morceaux" : "tracks"
      : lang === "fr" ? "morceau" : "track";

  const genreBadges = (data.genres ?? [])
    .slice(0, 4)
    .map(
      (g) =>
        `<span style="font-size:9px;padding:2px 8px;border-radius:100px;
          background:rgba(212,175,55,.12);color:#D4AF37;font-weight:600;
          text-transform:uppercase;letter-spacing:.04em;
          border:1px solid rgba(212,175,55,.15);">${g}</span>`
    )
    .join("");

  const eraBadges =
    data.eras?.length
      ? `<div style="margin-top:6px;display:flex;gap:3px;flex-wrap:wrap;">
          ${data.eras
            .map(
              (e) =>
                `<span style="font-size:9px;padding:2px 6px;border-radius:100px;
                  background:${e === activeEra ? "rgba(212,175,55,.3)" : "rgba(255,255,255,.06)"};
                  color:${e === activeEra ? "#D4AF37" : "rgba(255,255,255,.4)"};
                  font-weight:${e === activeEra ? 700 : 500};
                  border:1px solid ${e === activeEra ? "rgba(212,175,55,.4)" : "transparent"};">
                  ${e}s</span>`
            )
            .join("")}
        </div>`
      : "";

  return `<div style="background:rgba(2,1,17,.95);border:1px solid rgba(212,175,55,.25);
    border-radius:14px;padding:12px 16px;min-width:170px;backdrop-filter:blur(12px);
    box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px rgba(212,175,55,.1);">
    <p style="color:${GOLD_COLOR};font-size:10px;font-weight:800;text-transform:uppercase;
      letter-spacing:.18em;margin:0 0 6px;">${locationName}</p>
    ${regionBadge}
    <p style="color:#fff;font-size:15px;font-weight:700;margin:8px 0;font-variant-numeric:tabular-nums;">
      ${fmt(data.track_count, lang)}
      <span style="font-size:11px;font-weight:400;color:rgba(255,255,255,.5);margin-left:3px;">${label}</span>
    </p>
    <div style="display:flex;gap:4px;flex-wrap:wrap;">${genreBadges}</div>
    ${eraBadges}
  </div>`;
}

// ─── Modal Relation Genres ────────────────────────────────────────────────────

function RelationTooltip({
  relation,
  lang,
  onClose,
}: {
  relation: any;
  lang: "fr" | "en";
  onClose: () => void;
}) {
  const relationType = relation.relation_type || "influence";
  const icons: Record<string, string> = {
    influence: "💡",
    derived_from: "🔄",
    fusion: "🔀",
    migration: "🚀",
  };
  const labels: Record<string, { fr: string; en: string }> = {
    influence: { fr: "Influence", en: "Influence" },
    derived_from: { fr: "Dérivé de", en: "Derived from" },
    fusion: { fr: "Fusion", en: "Fusion" },
    migration: { fr: "Migration", en: "Migration" },
  };

  const description = lang === "fr" ? relation.description_fr : relation.description_en;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#020111] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        {/* Handle mobile */}
        <div className="sm:hidden w-12 h-1 bg-white/20 rounded-full mx-auto my-3" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <span className="text-2xl">{icons[relationType]}</span>
              {labels[relationType][lang]}
            </h3>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-gray-500 hover:text-white transition-colors touch-manipulation"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="text-center flex-1">
                <p className="text-white text-sm sm:text-base font-semibold mb-1">
                  {relation.origin_name}
                </p>
                <p className="text-[9px] sm:text-xs text-gray-500 uppercase tracking-wider">
                  {lang === "fr" ? "Origine" : "Origin"}
                </p>
              </div>
              <span className="text-2xl mx-3">→</span>
              <div className="text-center flex-1">
                <p className="text-white text-sm sm:text-base font-semibold mb-1">
                  {relation.derived_name}
                </p>
                <p className="text-[9px] sm:text-xs text-gray-500 uppercase tracking-wider">
                  {lang === "fr" ? "Dérivé" : "Derived"}
                </p>
              </div>
            </div>

            {description && (
              <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  {description}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-[#D4AF37] text-black rounded-lg font-bold text-sm hover:bg-[#E5C158] transition-colors touch-manipulation"
            style={{ minHeight: 44 }}
          >
            {lang === "fr" ? "Fermer" : "Close"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── StarField ────────────────────────────────────────────────────────────────

interface StarData {
  id: number; x: number; y: number;
  size: number; duration: number; delay: number; depth: number;
}

const StarField = memo(function StarField({
  mousePos,
  visible,
}: {
  mousePos: { x: number; y: number };
  visible: boolean;
}) {
  const [stars, setStars] = useState<StarData[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 180 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.4,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 4,
        depth: Math.random() * 20 + 5,
      }))
    );
  }, []);

  if (!visible || stars.length === 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes lukeni-star-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
      `}</style>
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: "absolute",
            left: `${star.x}%`, top: `${star.y}%`,
            width: star.size, height: star.size,
            borderRadius: "50%",
            background: "white",
            boxShadow: star.size > 1.4 ? `0 0 ${star.size * 3}px rgba(255,255,255,0.7)` : undefined,
            transform: `translate(${mousePos.x * star.depth}px, ${mousePos.y * star.depth}px)`,
            transition: "transform 0.9s cubic-bezier(0.25,0.46,0.45,0.94)",
            animation: `lukeni-star-pulse ${star.duration}s ${star.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
});

// ─── Nebulae ──────────────────────────────────────────────────────────────────

const Nebulae = memo(function Nebulae({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <style>{`
        @keyframes lukeni-nebula {
          0%, 100% { opacity: 0.35; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%,-50%) scale(1.15); }
        }
      `}</style>
      {[
        { x: 5, y: 10, size: 300, color: "#9370DB", dur: 12, delay: 0 },
        { x: 82, y: 12, size: 260, color: "#D4AF37", dur: 15, delay: 1.5 },
        { x: 62, y: 78, size: 240, color: "#20B2AA", dur: 10, delay: 3 },
        { x: 12, y: 72, size: 200, color: "#FF6B9D", dur: 14, delay: 4.5 },
        { x: 88, y: 48, size: 180, color: "#6478A0", dur: 11, delay: 2 },
      ].map((n, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${n.x}%`, top: `${n.y}%`,
            width: n.size, height: n.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${n.color}18 0%, transparent 70%)`,
            filter: "blur(45px)",
            transform: "translate(-50%, -50%)",
            animation: `lukeni-nebula ${n.dur}s ${n.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
});

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend = memo(function Legend({ lang, theme }: { lang: "fr" | "en"; theme: "dark" | "light" }) {
  const isDark = theme === "dark";
  const bg = isDark ? "rgba(2,1,17,.88)" : "rgba(255,255,255,.88)";
  const border = isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)";
  const titleColor = isDark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)";
  const labelColor = isDark ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.5)";
  const noteColor = isDark ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.2)";

  const items = [
    {
      dot: <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: GOLD_COLOR, boxShadow: "0 0 6px rgba(212,175,55,.5)" }} />,
      label: lang === "fr" ? "Musique disponible (Afrique)" : "Music available (Africa)",
    },
    {
      dot: <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#6478A0", boxShadow: "0 0 6px rgba(100,120,160,.5)" }} />,
      label: lang === "fr" ? "Musique disponible (Diaspora)" : "Music available (Diaspora)",
    },
    {
      dot: <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#334155", border: "1px solid #475569" }} />,
      label: lang === "fr" ? "En attente" : "Awaiting",
    },
    {
      dot: <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: isDark ? "#fff" : "#111", border: `2px solid ${GOLD_COLOR}`, boxShadow: "0 0 8px rgba(212,175,55,.6)" }} />,
      label: lang === "fr" ? "Sélectionné" : "Selected",
    },
  ];

  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16, zIndex: 10,
      pointerEvents: "none", userSelect: "none",
      background: bg, backdropFilter: "blur(12px)",
      border: `1px solid ${border}`, borderRadius: 12, padding: "10px 14px",
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".15em", color: titleColor, margin: "0 0 6px" }}>
        {lang === "fr" ? "Légende" : "Legend"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {it.dot}
            <span style={{ fontSize: 10, color: labelColor }}>{it.label}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 8, color: noteColor, margin: "6px 0 0" }}>
        {lang === "fr" ? "Taille ∝ morceaux" : "Size ∝ tracks"}
      </p>
    </div>
  );
});

// ─── ViewModeToggle ───────────────────────────────────────────────────────────

const ViewModeToggle = memo(function ViewModeToggle({
  viewMode, onChange, lang, theme,
}: {
  viewMode: "africa" | "world";
  onChange: (mode: "africa" | "world") => void;
  lang: "fr" | "en";
  theme: "dark" | "light";
}) {
  const isDark = theme === "dark";
  return (
    <div style={{
      position: "absolute", top: 16, left: 16, zIndex: 10,
      background: isDark ? "rgba(2,1,17,.88)" : "rgba(255,255,255,.88)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"}`,
      borderRadius: 12, padding: "4px",
    }}>
      <div style={{ display: "flex", gap: 2 }}>
        {(["africa", "world"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            style={{
              padding: "6px 12px", borderRadius: 8, border: "none",
              background: viewMode === mode ? "rgba(212,175,55,.2)" : "transparent",
              color: viewMode === mode ? GOLD_COLOR : isDark ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.5)",
              fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease",
            }}
          >
            {mode === "africa" ? "🌍" : "🌐"}{" "}
            {mode === "africa" ? (lang === "fr" ? "Afrique" : "Africa") : (lang === "fr" ? "Monde" : "World")}
          </button>
        ))}
      </div>
    </div>
  );
});

// ─── Controles Supérieurs ────────────────────────────────────────────────────

const MapControls = memo(function MapControls({
  showRelations,
  onToggleRelations,
  onGeolocate,
  isGeolocating,
  lang,
  theme,
}: {
  showRelations: boolean;
  onToggleRelations: () => void;
  onGeolocate: () => void;
  isGeolocating: boolean;
  lang: "fr" | "en";
  theme: "dark" | "light";
}) {
  const isDark = theme === "dark";

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      {/* Toggle Relations */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleRelations}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid rgba(212,175,55,0.3)",
          background: showRelations ? "rgba(212,175,55,0.2)" : "rgba(2,1,17,0.88)",
          color: showRelations ? "#D4AF37" : "rgba(255,255,255,0.6)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {showRelations ? <Eye size={14} /> : <EyeOff size={14} />}
        <span style={{ fontSize: 11 }}>
          {lang === "fr"
            ? showRelations ? "Masquer" : "Afficher"
            : showRelations ? "Hide" : "Show"}{" "}
          {lang === "fr" ? "migrations" : "migrations"}
        </span>
      </motion.button>

      {/* Geolocate */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onGeolocate}
        disabled={isGeolocating}
        style={{
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid rgba(100,200,255,0.3)",
          background: "rgba(2,1,17,0.88)",
          color: isGeolocating ? "rgba(100,200,255,0.5)" : "rgba(100,200,255,0.8)",
          fontSize: 12,
          fontWeight: 600,
          cursor: isGeolocating ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          opacity: isGeolocating ? 0.6 : 1,
        }}
      >
        {isGeolocating ? (
          <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <Navigation size={14} />
          </motion.span>
        ) : (
          <Navigation size={14} />
        )}
        <span style={{ fontSize: 11 }}>
          {lang === "fr" ? "Ma position" : "My location"}
        </span>
      </motion.button>
    </div>
  );
});

// ─── Ajout des layers personnalisés ───────────────────────────────────────────

function addCustomSourcesAndLayers(map: maplibregl.Map) {
  // Relations entre genres
  if (!map.getSource(SRC_RELATIONS)) {
    map.addSource(SRC_RELATIONS, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // Markers (avec clustering)
  if (!map.getSource(SRC_MARKERS)) {
    map.addSource(SRC_MARKERS, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 14,
    });
  }

  // Labels
  if (!map.getSource(SRC_TEXT_LABELS)) {
    map.addSource(SRC_TEXT_LABELS, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // Ripples
  if (!map.getSource(SRC_RIPPLES)) {
    map.addSource(SRC_RIPPLES, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  // ── Relations lignes ──
  // ── Relations lignes ──
  if (!map.getLayer(LYR_RELATIONS)) {
    const isMobile = isMobileDevice();
    map.addLayer({
      id: LYR_RELATIONS,
      type: "line",
      source: SRC_RELATIONS,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "match", ["get", "relation_type"],
          "influence", "#D4AF37",
          "derived_from", "#9370DB",
          "fusion", "#4ECDC4",
          "migration", "#FF6B9D",
          "#D4AF37",
        ] as maplibregl.ExpressionSpecification,
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          1, isMobile ? 2 : 0.8,
          5, isMobile ? 3 : 1.5,
          10, isMobile ? 5 : 3,
        ] as maplibregl.ExpressionSpecification,
        "line-opacity": isMobile ? 0.7 : 0.5,
        "line-dasharray": [2, 2],
      },
    });
  }

  // ── Relations hit area (zone cliquable invisible plus large) ──
  if (!map.getLayer(`${LYR_RELATIONS}-hitarea`)) {
    map.addLayer({
      id: `${LYR_RELATIONS}-hitarea`,
      type: "line",
      source: SRC_RELATIONS,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "transparent",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          1, 15, 5, 25, 10, 40,
        ] as maplibregl.ExpressionSpecification,
        "line-opacity": 0,
      },
    });
  }

  // ── Cluster circles ──

  
if (!map.getLayer(`${LYR_RELATIONS}-hitarea`)) {
  map.addLayer({
    id: `${LYR_RELATIONS}-hitarea`,
    type: "line",
    source: SRC_RELATIONS,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "transparent",
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        1, 15, 5, 20, 10, 30, // Beaucoup plus large
      ] as maplibregl.ExpressionSpecification,
      "line-opacity": 0,
    },
  });
}

  // ── Cluster circles ──
  if (!map.getLayer(LYR_CLUSTER_CIRCLE)) {
    map.addLayer({
      id: LYR_CLUSTER_CIRCLE,
      type: "circle",
      source: SRC_MARKERS,
      filter: ["has", "point_count"] as maplibregl.ExpressionSpecification,
      paint: {
        "circle-color": "#D4AF37",
        "circle-radius": [
          "step", ["get", "point_count"],
          18, 5, 22, 15, 28, 30, 34,
        ] as maplibregl.ExpressionSpecification,
        "circle-opacity": 0.7,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#D4AF3788",
      },
    });
  }

  // ── Cluster count ──
  if (!map.getLayer(LYR_CLUSTER_COUNT)) {
    map.addLayer({
      id: LYR_CLUSTER_COUNT,
      type: "symbol",
      source: SRC_MARKERS,
      filter: ["has", "point_count"] as maplibregl.ExpressionSpecification,
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans Bold"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#000000",
      },
    });
  }

  // ── Halo ──
  if (!map.getLayer(LYR_HALO_FILL)) {
    map.addLayer({
      id: LYR_HALO_FILL,
      type: "circle",
      source: SRC_MARKERS,
      filter: ["!", ["has", "point_count"]] as maplibregl.ExpressionSpecification,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          1, ["+", ["*", ["get", "radius"], 0.5], 6],
          5, ["+", ["*", ["get", "radius"], 1], 10],
          10, ["+", ["*", ["get", "radius"], 2], 14],
        ] as maplibregl.ExpressionSpecification,
        "circle-color": [
          "case", ["get", "has"], "#D4AF37", "rgba(255,255,255,0.08)",
        ] as maplibregl.ExpressionSpecification,
        "circle-opacity": ["case", ["get", "has"], 0.12, 0.06] as maplibregl.ExpressionSpecification,
        "circle-blur": 1,
      },
    });
  }

  // ── Marker fill ──
  if (!map.getLayer(LYR_MARKER_FILL)) {
    map.addLayer({
      id: LYR_MARKER_FILL,
      type: "circle",
      source: SRC_MARKERS,
      filter: ["!", ["has", "point_count"]] as maplibregl.ExpressionSpecification,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          1, ["+", ["*", ["get", "radius"], 0.4], 3],
          5, ["+", ["*", ["get", "radius"], 0.8], 5],
          10, ["+", ["*", ["get", "radius"], 1.5], 8],
        ] as maplibregl.ExpressionSpecification,
        "circle-color": [
          "case", ["get", "has"], "#D4AF37", "rgba(255,255,255,0.15)",
        ] as maplibregl.ExpressionSpecification,
        "circle-opacity": ["case", ["get", "has"], 0.9, 0.3] as maplibregl.ExpressionSpecification,
      },
    });
  }

  // ── Marker ring ──
  if (!map.getLayer(LYR_MARKER_RING)) {
    map.addLayer({
      id: LYR_MARKER_RING,
      type: "circle",
      source: SRC_MARKERS,
      filter: ["!", ["has", "point_count"]] as maplibregl.ExpressionSpecification,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          1, ["+", ["*", ["get", "radius"], 0.5], 5],
          5, ["+", ["*", ["get", "radius"], 1], 7],
          10, ["+", ["*", ["get", "radius"], 2], 12],
        ] as maplibregl.ExpressionSpecification,
        "circle-color": "#D4AF37",
        "circle-opacity": ["case", ["get", "has"], 0.4, 0] as maplibregl.ExpressionSpecification,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#D4AF3755",
        "circle-stroke-opacity": 0.6,
      },
    });
  }

  // ── Country labels ──
  if (!map.getLayer(LYR_COUNTRY_LABELS)) {
    map.addLayer({
      id: LYR_COUNTRY_LABELS,
      type: "symbol",
      source: SRC_TEXT_LABELS,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Semibold"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          1, 9, 3, 11, 6, 14,
        ] as maplibregl.ExpressionSpecification,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-optional": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-opacity": 0.8,
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
    });
  }

  // ── Ripples ──
  if (!map.getLayer(LYR_RIPPLE)) {
    map.addLayer({
      id: LYR_RIPPLE,
      type: "circle",
      source: SRC_RIPPLES,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["get", "progress"],
          0, 5, 1, 50,
        ] as maplibregl.ExpressionSpecification,
        "circle-color": "#D4AF37",
        "circle-opacity": [
          "interpolate", ["linear"], ["get", "progress"],
          0, 0.5, 1, 0,
        ] as maplibregl.ExpressionSpecification,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#D4AF37",
        "circle-stroke-opacity": [
          "interpolate", ["linear"], ["get", "progress"],
          0, 0.6, 1, 0,
        ] as maplibregl.ExpressionSpecification,
      },
    });
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MusicMap({
  countries,
  selectedCountry,
  activeEra,
  lang,
  onCountrySelect,
  playingCountry,
  viewMode = "africa",
  onViewModeChange,
  theme = "dark",
  genreRelations = [],
}: MusicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const animRef = useRef<number>(0);
  const ripplePhase = useRef<number>(0);
  const prevThemeRef = useRef<"dark" | "light">(theme);
  const genreRelationsRef = useRef(genreRelations);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showRelations, setShowRelations] = useState(true);
  const [selectedRelation, setSelectedRelation] = useState<any | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const onCountrySelectRef = useRef(onCountrySelect);
  const countriesRef = useRef(countries);
  const langRef = useRef(lang);
  const activeEraRef = useRef(activeEra);
  const selectedRef = useRef(selectedCountry);

  useEffect(() => { onCountrySelectRef.current = onCountrySelect; }, [onCountrySelect]);
  useEffect(() => { countriesRef.current = countries; }, [countries]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { activeEraRef.current = activeEra; }, [activeEra]);
  useEffect(() => { selectedRef.current = selectedCountry; }, [selectedCountry]);
  useEffect(() => { genreRelationsRef.current = genreRelations; }, [genreRelations]);

  // Mouse parallax
  useEffect(() => {
    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMousePos({
          x: e.clientX / window.innerWidth - 0.5,
          y: e.clientY / window.innerHeight - 0.5,
        });
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Inject CSS
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("lukeni-map-css")) return;
    const s = document.createElement("style");
    s.id = "lukeni-map-css";
    s.textContent = `
      .lukeni-popup .maplibregl-popup-content {
        background: transparent !important; border: none !important;
        box-shadow: none !important; padding: 0 !important;
      }
      .lukeni-popup .maplibregl-popup-tip { display: none !important; }
      .maplibregl-ctrl-attrib { font-size: 9px !important; }
    `;
    document.head.appendChild(s);
  }, []);

  // ── Geolocate ─────────────────────────────────────────────────────────────
  const handleGeolocate = useCallback(() => {
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 5,
            duration: 1500,
          });
        }
        setIsGeolocating(false);
      },
      () => {
        console.warn("Géolocalisation refusée");
        setIsGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildGlobeStyle(theme),
      center: viewMode === "world" ? [0, 20] : [20, 2],
      zoom: viewMode === "world" ? 1.5 : 2.8,
      minZoom: 1,
      maxZoom: 14,
    });

    map.on('error', (e: any) => {
      console.warn('⚠️ Map error:', e?.error?.message || e);
    });

    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (e) => {
        console.warn('⚠️ WebGL context lost');
        e.preventDefault();
      });
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('✅ WebGL context restored');
        map.resize();
        setTimeout(() => {
          const source = map.getSource(SRC_RELATIONS);
          if (source && genreRelationsRef.current.length > 0) {
            (source as maplibregl.GeoJSONSource).setData(
              buildRelationsGeoJSON(genreRelationsRef.current)
            );
          }
        }, 500);
      });
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("load", () => {
      addCustomSourcesAndLayers(map);

      // Clic sur cluster → zoom dedans
      map.on("click", LYR_CLUSTER_CIRCLE, (e) => {
        const features = e.features;
        if (!features?.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(SRC_MARKERS) as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
          const coords = (features[0].geometry as GeoJSON.Point).coordinates;
          map.easeTo({ center: [coords[0], coords[1]], zoom: zoom + 1 });
        }).catch(() => {});
      });

      // Hover cluster
      map.on("mouseenter", LYR_CLUSTER_CIRCLE, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LYR_CLUSTER_CIRCLE, () => {
        map.getCanvas().style.cursor = "";
      });

      // Hover markers
      map.on("mouseenter", LYR_MARKER_FILL, (e) => {
        map.getCanvas().style.cursor =
          e.features?.[0]?.properties?.has ? "pointer" : "cell";
      });
      map.on("mouseleave", LYR_MARKER_FILL, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
        popupRef.current = null;
      });

      // Tooltip markers
      map.on("mousemove", LYR_MARKER_FILL, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const code = f.properties?.code as string;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "lukeni-popup",
          offset: [0, -((f.properties?.radius ?? 10) + 8)] as [number, number],
          maxWidth: "260px",
        })
          .setLngLat(e.lngLat)
          .setHTML(makeTooltipHTML(code, countriesRef.current, langRef.current, activeEraRef.current))
          .addTo(map);
      });

      // Clic sur marker individuel
      map.on("click", LYR_MARKER_FILL, (e) => {
        const code = e.features?.[0]?.properties?.code as string | undefined;
        const city = e.features?.[0]?.properties?.city as string | undefined;
        if (code) {
          const clusterId = city ? `${code}::${city}` : code;
          onCountrySelectRef.current(clusterId);
        }
      });

          // ── Relations events ──
      const relationLayers = [LYR_RELATIONS, `${LYR_RELATIONS}-hitarea`];
      const isMobile = isMobileDevice();

      relationLayers.forEach(layerId => {
        if (!isMobile) {
          // Desktop: tooltip au survol
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
            popupRef.current?.remove();
            popupRef.current = null;
          });

          map.on("mousemove", layerId, (e) => {
            const f = e.features?.[0];
            if (!f || layerId.includes('hitarea')) return;

            const originName = f.properties?.origin_name as string;
            const derivedName = f.properties?.derived_name as string;
            const relationType = f.properties?.relation_type as string;

            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: "lukeni-popup",
              offset: [0, 10] as [number, number],
              maxWidth: "280px",
            })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="background:rgba(2,1,17,.95);border:1px solid rgba(212,175,55,.25);
                  border-radius:14px;padding:12px 16px;backdrop-filter:blur(12px);
                  box-shadow:0 8px 32px rgba(0,0,0,.4),0 0 0 1px rgba(212,175,55,.1);">
                  <p style="color:#D4AF37;font-size:10px;font-weight:800;text-transform:uppercase;
                    letter-spacing:.18em;margin:0 0 6px;">Connexion</p>
                  <p style="color:#fff;font-size:13px;font-weight:700;margin:8px 0;">
                    ${originName} 
                    <span style="color:#D4AF37;margin:0 4px;">→</span>
                    ${derivedName}
                  </p>
                  <p style="color:rgba(255,255,255,.5);font-size:11px;margin:6px 0 0;">
                    ${relationType === 'influence' ? '💡 Influence' : 
                      relationType === 'derived_from' ? '🔄 Dérivé de' : 
                      relationType === 'fusion' ? '🔀 Fusion' : 
                      relationType === 'migration' ? '🚀 Migration' : relationType}
                  </p>
                </div>
              `)
              .addTo(map);
          });
        }

        // Clic (mobile et desktop) - Ouvre la modal
        map.on("click", layerId, (e) => {
          e.preventDefault();
          const f = e.features?.[0];
          if (!f) return;
          
          // Fermer le popup si ouvert
          popupRef.current?.remove();
          popupRef.current = null;
          
          setSelectedRelation({
            origin_name: f.properties?.origin_name,
            derived_name: f.properties?.derived_name,
            relation_type: f.properties?.relation_type,
            description_fr: f.properties?.description_fr,
            description_en: f.properties?.description_en,
          });
        });

        // Touch events pour mobile
        if (isMobile) {
          map.on("touchstart", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          
          map.on("touchend", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      });

      // Données initiales

      // Données initiales
      getGeoJSONSource(map, SRC_MARKERS)?.setData(
        buildMarkersGeoJSON(countriesRef.current, selectedRef.current, activeEraRef.current)
      );
      getGeoJSONSource(map, SRC_TEXT_LABELS)?.setData(
        buildLabelsGeoJSON(selectedRef.current, countriesRef.current, langRef.current)
      );
    });

    mapRef.current = map;
    prevThemeRef.current = theme;

    return () => {
      cancelAnimationFrame(animRef.current);
      popupRef.current?.remove();
      try {
        map.remove();
      } catch (e) {
        console.warn('⚠️ Map remove error:', e);
      }
      mapRef.current = null;
    };
  }, []);

  // ── Changement de thème ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;

    map.once("load", () => {
      if (!map.getSource(SRC_MARKERS)) {
        addCustomSourcesAndLayers(map);
        // Re-attacher les events
        map.on("click", LYR_CLUSTER_CIRCLE, (e) => {
          const features = e.features;
          if (!features?.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource(SRC_MARKERS) as maplibregl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
            const coords = (features[0].geometry as GeoJSON.Point).coordinates;
            map.easeTo({ center: [coords[0], coords[1]], zoom: zoom + 1 });
          }).catch(() => {});
        });

        map.on("mouseenter", LYR_CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", LYR_CLUSTER_CIRCLE, () => { map.getCanvas().style.cursor = ""; });

        map.on("mouseenter", LYR_MARKER_FILL, (e) => {
          map.getCanvas().style.cursor = e.features?.[0]?.properties?.has ? "pointer" : "cell";
        });
        map.on("mouseleave", LYR_MARKER_FILL, () => {
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
          popupRef.current = null;
        });

        map.on("mousemove", LYR_MARKER_FILL, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const code = f.properties?.code as string;
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({
            closeButton: false, closeOnClick: false, className: "lukeni-popup",
            offset: [0, -((f.properties?.radius ?? 10) + 8)] as [number, number], maxWidth: "260px",
          })
            .setLngLat(e.lngLat)
            .setHTML(makeTooltipHTML(code, countriesRef.current, langRef.current, activeEraRef.current))
            .addTo(map);
        });

        map.on("click", LYR_MARKER_FILL, (e) => {
          const code = e.features?.[0]?.properties?.code as string | undefined;
          const city = e.features?.[0]?.properties?.city as string | undefined;
          if (code) {
            const clusterId = city ? `${code}::${city}` : code;
            onCountrySelectRef.current(clusterId);
          }
        });
      }

      getGeoJSONSource(map, SRC_MARKERS)?.setData(
        buildMarkersGeoJSON(countriesRef.current, selectedRef.current, activeEraRef.current)
      );
      getGeoJSONSource(map, SRC_TEXT_LABELS)?.setData(
        buildLabelsGeoJSON(selectedRef.current, countriesRef.current, langRef.current)
      );
    });

    map.setStyle(buildGlobeStyle(theme));
  }, [theme]);

  // ── Refresh markers/labels ─────────────────────────────────────────────────
  const refreshMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    getGeoJSONSource(map, SRC_MARKERS)?.setData(
      buildMarkersGeoJSON(countriesRef.current, selectedCountry, activeEraRef.current)
    );
  }, [selectedCountry]);

  const refreshLabels = useCallback(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    getGeoJSONSource(map, SRC_TEXT_LABELS)?.setData(
      buildLabelsGeoJSON(selectedCountry, countriesRef.current, langRef.current)
    );
  }, [selectedCountry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      refreshMarkers();
      refreshLabels();
    } else {
      map.once("load", () => { refreshMarkers(); refreshLabels(); });
    }
  }, [refreshMarkers, refreshLabels, countries, activeEra, lang]);

  // ── Refresh relations ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;

    const source = map.getSource(SRC_RELATIONS);
    if (!source) {
      console.warn("⚠️ SRC_RELATIONS source not found");
      return;
    }

    if (!showRelations) {
      (source as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
    } else {
      const geojson = buildRelationsGeoJSON(genreRelations);
      console.log("🗺️ Setting relations data:", geojson.features.length, "features");
      (source as maplibregl.GeoJSONSource).setData(geojson);
    }
  }, [genreRelations, showRelations]);

  // ── Fly to selected country ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCountry || !mapRef.current) return;
    const country = countries.find((c) => {
      const key = c.city ? `${c.country_code}::${c.city}` : c.country_code;
      return key === selectedCountry || c.country_code === selectedCountry;
    });
    if (!country) return;
    const map = mapRef.current;
    const dist = map
      .unproject(map.project([country.lng, country.lat]))
      .distanceTo(map.getCenter());

    if (dist > 500_000) {
      map.flyTo({
        center: [country.lng, country.lat],
        zoom: viewMode === "world" ? 3 : 5,
        duration: 1400,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    } else {
      map.easeTo({ center: [country.lng, country.lat], duration: 800 });
    }
  }, [selectedCountry, viewMode, countries]);

  // ── ViewMode fly ───────────────────────────────────────────────────────────
  useEffect(() => {
    mapRef.current?.flyTo({
      center: viewMode === "world" ? [0, 20] : [20, 2],
      zoom: viewMode === "world" ? 1.5 : 2.8,
      duration: 1200,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, [viewMode]);

  // ── Ripple animation ───────────────────────────────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(animRef.current);

    if (!playingCountry) {
      const map = mapRef.current;
      if (map?.isStyleLoaded())
        getGeoJSONSource(map, SRC_RIPPLES)?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    ripplePhase.current = 0;
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 2200;
      lastTs = ts;
      ripplePhase.current = (ripplePhase.current + dt) % 1;
      const map = mapRef.current;
      if (map?.isStyleLoaded()) {
        const p = ripplePhase.current;
        getGeoJSONSource(map, SRC_RIPPLES)?.setData(
          buildRipplesGeoJSON(playingCountry, countriesRef.current, [p, (p + 1 / 3) % 1, (p + 2 / 3) % 1])
        );
      }
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      const map = mapRef.current;
      if (map?.isStyleLoaded())
        getGeoJSONSource(map, SRC_RIPPLES)?.setData({ type: "FeatureCollection", features: [] });
    };
  }, [playingCountry]);

  const isDark = theme === "dark";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: isDark ? "#020111" : "#C8DCF0" }}>
      <Nebulae visible={isDark} />
      <StarField mousePos={mousePos} visible={isDark} />

      <div
        ref={containerRef}
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          borderRadius: "1rem", overflow: "hidden",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
        }}
      />

      {onViewModeChange && (
        <ViewModeToggle viewMode={viewMode} onChange={onViewModeChange} lang={lang} theme={theme} />
      )}
      
      <MapControls
        showRelations={showRelations}
        onToggleRelations={() => setShowRelations(!showRelations)}
        onGeolocate={handleGeolocate}
        isGeolocating={isGeolocating}
        lang={lang}
        theme={theme}
      />

      <Legend lang={lang} theme={theme} />

      <AnimatePresence>
        {selectedRelation && (
          <RelationTooltip
            relation={selectedRelation}
            lang={lang}
            onClose={() => setSelectedRelation(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}