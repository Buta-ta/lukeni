// components/MusicTracksTab.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2, FileAudio, PlusCircle, Edit2, Trash2, X,
  Languages, SpellCheck, CheckCircle, Play, Pause, Upload,
  MapPin, AlertCircle, Map, Calendar, Clock, ImagePlus,
  FileText, Link2, Globe, User, XCircle, Lock, Unlock, Download, Trash, Save, ArrowUp, ArrowDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoTranslate, autoCorrect } from "@/lib/lingua";
import GeoSearch from "@/components/admin/shared/GeoSearch";
import DeleteModal from "@/components/admin/shared/DeleteModal";
import type { GeoResult } from "@/lib/geocoding";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MusicGenre {
  id: string;
  nom_fr: string;
  nom_en: string;
}

interface MusicTrack {
  id: string;
  type: string;
  title_fr: string;
  title_en: string;
  artist_fr: string;
  artist_en: string;
  year: number | null;
  era_decade: number | null;
  release_date: string | null;
  location_name_fr: string;
  location_name_en: string;
  audio_url: string;
  youtube_url?: string;
  audio_source?: string;
  cover_url?: string;
  description_fr?: string;
  description_en?: string;
  genre_id: string;
  status: string;
  music_genres: MusicGenre;
  country_code: string | null;
  country_name_fr: string | null;
  country_name_en: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  submitter_display_name?: string | null;
  contributor_email?: string | null;
  allow_download?: boolean;
  _source_table?: string;
}

interface GenreRelation {
  id: string;
  genre_id_origin: string;
  genre_id_derived: string;
  relation_type: string;
  description_fr: string | null;
  origin_genre?: { nom_fr: string };
  derived_genre?: { nom_fr: string };
}

// ─── Sélecteur date ───────────────────────────────────────────────────────────

