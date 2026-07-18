"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";

interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  name_fr: string;
  name_en?: string;
}

interface Props {
  points: GeoPoint[];
  targetSequence: string[];
  selectedPath: string[];
  onPointClick: (id: string) => void;
  lang: "fr" | "en";
  center: [number, number];
  zoom: number;
}

export default function MapGameGeo({
  points,
  targetSequence,
  selectedPath,
  onPointClick,
  lang,
  center,
  zoom,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const linesRef = useRef<L.Polyline[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialiser la carte
    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  // Ajouter/mettre à jour les markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Nettoyer les anciens markers
    Object.values(markersRef.current).forEach((marker) => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = {};

    // Ajouter les nouveaux markers
    points.forEach((pt) => {
      const isSelected = selectedPath.includes(pt.id);
      const orderIndex = selectedPath.indexOf(pt.id);
      const ptName = lang === "fr" ? pt.name_fr : (pt.name_en || pt.name_fr);

      // Créer l'icône
      const markerIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? "bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.8)]"
                : "bg-blue-500 text-white border-2 border-white shadow-lg"
            }">
              ${isSelected ? `<span class="text-xs font-bold">${orderIndex + 1}</span>` : '<div class="w-1.5 h-1.5 bg-white rounded-full"></div>'}
            </div>
          </div>
        `,
        className: "custom-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: markerIcon })
        .addTo(mapRef.current!)
        .bindPopup(`<strong>${ptName}</strong>`)
        .on("click", () => onPointClick(pt.id));

      markersRef.current[pt.id] = marker;
    });
  }, [points, selectedPath, lang, onPointClick]);

  // Redessiner les lignes
  useEffect(() => {
    if (!mapRef.current) return;

    // Nettoyer les anciennes lignes
    linesRef.current.forEach((line) => {
      mapRef.current?.removeLayer(line);
    });
    linesRef.current = [];

    // Dessiner les nouvelles lignes
    for (let i = 0; i < selectedPath.length - 1; i++) {
      const prevId = selectedPath[i];
      const currId = selectedPath[i + 1];

      const prevPt = points.find((p) => p.id === prevId);
      const currPt = points.find((p) => p.id === currId);

      if (prevPt && currPt) {
        const line = L.polyline(
          [[prevPt.lat, prevPt.lng], [currPt.lat, currPt.lng]],
          { color: "#D4AF37", weight: 3, opacity: 0.8, dashArray: "5, 5" }
        ).addTo(mapRef.current!);

        linesRef.current.push(line);
      }
    }

    // Zoomer pour voir toute la route si elle existe
    if (selectedPath.length > 0) {
      const selectedPoints = points.filter((p) => selectedPath.includes(p.id));
      if (selectedPoints.length > 0) {
        const group = new L.FeatureGroup(
          selectedPoints.map((p) => L.marker([p.lat, p.lng]))
        );
        mapRef.current?.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, [selectedPath, points]);

  return (
    <div className="relative w-full h-96 bg-black rounded-xl border border-gray-800 overflow-hidden shadow-inner">
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 right-3 z-40 bg-black/80 border border-white/20 rounded-lg p-3 backdrop-blur-sm text-xs space-y-1 max-w-xs">
        <p className="text-gray-400 font-bold">
          {lang === "fr" ? "Ordre : " : "Order: "}
          <span className="text-[#D4AF37]">{selectedPath.length}</span>
        </p>
        {selectedPath.length > 0 && (
          <div className="text-gray-500">
            {selectedPath.map((id, idx) => {
              const pt = points.find((p) => p.id === id);
              return (
                <div key={id} className="text-xs">
                  {idx + 1}. {lang === "fr" ? pt?.name_fr : (pt?.name_en || pt?.name_fr)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}