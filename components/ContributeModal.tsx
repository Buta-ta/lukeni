"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, Upload, Music, MapPin, AlertCircle, CheckCircle,
  Languages, ImagePlus, FileText, User, Globe, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoTranslate } from "@/lib/lingua";
import GeoSearch from "@/components/admin/shared/GeoSearch";
import type { GeoResult } from "@/lib/geocoding";

const GOLD = "#D4AF37";

interface ContributeModalProps {
  onClose: () => void;
  lang: "fr" | "en";
  initialCountry?: string;
  user: any;
  genres: any[];
  eras: any[];
}

export default function ContributeModal({
  onClose,
  lang,
  initialCountry,
  user,
  genres,
  eras,
}: ContributeModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [countryCode, setCountryCode] = useState(initialCountry || "");
  const [city, setCity] = useState("");
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);

  const [erDecade, setEraDecade] = useState<number | null>(null);
  const [eraLabel, setEraLabel] = useState("");

  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genreId, setGenreId] = useState("");
  const [customGenre, setCustomGenre] = useState("");

  const [audioUrl, setAudioUrl] = useState("");
  const [audioSource, setAudioSource] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");

  const [rightsType, setRightsType] = useState<
    "own_creation" | "public_domain" | "family_recording" | "traditional" | ""
  >("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  // Traduction
  const [isTranslating, setIsTranslating] = useState(false);

  // ── Cloudinary Widget ──────────────────────────────────────────────────────

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
              setCoverUrl(result.info.secure_url);
              setSuccess(lang === "fr" ? "✅ Cover uploadée !" : "✅ Cover uploaded!");
            } else {
              setAudioUrl(result.info.secure_url);
              setSuccess(lang === "fr" ? "✅ Audio uploadé !" : "✅ Audio uploaded!");
            }
            setTimeout(() => setSuccess(null), 2000);
          }
          if (error) setError(lang === "fr" ? "Erreur upload" : "Upload error");
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

  // ── GeoSearch ──────────────────────────────────────────────────────────────

  const handleGeoSelect = useCallback((result: GeoResult) => {
    setCountryCode(result.country_code || "");
    setCity((result as any).city || result.display_name || "");
    setGpsLat(result.lat);
    setGpsLng(result.lng);
  }, []);

  // ── Traduction ─────────────────────────────────────────────────────────────

  const handleTranslateDescription = async () => {
    if (!descriptionFr.trim()) return;
    setIsTranslating(true);
    try {
      const translated = await autoTranslate(descriptionFr, "fr");
      setDescriptionEn(translated);
      setSuccess(lang === "fr" ? "✅ Description traduite" : "✅ Description translated");
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError(lang === "fr" ? "Erreur traduction" : "Translation error");
    }
    setIsTranslating(false);
  };

  // ── Soumission ─────────────────────────────────────────────────────────────

  // ── Soumission ─────────────────────────────────────────────────────────────

