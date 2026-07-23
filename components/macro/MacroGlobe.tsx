"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

interface MacroGlobeData {
  id: string;
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  lat: number;
  lng: number;
  category_id: string;
  indicator_fr: string;
  indicator_en: string;
  period_type: string;
  period_value: string;
  value: number;
  unit_fr?: string;
  unit_en?: string;
  trend?: string;
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

interface MacroGlobeRelation {
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
}

interface MacroGlobeProps {
  data: MacroGlobeData[];
  relations: MacroGlobeRelation[];
  lang: 'fr' | 'en';
  theme?: 'dark' | 'light';
  isMobile?: boolean;
}

const GOLD_COLOR = "#D4AF37";

function buildMapStyle(theme: 'dark' | 'light', isMobile: boolean): maplibregl.StyleSpecification {
  const isDark = theme === 'dark';

  return {
    version: 8,
    name: isMobile ? "Lukeni Macro Map 2D" : "Lukeni Macro Globe 3D",
    ...(isMobile ? {} : { projection: { type: "globe" as const } }),
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
    },
    sky: isMobile ? undefined : {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 0] as maplibregl.ExpressionSpecification,
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": isDark ? "#020111" : "#C8DCF0" },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": isDark ? "#060d1f" : "#5BA4CF" },
      },
      {
        id: "land",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: ["==", ["get", "class"], "residential"],
        paint: {
          "fill-color": isDark ? "#1a2535" : "#F0EDE4",
          "fill-opacity": 0.5,
        },
      },
      {
        id: "country-boundary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": isDark ? "rgba(100,120,160,0.3)" : "rgba(80,100,140,0.5)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.4, 4, 0.9, 8, 1.8] as maplibregl.ExpressionSpecification,
        },
      },
      {
        id: "country-boundary-glow",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["==", ["get", "admin_level"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": isDark ? "rgba(212,175,55,0.06)" : "rgba(212,175,55,0.12)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.5, 4, 3, 8, 5] as maplibregl.ExpressionSpecification,
          "line-blur": 3,
        },
      },
      {
        id: "place-country-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "country"],
        maxzoom: 6,
        layout: {
          "text-field": ["coalesce", ["get", "name:fr"], ["get", "name"]] as maplibregl.ExpressionSpecification,
          "text-font": ["literal", ["Open Sans Bold"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 3, 12, 5, 15] as maplibregl.ExpressionSpecification,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.15,
          "text-max-width": 8,
        },
        paint: {
          "text-color": isDark ? "rgba(200,200,220,0.65)" : "rgba(40,50,80,0.8)",
          "text-halo-color": isDark ? "rgba(2,1,17,0.95)" : "rgba(240,237,228,0.95)",
          "text-halo-width": 2,
        },
      },
    ],
  } as unknown as maplibregl.StyleSpecification;
}

