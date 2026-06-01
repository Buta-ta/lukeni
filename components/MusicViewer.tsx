// components/music/MusicViewer.tsx
"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
// ✅ Chemin correct depuis components/ vers components/music/
import type { CountryMusicData, MusicMapProps } from "./music/MusicMap";

const MusicMap = dynamic(
  () => import("./music/MusicMap"),
  { ssr: false }
);

// ✅ Données exemple (remplacer par vos données Supabase)
const EXAMPLE_COUNTRIES: CountryMusicData[] = [
  {
    country_code: "SEN",
    country_name_fr: "Sénégal",
    country_name_en: "Senegal",
    lat: 14.4974,
    lng: -14.4524,
    track_count: 42,
    dominant_color: "#D4AF37",
    genres: ["Mbalax", "Afrobeat"],
    eras: [1970, 1980, 1990],
    city: null,
    is_cluster: false,
    cluster_name: null,
  },
  {
    country_code: "NGA",
    country_name_fr: "Nigéria",
    country_name_en: "Nigeria",
    lat: 9.0820,
    lng: 8.6753,
    track_count: 87,
    dominant_color: "#22C55E",
    genres: ["Afrobeats", "Highlife", "Jùjú"],
    eras: [1980, 1990, 2000, 2010],
    city: null,
    is_cluster: false,
    cluster_name: null,
  },
  {
    country_code: "MLI",
    country_name_fr: "Mali",
    country_name_en: "Mali",
    lat: 17.5707,
    lng: -3.9962,
    track_count: 28,
    dominant_color: "#F97316",
    genres: ["Blues du Mali", "Wassoulou"],
    eras: [1960, 1970, 1980],
    city: null,
    is_cluster: false,
    cluster_name: null,
  },
];

// ─── Panneau de téléchargement (inspiré landing page) ─────────────────────────

function DownloadModal({
  trackId,
  trackTitle,
  lang,
  onClose,
}: {
  trackId: string;
  trackTitle: string;
  lang: "fr" | "en";
  onClose: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleDownload = () => {
    // Simule un téléchargement progressif
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setDone(true);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Téléchargement réel — remplacer par votre URL
    const link = document.createElement("a");
    link.href = `/api/music/${trackId}`;
    link.download = `${trackTitle}.mp3`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-100 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#020111] border border-[#D4AF37]/30 rounded-2xl p-8 w-full max-w-sm shadow-[0_0_80px_rgba(212,175,55,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🎧</span>
          <div>
            <p className="text-[#D4AF37] text-xs uppercase tracking-[0.2em] font-bold mb-1">
              {lang === "fr" ? "Téléchargement" : "Download"}
            </p>
            <p className="text-white font-semibold text-sm">{trackTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Barre de progression */}
        {progress > 0 && (
          <div className="mb-6">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E5C158] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/40 text-xs mt-2 text-center">
              {done
                ? (lang === "fr" ? "✓ Terminé !" : "✓ Done!")
                : `${progress}%`}
            </p>
          </div>
        )}

        {/* Bouton télécharger */}
        <button
          onClick={handleDownload}
          disabled={done}
          className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
          style={{
            background: done
              ? "rgba(212,175,55,0.2)"
              : "linear-gradient(135deg, #D4AF37 0%, #E5C158 100%)",
            color: done ? "#D4AF37" : "#000",
            cursor: done ? "default" : "pointer",
          }}
        >
          {done
            ? (lang === "fr" ? "Téléchargé ✓" : "Downloaded ✓")
            : (lang === "fr" ? "Lancer le téléchargement" : "Start Download")}
        </button>
      </div>
    </div>
  );
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function MusicViewer() {
  const [selected, setSelected] = useState<string | null>(null);
  const [lang] = useState<"fr" | "en">("fr");
  const [downloadInfo, setDownloadInfo] = useState<{
    id: string;
    title: string;
  } | null>(null);

  return (
    <div className="w-screen h-screen relative">
      <MusicMap
        countries={EXAMPLE_COUNTRIES}
        selectedCountry={selected}
        activeEra={null}
        lang={lang}
        onCountrySelect={setSelected}
        playingCountry="SEN"
        onDownloadTrack={(id, title) => setDownloadInfo({ id, title })}
      />

      {/* Modal de téléchargement */}
      {downloadInfo && (
        <DownloadModal
          trackId={downloadInfo.id}
          trackTitle={downloadInfo.title}
          lang={lang}
          onClose={() => setDownloadInfo(null)}
        />
      )}
    </div>
  );
}