const handleSubmit = async () => {
  setError(null);

  // ── Validations ──────────────────────────────────────────────────────────
  if (!user?.id) {
    setError(lang === "fr" ? "Utilisateur non connecté" : "User not authenticated");
    return;
  }

  if (!countryCode || !city || gpsLat === null || gpsLng === null) {
    setError(lang === "fr" ? "Localisation requise" : "Location required");
    return;
  }

  if (!title.trim()) {
    setError(lang === "fr" ? "Titre requis" : "Title required");
    return;
  }

  if (!artistName.trim()) {
    setError(lang === "fr" ? "Nom artiste requis" : "Artist name required");
    return;
  }

  if (!erDecade) {
    setError(lang === "fr" ? "Époque requise" : "Era required");
    return;
  }

  // ✅ genre_id : UUID valide (36 chars) OU null
  const finalGenreId = (genreId && genreId.length === 36) ? genreId : null;

  // ✅ audio_url : une seule URL
  const finalAudioUrl = audioSource === "upload" ? audioUrl : youtubeUrl;
  if (!finalAudioUrl) {
    setError(lang === "fr" ? "Audio requis" : "Audio required");
    return;
  }

  if (!rightsType || !rightsConfirmed) {
    setError(lang === "fr" ? "Confirmez vos droits" : "Confirm your rights");
    return;
  }

  setIsLoading(true);

  try {
    const payload = {
      contributor_id: user.id,
      title: title.trim(),
      artist_name: artistName.trim() || null,
      artist_type: null,
      instrument_name: null,
      country_code: countryCode || null,
      city: city || null,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      era_decade: erDecade,
      genre_id: finalGenreId,
      
      // ✅ CORRECTION : audio_source doit être "youtube" si c'est YouTube
      audio_url: finalAudioUrl,
      audio_source: audioSource,  // ✅ "upload" ou "youtube"
      
      cover_url: coverUrl || null,
      description_fr: descriptionFr.trim() || null,
      description_en: descriptionEn.trim() || null,
      rights_confirmed: true,
      rights_type: rightsType,
      status: "pending",
    };

    console.log("📤 Payload contribution:", payload);

    const { data, error: insertError } = await supabase
      .from("music_contributions")
      .insert(payload)
      .select();

    console.log("📥 Réponse:", { data, error: insertError });

    if (insertError) throw insertError;

    setSuccess(lang === "fr" ? "✅ Contribution soumise !" : "✅ Contribution submitted!");
    setTimeout(() => onClose(), 2000);

  } catch (err: any) {
    console.error("❌ Erreur:", err);
    setError(err.message || (lang === "fr" ? "Erreur soumission" : "Submission error"));
  } finally {
    setIsLoading(false);
  }
};
  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[#020111] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle size={48} className="mx-auto mb-4 text-amber-500" />
          <h3 className="text-xl font-bold text-white mb-2">
            {lang === "fr" ? "Connexion requise" : "Sign in required"}
          </h3>
          <p className="text-white/60 text-sm mb-6">
            {lang === "fr"
              ? "Vous devez être connecté pour contribuer."
              : "You must be signed in to contribute."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            >
              {lang === "fr" ? "Fermer" : "Close"}
            </button>
            <a
              href="/auth"
              className="flex-1 px-4 py-2 rounded-lg bg-[#D4AF37] text-black font-bold hover:bg-white transition-colors"
            >
              {lang === "fr" ? "Se connecter" : "Sign in"}
            </a>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0f0f0f] z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Music size={20} className="text-[#D4AF37]" />
              {lang === "fr" ? "Contribuer une musique" : "Contribute a music"}
            </h2>
            <p className="text-white/40 text-xs mt-1">
              {lang === "fr"
                ? "Partagez une musique africaine ou diaspora"
                : "Share an African or diaspora music"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-start gap-2"
            >
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* STEP 1: LOCALISATION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/[0.01]"
          >
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">
                {lang === "fr" ? "Localisation" : "Location"}
              </h3>
              <span className="ml-auto text-[10px] text-white/30">1/5</span>
            </div>

            <p className="text-[10px] text-white/40">
              {lang === "fr"
                ? "Recherchez votre pays, ville et positionnez-vous sur la carte"
                : "Search your country, city and pin yourself on the map"}
            </p>

            <GeoSearch
              onSelect={handleGeoSelect}
              value={{
                lat: gpsLat ?? undefined,
                lng: gpsLng ?? undefined,
                display_name: city || "",
              }}
              showCurrentLocation
              showManualInput
            />

            {gpsLat && gpsLng && (
              <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 rounded-lg p-3">
                <div>
                  <p className="text-white/40">Pays</p>
                  <p className="text-white font-mono">{countryCode}</p>
                </div>
                <div>
                  <p className="text-white/40">Ville</p>
                  <p className="text-white font-mono">{city || "—"}</p>
                </div>
                <div>
                  <p className="text-white/40">Latitude</p>
                  <p className="text-white font-mono">{gpsLat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-white/40">Longitude</p>
                  <p className="text-white font-mono">{gpsLng.toFixed(6)}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* STEP 2: ÉPOQUE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/[0.01]"
          >
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">
                {lang === "fr" ? "Époque" : "Era"}
              </h3>
              <span className="ml-auto text-[10px] text-white/30">2/5</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {eras.map((era) => (
                <button
                  key={era.id}
                  onClick={() => {
                    setEraDecade(era.value);
                    setEraLabel(lang === "fr" ? era.label_fr : era.label_en);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                    erDecade === era.value
                      ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                      : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                  }`}
                  style={{
                    backgroundColor:
                      erDecade === era.value
                        ? era.color || "#D4AF37"
                        : "rgba(255,255,255,0.05)",
                    borderColor:
                      erDecade === era.value
                        ? era.color || "#D4AF37"
                        : "rgba(255,255,255,0.1)",
                  }}
                >
                  {lang === "fr" ? era.label_fr : era.label_en}
                </button>
              ))}
            </div>
          </motion.div>

          {/* STEP 3: INFOS MUSIQUE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/[0.01]"
          >
            <div className="flex items-center gap-2">
              <Music size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">
                {lang === "fr" ? "Infos musique" : "Music info"}
              </h3>
              <span className="ml-auto text-[10px] text-white/30">3/5</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  {lang === "fr" ? "Titre *" : "Title *"}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    lang === "fr"
                      ? "Ex: Yéké Yéké, Waka Waka…"
                      : "Ex: Yéké Yéké, Waka Waka…"
                  }
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1">
                  {lang === "fr" ? "Artiste / Musicien *" : "Artist / Musician *"}
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder={
                    lang === "fr"
                      ? "Ex: Angélique Kidjo, Fela Kuti…"
                      : "Ex: Angélique Kidjo, Fela Kuti…"
                  }
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    {lang === "fr" ? "Genre *" : "Genre *"}
                  </label>
                  <select
                    value={genreId}
                    onChange={(e) => setGenreId(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">
                      {lang === "fr" ? "Sélectionner…" : "Select…"}
                    </option>
                    {genres.map((g) => (
                      <option key={g.id} value={g.id}>
                        {lang === "fr" ? g.nom_fr : g.nom_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    {lang === "fr"
                      ? "Ou nouveau genre"
                      : "Or new genre"}
                  </label>
                  <input
                    type="text"
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    placeholder={
                      lang === "fr"
                        ? "Ex: Bikutsi, Zouk…"
                        : "Ex: Bikutsi, Zouk…"
                    }
                    className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* STEP 4: AUDIO + COVER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/[0.01]"
          >
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">
                {lang === "fr" ? "Audio & Cover" : "Audio & Cover"}
              </h3>
              <span className="ml-auto text-[10px] text-white/30">4/5</span>
            </div>

            {/* Audio Source Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setAudioSource("upload")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  audioSource === "upload"
                    ? "bg-[#D4AF37] text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                📁 {lang === "fr" ? "Upload" : "Upload"}
              </button>
              <button
                onClick={() => setAudioSource("youtube")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  audioSource === "youtube"
                    ? "bg-red-600 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                📺 YouTube
              </button>
            </div>

            {audioSource === "upload" ? (
              <div className="p-4 border border-dashed border-white/15 rounded-xl text-center">
                {audioUrl ? (
                  <div className="space-y-2">
                    <p className="text-green-400 text-sm font-bold flex items-center justify-center gap-2">
                      <CheckCircle size={14} />
                      {lang === "fr" ? "Audio attaché" : "Audio attached"}
                    </p>
                    <audio src={audioUrl} controls className="w-full" />
                    <button
                      onClick={() => openCloudinaryWidget(false)}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      {lang === "fr" ? "Remplacer" : "Replace"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openCloudinaryWidget(false)}
                    disabled={isUploading}
                    className="w-full py-6 text-white/30 hover:text-[#D4AF37] transition-colors disabled:opacity-30"
                  >
                    {isUploading ? (
                      <Loader2 size={32} className="mx-auto animate-spin" />
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto mb-2" />
                        <span className="text-sm font-bold">
                          {lang === "fr"
                            ? "Uploader un audio"
                            : "Upload audio"}
                        </span>
                        <p className="text-[10px] text-white/20 mt-1">
                          MP3, WAV · Max 15 MB
                        </p>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-white/20">
                  {lang === "fr"
                    ? "Collez l'URL YouTube complète"
                    : "Paste full YouTube URL"}
                </p>
              </div>
            )}

            {/* Cover */}
            <div>
              <label className="block text-xs text-white/40 mb-2">
                <ImagePlus size={12} className="inline mr-1" />
                {lang === "fr" ? "Cover (optionnel)" : "Cover (optional)"}
              </label>
              <div className="flex items-center gap-3">
                {coverUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={coverUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setCoverUrl("")}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center bg-white/5">
                    <ImagePlus size={20} className="text-white/20" />
                  </div>
                )}
                <button
                  onClick={() => openCloudinaryWidget(true)}
                  disabled={isUploading}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  {coverUrl
                    ? lang === "fr"
                      ? "Remplacer"
                      : "Replace"
                    : lang === "fr"
                    ? "Uploader"
                    : "Upload"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* STEP 5: DESCRIPTION & DROITS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 p-4 border border-white/5 rounded-xl bg-white/[0.01]"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-white">
                {lang === "fr" ? "Description & Droits" : "Description & Rights"}
              </h3>
              <span className="ml-auto text-[10px] text-white/30">5/5</span>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-white/40 mb-1">
                {lang === "fr"
                  ? "Description (optionnel)"
                  : "Description (optional)"}
              </label>
              <textarea
                value={descriptionFr}
                onChange={(e) => setDescriptionFr(e.target.value)}
                rows={3}
                placeholder={
                  lang === "fr"
                    ? "Histoire du morceau, anecdotes…"
                    : "Song history, anecdotes…"
                }
                className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] resize-none"
              />
              <button
                onClick={handleTranslateDescription}
                disabled={isTranslating || !descriptionFr}
                className="mt-1 text-[10px] text-white/40 hover:text-[#D4AF37] flex items-center gap-1 disabled:opacity-30"
              >
                <Languages size={10} />
                {lang === "fr" ? "Traduire en EN" : "Translate to FR"}
              </button>
            </div>

            {descriptionEn && (
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  {lang === "fr" ? "Description EN" : "Description EN"}
                </label>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
            )}

            {/* Rights */}
            <div>
              <label className="block text-xs text-white/40 mb-2">
                {lang === "fr" ? "Type de droits *" : "Rights type *"}
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: "own_creation",
                    label: lang === "fr" ? "Création personnelle" : "Own creation",
                  },
                  {
                    value: "public_domain",
                    label:
                      lang === "fr"
                        ? "Domaine public"
                        : "Public domain",
                  },
                  {
                    value: "family_recording",
                    label:
                      lang === "fr"
                        ? "Enregistrement familial"
                        : "Family recording",
                  },
                  {
                    value: "traditional",
                    label:
                      lang === "fr"
                        ? "Musique traditionnelle"
                        : "Traditional music",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="radio"
                      name="rights"
                      value={option.value}
                      checked={
                        rightsType ===
                        (option.value as typeof rightsType)
                      }
                      onChange={(e) =>
                        setRightsType(e.target.value as typeof rightsType)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-white">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confirmation */}
            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg bg-white/5 border border-white/10">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-xs text-white/60">
                {lang === "fr"
                  ? "Je confirme posséder les droits de partage de cette musique."
                  : "I confirm ownership rights to share this music."}
              </span>
            </label>
          </motion.div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || isUploading}
            className="w-full py-3 px-4 bg-[#D4AF37] text-black rounded-lg font-bold text-sm hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            {lang === "fr" ? "Soumettre ma contribution" : "Submit my contribution"}
          </button>

          <p className="text-center text-[10px] text-white/30">
            {lang === "fr"
              ? "Votre contribution sera modérée avant apparition sur la carte."
              : "Your contribution will be moderated before appearing on the map."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}