export default function MacroGlobe({ data, relations, lang, theme = 'dark', isMobile = false }: MacroGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  console.log('🗺️ MacroGlobe render - data:', data.length, 'items');
  console.log('🗺️ MacroGlobe render - containerRef:', !!containerRef.current);
  console.log('🗺️ MacroGlobe render - mapRef:', !!mapRef.current);

  useEffect(() => {
    console.log('🗺️ MacroGlobe useEffect triggered');

    if (!containerRef.current) {
      console.warn('⚠️ MacroGlobe: containerRef.current is null');
      return;
    }

    if (mapRef.current) {
      console.warn('⚠️ MacroGlobe: map already initialized, updating data');
      // Mettre à jour les données si la carte existe déjà
      const source = mapRef.current.getSource('macro-data') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: data.map(item => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
            properties: {
              id: item.id,
              country_code: item.country_code,
              country_name: lang === 'fr' ? item.country_name_fr : item.country_name_en,
              indicator: lang === 'fr' ? item.indicator_fr : item.indicator_en,
              value: item.value,
              unit: lang === 'fr' ? item.unit_fr : item.unit_en,
              trend: item.trend,
              color: item.category?.color || GOLD_COLOR,
              has_data: true,
              source: item.source || '',
            },
          })),
        });
      }
      return;
    }

    console.log('✅ MacroGlobe: Initializing map...');
    console.log('✅ MacroGlobe: maplibregl available:', typeof maplibregl !== 'undefined');
    console.log('✅ MacroGlobe: Container dimensions:', containerRef.current.offsetWidth, 'x', containerRef.current.offsetHeight);

    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildMapStyle(theme, isMobile),
        center: [20, 2],
        zoom: isMobile ? 2 : 2.5,
        minZoom: 1,
        maxZoom: 14,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: !isMobile }), "bottom-right");

      map.on('load', () => {
        console.log('✅ MacroGlobe: Map loaded successfully');

        // Add data source
        map.addSource('macro-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.map(item => ({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
              properties: {
                id: item.id,
                country_code: item.country_code,
                country_name: lang === 'fr' ? item.country_name_fr : item.country_name_en,
                indicator: lang === 'fr' ? item.indicator_fr : item.indicator_en,
                value: item.value,
                unit: lang === 'fr' ? item.unit_fr : item.unit_en,
                trend: item.trend,
                color: item.category?.color || GOLD_COLOR,
                has_data: true,
                source: item.source || '',
              },
            })),
          },
        });

        // Add relations source
        if (relations.length > 0) {
          map.addSource('macro-relations', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: relations.map(rel => ({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [[rel.origin_lng, rel.origin_lat], [rel.target_lng, rel.target_lat]],
                },
                properties: {
                  relation_type: rel.relation_type,
                  description: lang === 'fr' ? rel.description_fr : rel.description_en,
                },
              })),
            },
          });

          map.addLayer({
            id: 'relations-line',
            type: 'line',
            source: 'macro-relations',
            paint: {
              'line-color': '#D4AF37',
              'line-width': isMobile ? 1.5 : 2,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2],
            },
          });
        }

        // Add markers layer
        map.addLayer({
          id: 'data-markers',
          type: 'circle',
          source: 'macro-data',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'value'],
              0, isMobile ? 6 : 8,
              1000, isMobile ? 14 : 20,
              10000, isMobile ? 22 : 30,
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.8,
            'circle-stroke-width': isMobile ? 1.5 : 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        console.log('✅ MacroGlobe: Layers added, markers count:', data.length);

        // Hover events (desktop only)
        if (!isMobile) {
          map.on('mouseenter', 'data-markers', () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          map.on('mouseleave', 'data-markers', () => {
            map.getCanvas().style.cursor = '';
            popupRef.current?.remove();
          });

          map.on('mousemove', 'data-markers', (e) => {
            if (!e.features?.[0]) return;
            const props = e.features[0].properties;

            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 15,
              maxWidth: '280px',
            })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="background:rgba(2,1,17,0.95);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:12px 16px;backdrop-filter:blur(12px);min-width:180px;">
                  <p style="color:#D4AF37;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px;">${props.country_name}</p>
                  <p style="color:#fff;font-size:14px;font-weight:700;margin:8px 0;">${props.indicator}</p>
                  <p style="color:#D4AF37;font-size:20px;font-weight:800;margin:8px 0;">
                    ${Number(props.value).toLocaleString()}
                    <span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.5);margin-left:4px;">${props.unit || ''}</span>
                  </p>
                  <div style="display:flex;align-items:center;gap:4px;margin-top:8px;">
                    ${props.trend === 'up' ? '<span style="color:#4ade80;">↑ Hausse</span>' : 
                      props.trend === 'down' ? '<span style="color:#f87171;">↓ Baisse</span>' : 
                      '<span style="color:#94a3b8;">→ Stable</span>'}
                  </div>
                  ${props.source ? `<p style="color:rgba(255,255,255,0.4);font-size:10px;margin-top:8px;font-style:italic;">Source: ${props.source}</p>` : ''}
                </div>
              `)
              .addTo(map);
          });
        }

        // Click events (mobile et desktop)
        map.on('click', 'data-markers', (e) => {
          if (!e.features?.[0]) return;
          const props = e.features[0].properties;
          
          if (isMobile) {
            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
              offset: 15,
              maxWidth: '280px',
            })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="background:rgba(2,1,17,0.95);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:12px 16px;backdrop-filter:blur(12px);min-width:180px;">
                  <p style="color:#D4AF37;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px;">${props.country_name}</p>
                  <p style="color:#fff;font-size:14px;font-weight:700;margin:8px 0;">${props.indicator}</p>
                  <p style="color:#D4AF37;font-size:20px;font-weight:800;margin:8px 0;">
                    ${Number(props.value).toLocaleString()}
                    <span style="font-size:12px;font-weight:400;color:rgba(255,255,255,0.5);margin-left:4px;">${props.unit || ''}</span>
                  </p>
                </div>
              `)
              .addTo(map);
          }
        });
      });

      map.on('error', (e) => {
        console.error('❌ MacroGlobe: Map error:', e);
      });

      mapRef.current = map;
      console.log('✅ MacroGlobe: Map instance created');

    } catch (error) {
      console.error('❌ MacroGlobe: Failed to initialize map:', error);
    }

    return () => {
      console.log('🧹 MacroGlobe: Cleanup');
      popupRef.current?.remove();
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.warn('⚠️ MacroGlobe: Error removing map:', e);
        }
        mapRef.current = null;
      }
    };
  }, [data, relations, lang, theme, isMobile]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* Indicateur mode */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-[#020111]/90 border border-white/10 rounded-lg text-white text-xs font-bold backdrop-blur-xl">
        {isMobile ? (
          <span className="flex items-center gap-2">
            🗺️ {lang === 'fr' ? 'Mode 2D' : '2D Mode'}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            🌍 {lang === 'fr' ? 'Globe 3D' : '3D Globe'}
          </span>
        )}
      </div>
    </div>
  );
}