function ReleaseDatePicker({
  year, releaseDate, onYearChange, onReleaseDateChange,
}: {
  year: number | null;
  releaseDate: string;
  onYearChange: (y: number | null) => void;
  onReleaseDateChange: (d: string) => void;
}) {
  const [mode, setMode] = useState<"year" | "full">(releaseDate ? "full" : "year");

  return (
    <div className="border border-white/10 rounded-xl p-3 bg-white/[0.02] space-y-3">
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-gray-400" />
        <span className="text-xs font-bold text-gray-300">Date de sortie</span>
        <div className="ml-auto flex gap-1 bg-black/30 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => { setMode("year"); onReleaseDateChange(""); }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "year" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
            }`}
          >
            Année
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              mode === "full" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
            }`}
          >
            Date complète
          </button>
        </div>
      </div>

      {mode === "year" ? (
        <div>
          <input
            type="number"
            value={year ?? ""}
            onChange={(e) =>
              onYearChange(e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder={`Ex: ${new Date().getFullYear()}`}
            min={1800}
            max={new Date().getFullYear()}
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 font-mono"
          />
          <p className="text-[10px] text-gray-600 mt-1">
            Entrez uniquement l&apos;année si la date exacte est inconnue
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => {
              onReleaseDateChange(e.target.value);
              if (e.target.value)
                onYearChange(new Date(e.target.value).getFullYear());
            }}
            max={new Date().toISOString().split("T")[0]}
            className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
          />
          {releaseDate && (
            <p className="text-[10px] text-blue-400/70 flex items-center gap-1">
              <Clock size={9} />
              {new Date(releaseDate).toLocaleDateString("fr-FR", {
                weekday: "long", year: "numeric",
                month: "long", day: "numeric",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panneau connexions genre ─────────────────────────────────────────────────

function GenreConnectionsPanel({ genreId, genres }: { genreId: string; genres: MusicGenre[] }) {
  const [relations, setRelations] = useState<GenreRelation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!genreId) { setRelations([]); return; }
    setIsLoading(true);
    supabase
      .from("music_genre_relations")
      .select(`
        id, genre_id_origin, genre_id_derived, relation_type, description_fr,
        origin_genre:genre_id_origin (nom_fr),
        derived_genre:genre_id_derived (nom_fr)
      `)
      .or(`genre_id_origin.eq.${genreId},genre_id_derived.eq.${genreId}`)
      .then(({ data }) => {
        setRelations((data as unknown as GenreRelation[]) || []);
        setIsLoading(false);
      });
  }, [genreId]);

  const currentGenre = genres.find((g) => g.id === genreId);

  if (!genreId || (relations.length === 0 && !isLoading)) return null;

  const relationLabel = (type: string) => {
    switch (type) {
      case "influence":    return "→ influence";
      case "derived_from": return "↩ dérivé de";
      case "fusion":       return "⊕ fusion";
      case "migration":    return "✈ migration";
      default:             return type;
    }
  };

  return (
    <div className="border border-purple-500/20 rounded-xl p-4 bg-purple-500/5 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 size={14} className="text-purple-400" />
        <span className="text-sm font-bold text-purple-300">
          Connexions du genre {currentGenre?.nom_fr}
        </span>
        {isLoading && <Loader2 size={12} className="animate-spin text-purple-400" />}
      </div>

      {!isLoading && relations.length > 0 && (
        <div className="space-y-1.5">
          {relations.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
            >
              <span className="text-white/60 text-xs font-medium">
                {r.origin_genre?.nom_fr || "?"}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37" }}
              >
                {relationLabel(r.relation_type)}
              </span>
              <span className="text-white/60 text-xs font-medium">
                {r.derived_genre?.nom_fr || "?"}
              </span>
              {r.description_fr && (
                <span className="text-white/30 text-[10px] truncate ml-auto max-w-[200px]">
                  {r.description_fr}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-white/30 flex items-center gap-1">
        <Globe size={9} />
        Gérez les connexions depuis l'onglet <strong className="text-purple-400 ml-1">Genres 🎵</strong>
      </p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MusicTracksTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [tracks, setTracks]       = useState<MusicTrack[]>([]);
  const [genres, setGenres]       = useState<MusicGenre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filtres
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterType,    setFilterType]    = useState("all");

  // Champs formulaire
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [type,        setType]        = useState<"song" | "instrument" | "suggestion">("song");
  const [titleFr,     setTitleFr]     = useState("");
  const [titleEn,     setTitleEn]     = useState("");
  const [artistFr,    setArtistFr]    = useState("");
  const [artistEn,    setArtistEn]    = useState("");
  const [year,        setYear]        = useState<number | null>(new Date().getFullYear());
  const [releaseDate, setReleaseDate] = useState("");
  const [locFr,       setLocFr]       = useState("");
  const [locEn,       setLocEn]       = useState("");
  const [genreId,     setGenreId]     = useState("");
  const [status,      setStatus]      = useState("pending");
  const [audioUrl,    setAudioUrl]    = useState("");
  const [youtubeUrl,  setYoutubeUrl]  = useState("");
  const [audioSource, setAudioSource] = useState<"upload" | "youtube">("upload");
  const [imageUrl,    setImageUrl]    = useState("");
  const [descFr,      setDescFr]      = useState("");
  const [descEn,      setDescEn]      = useState("");
  const [allowDownload, setAllowDownload] = useState(false);

  // Géo
  const [countryCode,   setCountryCode]   = useState("");
  const [countryNameFr, setCountryNameFr] = useState("");
  const [countryNameEn, setCountryNameEn] = useState("");
  const [cityName,      setCityName]      = useState("");
  const [geoLat,        setGeoLat]        = useState("");
  const [geoLng,        setGeoLng]        = useState("");

  const [isSaving,     setIsSaving]     = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading,  setIsUploading]  = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [trackToDelete,   setTrackToDelete]   = useState<string | null>(null);
  const [isDeleting,      setIsDeleting]      = useState(false);
  const [actionId,        setActionId]        = useState<string | null>(null);

  useEffect(() => { fetchTracks(); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchTracks() {
    setIsLoading(true);

    try {
      // ── Genres ───────────────────────────────────────────────────────────────
      const { data: gData, error: genresError } = await supabase
        .from("music_genres")
        .select("id, nom_fr, nom_en")
        .eq("status", "published");

      if (genresError) console.error("❌ Erreur genres:", genresError);
      if (gData) setGenres(gData);

      // ── Tracks publiés ───────────────────────────────────────────────────────
      const { data: tracksData, error: tracksError } = await supabase
        .from("music_tracks")
        .select("*, music_genres(id, nom_fr, nom_en)")
        .order("created_at", { ascending: false });

      if (tracksError) console.error("❌ Erreur tracks:", tracksError);
      console.log("📦 Tracks publiés:", tracksData?.length || 0);

      // ── Contributions utilisateurs ─────────────────────────────────────────
      const { data: contributionsData, error: contribError } = await supabase
        .from("music_contributions")
        .select(`
          *,
          music_genres(id, nom_fr, nom_en),
          contributor:contributor_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (contribError) {
        console.error("❌ Erreur contributions:", contribError);
      }
      console.log("📦 Contributions:", contributionsData?.length || 0);

      // ── Transformer contributions → format MusicTrack ───────────────────────
      const formattedContributions: MusicTrack[] = (contributionsData || []).map((c: any) => {
        const isYouTube = 
          c.audio_url?.includes('youtube.com') || 
          c.audio_url?.includes('youtu.be') ||
          c.audio_source === 'youtube';
        
        return {
          id: c.id,
          type: "suggestion",
          title_fr: c.title || "",
          title_en: c.title || "",
          artist_fr: c.artist_name || "",
          artist_en: c.artist_name || "",
          year: c.era_decade || null,
          era_decade: c.era_decade || null,
          release_date: null,
          location_name_fr: c.city || "",
          location_name_en: c.city || "",
          audio_url: c.audio_url || "",
          audio_source: isYouTube ? "youtube" : (c.audio_source || "upload"),
          youtube_url: isYouTube ? c.audio_url : null,
          cover_url: c.cover_url || null,
          description_fr: c.description_fr || "",
          description_en: c.description_en || "",
          genre_id: c.genre_id || "",
          status: c.status || "pending",
          music_genres: c.music_genres || {
            id: "",
            nom_fr: "Inconnu",
            nom_en: "Unknown",
          },
          country_code: c.country_code || null,
          country_name_fr: c.country_code || null,
          country_name_en: c.country_code || null,
          city: c.city || null,
          lat: c.gps_lat || null,
          lng: c.gps_lng || null,
          // ✅ Afficher le vrai nom du contributeur
          submitter_display_name: c.contributor?.full_name || `user_${c.contributor_id?.slice(0, 8)}` || "Anonyme",
          contributor_email: c.contributor?.email || null,
          allow_download: c.allow_download ?? false,
          _source_table: "music_contributions",
        };
      });

      // ── Fusionner tracks + suggestions ──────────────────────────────────────
      const allTracks = [
        ...(tracksData || []),
        ...formattedContributions,
      ];

      // ── Trier par date récente ───────────────────────────────────────────────
      allTracks.sort((a: any, b: any) => {
        return new Date(b.created_at || 0).getTime() -
               new Date(a.created_at || 0).getTime();
      });

      console.log("✅ Total tracks:", allTracks.length);
      console.log("✅ Suggestions:", formattedContributions.length);

      setTracks(allTracks as MusicTrack[]);

    } catch (err) {
      console.error("❌ Erreur fetchTracks:", err);
      showMsg("error", "Erreur de chargement des tracks");
    }

    setIsLoading(false);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setEditingId(null);
    setType("song");
    setTitleFr(""); setTitleEn("");
    setArtistFr(""); setArtistEn("");
    setYear(new Date().getFullYear()); setReleaseDate("");
    setLocFr(""); setLocEn("");
    setGenreId(""); setStatus("pending");
    setAudioUrl(""); setYoutubeUrl(""); setAudioSource("upload");
    setImageUrl(""); setDescFr(""); setDescEn("");
    setCountryCode(""); setCountryNameFr(""); setCountryNameEn("");
    setCityName(""); setGeoLat(""); setGeoLng("");
    setAllowDownload(false);
  }, []);

  // ── Édition ────────────────────────────────────────────────────────────────

  const handleEdit = useCallback((t: MusicTrack) => {
    console.log("🎵 Édition track:", {
      id: t.id,
      type: t.type,
      audio_url: t.audio_url,
      audio_source: t.audio_source,
      youtube_url: t.youtube_url,
    });
    setEditingId(t.id);
    setType(t.type as "song" | "instrument" | "suggestion");
    setTitleFr(t.title_fr || "");
    setTitleEn(t.title_en || "");
    setArtistFr(t.artist_fr || "");
    setArtistEn(t.artist_en || "");
    setYear(t.year ?? null);
    setReleaseDate(t.release_date || "");
    setLocFr(t.location_name_fr || "");
    setLocEn(t.location_name_en || "");
    setGenreId(t.genre_id || "");
    setStatus(t.status);
    
    const source = t.audio_source || "upload";
    
    if (source === "youtube") {
      setAudioUrl("");
      setYoutubeUrl(t.audio_url);
    } else {
      setAudioUrl(t.audio_url);
      setYoutubeUrl("");
    }
    setAudioSource(source as "upload" | "youtube");
    
    setImageUrl(t.cover_url || "");
    setDescFr(t.description_fr || "");
    setDescEn(t.description_en || "");
    setCountryCode(t.country_code || "");
    setCountryNameFr(t.country_name_fr || "");
    setCountryNameEn(t.country_name_en || "");
    setCityName(t.city || "");
    setGeoLat(t.lat != null ? String(t.lat) : "");
    setGeoLng(t.lng != null ? String(t.lng) : "");
    setAllowDownload(t.allow_download ?? false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Upload Cloudinary ──────────────────────────────────────────────────────

  const openCloudinaryWidget = (forCover = false) => {
    setIsUploading(true);
    const createWidget = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: forCover ? ["local", "url"] : ["local", "mic", "url"],
          resourceType: forCover ? "image" : "auto",
          multiple: false,
          maxFileSize: forCover ? 5_000_000 : 15_000_000,
          clientAllowedFormats: forCover
            ? ["jpg", "jpeg", "png", "webp"]
            : undefined,
        },
        (
          error: unknown,
          result: { event: string; info: { secure_url: string } }
        ) => {
          setIsUploading(false);
          if (result?.event === "success") {
            if (forCover) {
              setImageUrl(result.info.secure_url);
              showMsg("success", "✅ Cover uploadée !");
            } else {
              setAudioUrl(result.info.secure_url);
              showMsg("success", "✅ Audio uploadé !");
            }
          }
          if (error) showMsg("error", "Erreur upload Cloudinary");
        }
      );
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }
  };

  // ── Lingua ─────────────────────────────────────────────────────────────────

  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === "translate-en")      setTitleEn(await autoTranslate(titleFr, "fr"));
      if (action === "translate-fr")      setTitleFr(await autoTranslate(titleEn, "en"));
      if (action === "correct-fr")        setTitleFr(await autoCorrect(titleFr, "fr"));
      if (action === "correct-en")        setTitleEn(await autoCorrect(titleEn, "en"));
      if (action === "translate-desc-en") setDescEn(await autoTranslate(descFr, "fr"));
      if (action === "translate-desc-fr") setDescFr(await autoTranslate(descEn, "en"));
    } catch {
      showMsg("error", "Erreur API lingua");
    }
    setIsProcessing(null);
  };

  // ── Sync music_countries ───────────────────────────────────────────────────

  async function syncMusicCountries(
    code: string, nameFr: string, nameEn: string,
    lat: number | null, lng: number | null
  ) {
    if (!code) return;

    const { count } = await supabase
      .from("music_tracks")
      .select("id", { count: "exact", head: true })
      .eq("country_code", code)
      .eq("status", "published");

    const { data: genreData } = await supabase
      .from("music_tracks")
      .select("music_genres(nom_fr)")
      .eq("country_code", code)
      .eq("status", "published")
      .not("genre_id", "is", null);

    const genreNames = [
      ...new Set(
        (genreData ?? [])
          .map((t: unknown) =>
            (t as { music_genres?: { nom_fr: string } }).music_genres?.nom_fr
          )
          .filter(Boolean) as string[]
      ),
    ];

    const { data: coordsData } = await supabase
      .from("music_tracks")
      .select("lat, lng")
      .eq("country_code", code)
      .eq("status", "published")
      .not("lat", "is", null);

    let avgLat = lat;
    let avgLng = lng;

    if (coordsData && coordsData.length > 0) {
      const valid = coordsData.filter((c) => c.lat && c.lng);
      if (valid.length > 0) {
        avgLat = valid.reduce((s, c) => s + c.lat, 0) / valid.length;
        avgLng = valid.reduce((s, c) => s + c.lng, 0) / valid.length;
      }
    }

    await supabase.from("music_countries").upsert(
      {
        country_code:   code,
        name_fr:        nameFr || code,
        name_en:        nameEn || code,
        lat:            avgLat ?? 0,
        lng:            avgLng ?? 0,
        track_count:    count ?? 0,
        dominant_color: "#D4AF37",
        genres:         genreNames,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: "country_code" }
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!titleFr.trim()) return showMsg("error", "Titre FR requis.");
    if (!geoLat || !geoLng) return showMsg("error", "Coordonnées GPS requises.");

    setIsSaving(true);

    const finalLat  = parseFloat(geoLat);
    const finalLng  = parseFloat(geoLng);
    const eraDecade = year ? Math.floor(year / 10) * 10 : null;

    const payload = {
      type,
      title_fr:         titleFr.trim() || null,
      title_en:         titleEn.trim() || null,
      artist_fr:        artistFr.trim() || null,
      artist_en:        artistEn.trim() || null,
      year:             year ? parseInt(String(year)) : null,
      era_decade:       eraDecade,
      release_date:     releaseDate || null,
      location_name_fr: locFr.trim() || null,
      location_name_en: locEn.trim() || null,
      genre_id:         genreId || null,
      status,
      audio_source:     audioSource,
      audio_url:        audioSource === "upload" ? (audioUrl || null) : null,
      youtube_url:      audioSource === "youtube" ? (youtubeUrl || null) : null,
      cover_url:        imageUrl?.trim() || null,
      description_fr:   descFr?.trim() || null,
      description_en:   descEn?.trim() || null,
      country_code:     countryCode,
      country_name_fr:  countryNameFr || null,
      country_name_en:  countryNameEn || null,
      city:             cityName || null,
      lat:              finalLat,
      lng:              finalLng,
      allow_download:   audioSource === "upload" ? allowDownload : false,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("music_tracks")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showMsg("success", "✅ Track mis à jour !");
      } else {
        const { error } = await supabase
          .from("music_tracks")
          .insert(payload);
        if (error) throw error;
        showMsg("success", "✅ Track créé et placé sur la carte !");
      }

      if (countryCode) {
        await syncMusicCountries(
          countryCode, countryNameFr, countryNameEn, finalLat, finalLng
        );
      }

      resetForm();
      fetchTracks();
    } catch (err: any) {
      console.error("Error:", err);
      showMsg("error", err.message || "Erreur lors de la sauvegarde");
    }

    setIsSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteClick = (id: string) => {
    setTrackToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!trackToDelete) return;
    setIsDeleting(true);
    try {
      const track = tracks.find((t) => t.id === trackToDelete);
      
      const sourceTable = (track as any)._source_table || "music_tracks";
      
      const { error } = await supabase
        .from(sourceTable)
        .delete()
        .eq("id", trackToDelete);
      
      if (error) throw error;
      
      setTracks((prev) => prev.filter((t) => t.id !== trackToDelete));
      showMsg("success", "Track supprimé.");
      
      if (sourceTable === "music_tracks" && track?.country_code) {
        await syncMusicCountries(
          track.country_code,
          track.country_name_fr || "",
          track.country_name_en || "",
          track.lat,
          track.lng
        );
      }
      
      setDeleteModalOpen(false);
      setTrackToDelete(null);
    } catch (error: any) {
      showMsg("error", error.message);
    }
    setIsDeleting(false);
  };

  // ── Approuver une suggestion ────────────────────────────────────────────────

  const handleApprove = async (id: string, contribution: MusicTrack) => {
    setActionId(id);
    try {
      const { error: trackError } = await supabase
        .from('music_tracks')
        .insert({
          type: 'song',
          title_fr: contribution.title_fr,
          title_en: contribution.title_en,
          artist_fr: contribution.artist_fr,
          artist_en: contribution.artist_en,
          era_decade: contribution.era_decade,
          year: contribution.year,
          genre_id: contribution.genre_id,
          audio_source: contribution.audio_source,
          audio_url: contribution.audio_url,
          youtube_url: contribution.youtube_url,
          cover_url: contribution.cover_url,
          description_fr: contribution.description_fr,
          description_en: contribution.description_en,
          country_code: contribution.country_code,
          country_name_fr: contribution.country_name_fr,
          country_name_en: contribution.country_name_en,
          city: contribution.city,
          lat: contribution.lat,
          lng: contribution.lng,
          status: 'published',
          submitter_display_name: contribution.submitter_display_name,
          allow_download: contribution.allow_download,
        });

      if (trackError) throw trackError;

      const { error: updateError } = await supabase
        .from('music_contributions')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      showMsg('success', '✅ Contribution approuvée et publiée !');
      fetchTracks();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setActionId(null);
  };

  // ── Rejeter une suggestion ─────────────────────────────────────────────────

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      const { error } = await supabase
        .from('music_contributions')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (error) throw error;

      showMsg('success', '❌ Contribution rejetée');
      fetchTracks();
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setActionId(null);
  };

  // ── Publier/Dépublier (allow_download) ─────────────────────────────────────

  const handleTogglePublish = async (id: string, currentValue: boolean) => {
    setActionId(id);
    try {
      const track = tracks.find(t => t.id === id);
      const sourceTable = (track as any)._source_table || "music_tracks";
      
      const { error } = await supabase
        .from(sourceTable)
        .update({ allow_download: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setTracks(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, allow_download: !currentValue }
            : t
        )
      );

      showMsg('success', `✅ ${!currentValue ? 'Publié' : 'Dépublié'} !`);
    } catch (err: any) {
      showMsg('error', err.message);
    }
    setActionId(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getYoutubeId = (url: string): string => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : "";
  };

  const displayedTracks = tracks.filter((t) => {
    const okCountry = filterCountry === "all" || t.country_code === filterCountry;
    const okStatus  = filterStatus  === "all" || t.status === filterStatus;
    const okType    = filterType    === "all" || t.type === filterType;
    return okCountry && okStatus && okType;
  });

  const usedCountries = (() => {
    const seen = new Set<string>();
    const result: { code: string; nameFr: string }[] = [];
    for (const t of tracks) {
      if (!t.country_code || seen.has(t.country_code)) continue;
      seen.add(t.country_code);
      result.push({ code: t.country_code, nameFr: t.country_name_fr || t.country_code });
    }
    return result;
  })();

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <FileAudio className="text-blue-400" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Tracks & Sons</h2>
          <p className="text-gray-400 text-xs">
            {tracks.length} tracks ·{" "}
            {tracks.filter((t) => t.lat && t.lng).length} géolocalisés ·{" "}
            {tracks.filter((t) => t.status === "published").length} publiés ·{" "}
            {tracks.filter((t) => t.status === "pending").length} en attente
          </p>
        </div>
      </div>

      {/* ── Formulaire ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId
              ? <Edit2 size={18} className="text-blue-400" />
              : <PlusCircle size={18} className="text-blue-400" />}
            {editingId ? "Modifier le Track" : "Nouveau Track"}
          </h3>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X size={14} /> Annuler
            </button>
          )}
        </div>

        {/* Type & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Type de contenu
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "song" | "instrument" | "suggestion")
              }
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="song">🎵 Chanson / Song</option>
              <option value="instrument">🥁 Instrument / Instrumental</option>
              <option value="suggestion">💡 Suggestion communauté</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              Statut de publication
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="pending">⏳ En attente (pending)</option>
              <option value="published">✅ Publié (published)</option>
              <option value="rejected">❌ Rejeté (rejected)</option>
            </select>
          </div>
        </div>

        {/* Géolocalisation */}
        <div className="border border-blue-500/20 rounded-xl p-4 bg-blue-500/5 space-y-4">
          <div className="flex items-center gap-2">
            <Map size={15} className="text-blue-400" />
            <span className="text-sm font-bold text-blue-300">
              Lieu d&apos;origine du morceau
            </span>
            {geoLat && geoLng ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <CheckCircle size={10} /> GPS enregistré
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                <AlertCircle size={10} /> GPS manquant
              </span>
            )}
          </div>

          <GeoSearch
            onSelect={(result: GeoResult) => {
              setCountryCode(result.country_code);
              setCountryNameFr(result.country_name);
              setCountryNameEn(result.country_name);
              setCityName((result as any).city || "");
              setGeoLat(String(result.lat));
              setGeoLng(String(result.lng));
            }}
            value={{
              lat: geoLat ? parseFloat(geoLat) : undefined,
              lng: geoLng ? parseFloat(geoLng) : undefined,
              display_name: cityName || countryNameFr,
            }}
            showCurrentLocation
            showManualInput
          />

          {geoLat && geoLng && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500 mb-0.5">Pays détecté</p>
                <p className="text-white font-mono">
                  {countryCode && (
                    <span className="text-blue-400 mr-1">[{countryCode}]</span>
                  )}
                  {countryNameFr || "—"}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500 mb-0.5">Ville</p>
                <p className="text-white font-mono">{cityName || "—"}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500 mb-0.5">Latitude</p>
                <p className="text-white font-mono">
                  {parseFloat(geoLat).toFixed(6)}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-2">
                <p className="text-gray-500 mb-0.5">Longitude</p>
                <p className="text-white font-mono">
                  {parseFloat(geoLng).toFixed(6)}
                </p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-600 flex items-start gap-1.5">
            <AlertCircle size={10} className="flex-shrink-0 mt-0.5" />
            Recherchez la ville ou le lieu exact. Le pays et les coordonnées
            GPS sont remplis automatiquement.
          </p>
        </div>

        {/* Date de sortie */}
        <ReleaseDatePicker
          year={year}
          releaseDate={releaseDate}
          onYearChange={setYear}
          onReleaseDateChange={setReleaseDate}
        />

        {/* ✅ Audio */}
        {(type !== "suggestion" || editingId) && (
          <div className="p-4 border border-white/10 rounded-xl bg-white/[0.01] space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioSource("upload")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  audioSource === "upload"
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                📁 Upload Audio
              </button>
              <button
                type="button"
                onClick={() => setAudioSource("youtube")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  audioSource === "youtube"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                📺 Lien YouTube
              </button>
            </div>

            {audioSource === "upload" ? (
              <div className="space-y-4">
                <div className="p-4 border border-dashed border-white/15 rounded-xl text-center">
                  {audioUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <FileAudio size={20} />
                        <span className="text-sm font-bold">Fichier audio attaché</span>
                      </div>
                      <audio src={audioUrl} controls className="w-full" />
                      <button
                        onClick={() => openCloudinaryWidget(false)}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        Remplacer le fichier
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openCloudinaryWidget(false)}
                      disabled={isUploading}
                      className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-30 p-4 w-full"
                    >
                      {isUploading
                        ? <Loader2 size={32} className="animate-spin" />
                        : <Upload size={32} />}
                      <span className="text-sm font-bold">
                        {isUploading ? "Upload en cours…" : "Uploader un fichier audio"}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        MP3, WAV, OGG · Max 15 MB
                      </span>
                    </button>
                  )}
                </div>

                {/* ✅ NOUVEAU : Toggle allow_download pour uploads Cloudinary */}
                {audioUrl && (
                  <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg border border-white/10">
                    <input
                      type="checkbox"
                      id="allowDownload"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="allowDownload" className="flex items-center gap-2 cursor-pointer flex-1">
                      {allowDownload ? (
                        <Unlock size={14} className="text-green-400" />
                      ) : (
                        <Lock size={14} className="text-gray-400" />
                      )}
                      <span className="text-sm">
                        {allowDownload ? "✅ Téléchargement autorisé" : "🔒 Téléchargement interdit"}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">
                    📺 Lien YouTube *
                  </label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-red-500 placeholder-gray-700"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Collez l'URL complète de la vidéo YouTube
                  </p>
                </div>
                {youtubeUrl && getYoutubeId(youtubeUrl) && (
                  <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(youtubeUrl)}`}
                      title="YouTube preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cover */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1.5">
            <ImagePlus size={11} /> Cover / Pochette (optionnel)
          </label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                <img
                  src={imageUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setImageUrl("")}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-gray-500">
                <ImagePlus size={24} />
              </div>
            )}
            <button
              onClick={() => openCloudinaryWidget(true)}
              disabled={isUploading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              {imageUrl ? "Remplacer" : "Uploader une cover"}
            </button>
          </div>
        </div>

        {/* Titres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🇫🇷 Titre FR *
            </label>
            <input
              type="text"
              value={titleFr}
              onChange={(e) => setTitleFr(e.target.value)}
              placeholder="Ex: Yéké Yéké, Waka Waka…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua("correct-fr")}
                disabled={!!isProcessing}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Corriger
              </button>
              <button
                onClick={() => handleLingua("translate-fr")}
                disabled={!!isProcessing}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> EN→FR
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🇬🇧 Titre EN
            </label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Ex: Yéké Yéké, Waka Waka…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleLingua("correct-en")}
                disabled={!!isProcessing}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <SpellCheck size={10} /> Correct
              </button>
              <button
                onClick={() => handleLingua("translate-en")}
                disabled={!!isProcessing}
                className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} /> FR→EN
              </button>
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1.5">
              <FileText size={11} /> 🇫🇷 Description FR
            </label>
            <textarea
              value={descFr}
              onChange={(e) => setDescFr(e.target.value)}
              rows={3}
              placeholder="Histoire du morceau, contexte, anecdotes…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none placeholder-gray-700"
            />
            <button
              onClick={() => handleLingua("translate-desc-en")}
              disabled={!!isProcessing}
              className="mt-1 p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
            >
              <Languages size={10} /> Traduire en EN
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono flex items-center gap-1.5">
              <FileText size={11} /> 🇬🇧 Description EN
            </label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              rows={3}
              placeholder="Track history, context, anecdotes…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none placeholder-gray-700"
            />
            <button
              onClick={() => handleLingua("translate-desc-fr")}
              disabled={!!isProcessing}
              className="mt-1 p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"
            >
              <Languages size={10} /> Traduire en FR
            </button>
          </div>
        </div>

        {/* Artistes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🎤 Artiste FR
            </label>
            <input
              type="text"
              value={artistFr}
              onChange={(e) => setArtistFr(e.target.value)}
              placeholder="Ex: Angélique Kidjo, Fela Kuti…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🎤 Artist EN
            </label>
            <input
              type="text"
              value={artistEn}
              onChange={(e) => setArtistEn(e.target.value)}
              placeholder="Ex: Angélique Kidjo, Fela Kuti…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
          </div>
        </div>

        {/* Genre & Lieu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              🎸 Genre musical
            </label>
            <select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500"
            >
              <option value="">— Sélectionner —</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom_fr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              📍 Lieu d&apos;enregistrement FR
            </label>
            <input
              type="text"
              value={locFr}
              onChange={(e) => setLocFr(e.target.value)}
              placeholder="Ex: Studio Bogolan, Bamako…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">
              📍 Recording Location EN
            </label>
            <input
              type="text"
              value={locEn}
              onChange={(e) => setLocEn(e.target.value)}
              placeholder="Ex: Studio Bogolan, Bamako…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 placeholder-gray-700"
            />
          </div>
        </div>

        {/* Connexions genres */}
        {genreId && (
          <GenreConnectionsPanel genreId={genreId} genres={genres} />
        )}

        {/* Bouton save */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="text-xs">
            {geoLat && geoLng ? (
              <span className="text-green-400 flex items-center gap-1.5">
                <MapPin size={12} />
                {cityName && <span>{cityName}, </span>}
                <strong>{countryNameFr || countryCode}</strong>
                <span className="text-gray-500 font-mono ml-1">
                  ({parseFloat(geoLat).toFixed(3)},{" "}
                  {parseFloat(geoLng).toFixed(3)})
                </span>
              </span>
            ) : (
              <span className="text-orange-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                Rechercher un lieu pour placer ce morceau sur la carte
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {editingId ? "Mettre à jour" : "Créer & Placer sur la carte"}
          </button>
        </div>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {["all", "published", "pending", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterStatus === s
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {s === "all" ? "Tous" : s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {["all", "song", "instrument", "suggestion"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterType === t
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "all" ? "Tous types"
                  : t === "song" ? "🎵 Songs"
                  : t === "instrument" ? "🥁 Instru."
                  : "💡 Suggestions"}
              </button>
            ))}
          </div>
        </div>

        {usedCountries.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCountry("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterCountry === "all"
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              🌍 Tous les pays
            </button>
            {usedCountries.map((entry) => (
              <button
                key={entry.code}
                onClick={() => setFilterCountry(entry.code)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterCountry === entry.code
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {entry.code} — {entry.nameFr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Liste tracks ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {displayedTracks.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <FileAudio size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun track trouvé avec ces filtres.</p>
          </div>
        )}

        {displayedTracks.map((t) => (
          <div
            key={t.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl gap-3 hover:border-white/20 transition-colors"
          >
            <div className="flex-1 min-w-0 flex items-start gap-3">
              {/* Bouton play */}
              {(t.audio_url || t.youtube_url) && (
                <button
                  onClick={() => setPlayingId(playingId === t.id ? null : t.id)}
                  className="p-2 bg-blue-500/20 rounded-full text-blue-400 flex-shrink-0 hover:bg-blue-500/30 transition-colors mt-0.5"
                >
                  {playingId === t.id ? <Pause size={15} /> : <Play size={15} />}
                </button>
              )}

              {/* Cover miniature */}
              {t.cover_url && (
                <img
                  src={t.cover_url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                />
              )}

              <div className="min-w-0 flex-1">
                {/* Badges */}
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    t.type === "song"
                      ? "bg-purple-500/20 text-purple-400"
                      : t.type === "instrument"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {t.type === "song" ? "🎵" : t.type === "instrument" ? "🥁" : "💡"} {t.type}
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    t.status === "published"
                      ? "bg-green-500/20 text-green-400"
                      : t.status === "rejected"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {t.status}
                  </span>

                  {t.audio_source === "youtube" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      📺 YouTube
                    </span>
                  )}

                  {/* ✅ NOUVEAU : Badge allow_download */}
                  {t.audio_source === "upload" && t.allow_download && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                      <Download size={8} />
                      Téléchargeable
                    </span>
                  )}

                  {t.country_code ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                      <MapPin size={8} />
                      [{t.country_code}] {t.country_name_fr || t.country_code}
                      {t.city && (
                        <span className="text-gray-500"> · {t.city}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                      ⚠️ Non géolocalisé
                    </span>
                  )}

                  {(t.year || t.era_decade) && (
                    <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                      <Calendar size={8} />
                      {t.year || `${t.era_decade}s`}
                    </span>
                  )}
                </div>

                <p className="text-white text-sm font-semibold truncate">
                  {t.title_fr}
                </p>
                <p className="text-gray-500 text-xs italic truncate">
                  {t.artist_fr || "Artiste inconnu"}
                  {t.location_name_fr && ` · ${t.location_name_fr}`}
                </p>

                {/* ✅ Contributeur - Affiche le NOM RÉEL */}
                {t.submitter_display_name && (
                  <p className="text-[10px] text-[#D4AF37] mt-0.5 flex items-center gap-1">
                    <User size={8} />
                    Soumis par <strong className="text-white">@{t.submitter_display_name}</strong>
                  </p>
                )}

                {t.lat != null && t.lng != null && (
                  <p className="text-[10px] text-gray-700 font-mono mt-0.5">
                    📍 {t.lat.toFixed(5)}, {t.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              {/* Bouton Éditer */}
              <button
                onClick={() => handleEdit(t)}
                className="p-2 bg-white/5 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                title="Modifier"
              >
                <Edit2 size={15} />
              </button>

              {/* ✅ NOUVEAU : Bouton Publier/Dépublier (only for uploads) */}
              {t.audio_source === "upload" && t.status === "published" && (
                <button
                  onClick={() => handleTogglePublish(t.id, t.allow_download ?? false)}
                  disabled={actionId === t.id}
                  className={`p-2 rounded-lg transition-colors ${
                    t.allow_download ?? false
                      ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                      : "bg-orange-600/20 text-orange-400 hover:bg-orange-600/30"
                  }`}
                  title={t.allow_download ? "Masquer le téléchargement" : "Autoriser le téléchargement"}
                >
                  {actionId === t.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : t.allow_download ? (
                    <Unlock size={15} />
                  ) : (
                    <Lock size={15} />
                  )}
                </button>
              )}

              {/* Boutons Approuver/Rejeter pour suggestions pending */}
              {t.type === "suggestion" && t.status === "pending" && (
                <>
                  <button
                    onClick={() => handleApprove(t.id, t)}
                    disabled={actionId === t.id}
                    className="p-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Approuver et publier"
                  >
                    {actionId === t.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  </button>
                  <button
                    onClick={() => handleReject(t.id)}
                    disabled={actionId === t.id}
                    className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition-colors disabled:opacity-50"
                    title="Rejeter"
                  >
                    {actionId === t.id ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                  </button>
                </>
              )}

              {/* Bouton Supprimer */}
              <button
                onClick={() => handleDeleteClick(t.id)}
                className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Lecteur inline */}
            {playingId === t.id && (
              <div className="w-full border-t border-white/10 pt-3 mt-1">
                {t.audio_source === "youtube" || t.youtube_url ? (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(t.youtube_url || t.audio_url)}`}
                      title="YouTube preview"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <audio
                    src={t.audio_url}
                    autoPlay
                    controls
                    className="w-full h-8"
                    onEnded={() => setPlayingId(null)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal suppression */}
      <DeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer ce track ?"
        description="Cette action est irréversible. Le track sera retiré de la carte."
        itemName={tracks.find((t) => t.id === trackToDelete)?.title_fr}
        dependencies={[
          ...(tracks.find((t) => t.id === trackToDelete)?.country_code
            ? ["Ce track contribue aux statistiques du pays"]
            : []),
        ]}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setTrackToDelete(null);
        }}
        isDeleting={isDeleting}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />
    </div>
  );
}