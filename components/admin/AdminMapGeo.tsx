"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Save, Map as MapIcon, CheckCircle } from "lucide-react";

interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  name_fr: string;
  name_en?: string;
}

interface Props {
  points: GeoPoint[];
  onAddPoint: (pt: GeoPoint) => void; // CHANGEMENT ICI: On n'écrase plus le tableau, on ajoute un point
  targetSequence: string[];
  center: [number, number];
  setCenter: (c: [number, number]) => void;
  zoom: number;
  setZoom: (z: number) => void;
}

export default function AdminMapGeo({
  points,
  onAddPoint,
  targetSequence,
  center,
  setCenter,
  zoom,
  setZoom,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  
  // NOUVEAU: Le point en attente de sauvegarde
  const [draftPoint, setDraftPoint] = useState<L.LatLng | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);

  // 1. Initialisation de la carte (Une seule fois)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center || [0, 0], zoom || 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);

    // Au clic, on place juste un point temporaire (Brouillon)
    mapRef.current.on("click", (e) => {
      setDraftPoint(e.latlng);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Gestion du Marqueur Temporaire (Brouillon)
  useEffect(() => {
    if (!mapRef.current) return;

    // Supprimer l'ancien marqueur temporaire s'il existe
    if (draftMarkerRef.current) {
      mapRef.current.removeLayer(draftMarkerRef.current);
      draftMarkerRef.current = null;
    }

    // Dessiner le nouveau marqueur temporaire (Rouge clignotant)
    if (draftPoint) {
      const draftIcon = L.divIcon({
        html: `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-[0_0_15px_red] animate-pulse"></div>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      draftMarkerRef.current = L.marker([draftPoint.lat, draftPoint.lng], { icon: draftIcon })
        .addTo(mapRef.current);
    }
  }, [draftPoint]);

  // 3. Mise à jour des marqueurs fixes et des lignes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Nettoyer la carte (sauf le fond de carte et le marqueur brouillon)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer) && layer !== draftMarkerRef.current) {
        map.removeLayer(layer);
      }
    });

    // Dessiner les points fixes
    points.forEach((pt, index) => {
      const orderInSeq = targetSequence.indexOf(pt.id);
      const isTarget = orderInSeq !== -1;

      const iconHtml = `
        <div class="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg ${
          isTarget ? "bg-green-500 text-white" : "bg-blue-500 text-white"
        }">
          <span class="text-[10px] font-bold">${isTarget ? orderInSeq + 1 : index + 1}</span>
        </div>
      `;

      L.marker([pt.lat, pt.lng], {
        icon: L.divIcon({ html: iconHtml, className: "", iconSize: [24, 24], iconAnchor: [12, 12] }),
      })
        .addTo(map)
        .bindTooltip(pt.name_fr, { permanent: true, direction: "top", offset: [0, -10], className: "text-xs font-bold" });
    });

    // Dessiner les lignes et calculer la distance
    let totalMeters = 0;
    const latlngs: L.LatLngExpression[] = [];

    targetSequence.forEach((id) => {
      const pt = points.find((p) => p.id === id);
      if (pt) latlngs.push([pt.lat, pt.lng]);
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#D4AF37", weight: 3, dashArray: "5, 10" }).addTo(map);
      for (let i = 0; i < latlngs.length - 1; i++) {
        totalMeters += map.distance(latlngs[i], latlngs[i + 1]);
      }
    }
    setDistanceKm(totalMeters / 1000);

  }, [points, targetSequence]);


  // --- ACTIONS ---
  const handleSaveDraft = () => {
    if (!draftPoint) return;
    onAddPoint({
      id: `geo_${Date.now()}`,
      lat: draftPoint.lat,
      lng: draftPoint.lng,
      name_fr: `Point ${points.length + 1}`,
    });
    setDraftPoint(null); // On efface le brouillon après sauvegarde
  };

  const handleGeolocate = () => {
    if (!mapRef.current) return;
    mapRef.current.locate({ setView: true, maxZoom: 10 });
    mapRef.current.once("locationfound", () => alert("📍 Localisation trouvée !"));
    mapRef.current.once("locationerror", () => alert("❌ Impossible de vous géolocaliser."));
  };

  const handleSaveView = () => {
    if (!mapRef.current) return;
    const currentCenter = mapRef.current.getCenter();
    setCenter([currentCenter.lat, currentCenter.lng]);
    setZoom(mapRef.current.getZoom());
    alert("✅ Vue initiale sauvegardée !");
  };

  return (
    <div className="space-y-2">
      {/* Barre d'outils Admin Map */}
      <div className="flex flex-wrap items-center justify-between bg-black/40 p-2 rounded-lg border border-white/10 gap-2">
        <div className="flex gap-2">
          <button onClick={handleGeolocate} type="button" className="flex items-center gap-1 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-600/40">
            <LocateFixed size={14} /> Ma Position
          </button>
          <button onClick={handleSaveView} type="button" className="flex items-center gap-1 bg-green-600/20 text-green-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-600/40">
            <Save size={14} /> Sauver cette vue (Départ)
          </button>
        </div>
        <div className="flex items-center gap-2 bg-[#D4AF37]/10 px-3 py-1.5 rounded text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-mono font-bold">
          <MapIcon size={14} />
          Distance Itinéraire : {distanceKm > 0 ? distanceKm.toFixed(1) + " km" : "0 km"}
        </div>
      </div>

      {/* Le conteneur Leaflet */}
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden border-2 border-gray-700">
        <div ref={containerRef} className="w-full h-full bg-gray-900 cursor-crosshair" />
        
        {/* L'UI DE SAUVEGARDE DU POINT */}
        {draftPoint ? (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[400] bg-black/90 px-4 py-3 rounded-lg border-2 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)] flex flex-col items-center gap-3">
            <span className="text-white text-xs font-bold uppercase tracking-widest text-center">📍 Nouvelle position détectée</span>
            <div className="flex gap-2 w-full">
              <button onClick={() => setDraftPoint(null)} className="flex-1 bg-white/10 text-gray-300 px-3 py-2 rounded text-xs font-bold hover:bg-white/20">
                Annuler
              </button>
              <button onClick={handleSaveDraft} className="flex-2 bg-red-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-400 shadow-lg">
                <CheckCircle size={14} /> CONFIRMER
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-2 left-2 z-[400] bg-black/80 text-white text-[10px] px-3 py-2 rounded backdrop-blur-sm pointer-events-none border border-white/20">
            👉 Cliquez n'importe où sur la carte pour placer un repère.
          </div>
        )}
      </div>
    </div>
  );
}