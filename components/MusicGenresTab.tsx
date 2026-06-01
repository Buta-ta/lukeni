// components/MusicGenresTab.tsx

"use client";

import React, { useState, useEffect, useCallback, useRef} from "react";
import { motion, AnimatePresence } from "framer-motion"; // ← ✅ AJOUTE ICI
import {
  Loader2, Music, PlusCircle, Edit2, Trash2, X,
  Languages, SpellCheck, CheckCircle, Globe, MapPin,
  ChevronDown, Search, BarChart2, Plus, Palette,
  Tag, Info, AlertCircle, Link2, Navigation,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { autoTranslate, autoCorrect } from "@/lib/lingua";
import DeleteModal from "@/components/admin/shared/DeleteModal";
import maplibregl from "maplibre-gl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MusicGenre {
  id: string;
  nom_fr: string;
  nom_en: string;
  description_fr: string | null;
  description_en: string | null;
  famille_musicale: string | null;
  importance: number;
  status: string;
  image_url: string | null;
  country_codes: string[];
  dominant_color: string | null;
  tags: string[];
}

interface GenreRelation {
  id: string;
  genre_id_origin: string;
  genre_id_derived: string;
  origin_lat: number | null;
  origin_lng: number | null;
  origin_location_name: string | null;
  derived_lat: number | null;
  derived_lng: number | null;
  derived_location_name: string | null;
  relation_type: string;
  description_fr: string | null;
  description_en: string | null;
  origin_genre?: { nom_fr: string; nom_en: string };
  derived_genre?: { nom_fr: string; nom_en: string };
}

// ─── Pays du monde ────────────────────────────────────────────────────────────

const WORLD_COUNTRIES: Record<string, { name_fr: string; name_en: string; flag: string }> = {
  DZA: { name_fr: "Algérie", name_en: "Algeria", flag: "🇩🇿" },
  AGO: { name_fr: "Angola", name_en: "Angola", flag: "🇦🇴" },
  BEN: { name_fr: "Bénin", name_en: "Benin", flag: "🇧🇯" },
  BWA: { name_fr: "Botswana", name_en: "Botswana", flag: "🇧🇼" },
  BFA: { name_fr: "Burkina Faso", name_en: "Burkina Faso", flag: "🇧🇫" },
  BDI: { name_fr: "Burundi", name_en: "Burundi", flag: "🇧🇮" },
  CMR: { name_fr: "Cameroun", name_en: "Cameroon", flag: "🇨🇲" },
  CPV: { name_fr: "Cap-Vert", name_en: "Cape Verde", flag: "🇨🇻" },
  CAF: { name_fr: "Centrafrique", name_en: "C. African Rep.", flag: "🇨🇫" },
  TCD: { name_fr: "Tchad", name_en: "Chad", flag: "🇹🇩" },
  COM: { name_fr: "Comores", name_en: "Comoros", flag: "🇰🇲" },
  COD: { name_fr: "Congo (RDC)", name_en: "Congo (DRC)", flag: "🇨🇩" },
  COG: { name_fr: "Congo", name_en: "Congo", flag: "🇨🇬" },
  CIV: { name_fr: "Côte d'Ivoire", name_en: "Ivory Coast", flag: "🇨🇮" },
  DJI: { name_fr: "Djibouti", name_en: "Djibouti", flag: "🇩🇯" },
  EGY: { name_fr: "Égypte", name_en: "Egypt", flag: "🇪🇬" },
  GNQ: { name_fr: "Guinée Équatoriale", name_en: "Eq. Guinea", flag: "🇬🇶" },
  ERI: { name_fr: "Érythrée", name_en: "Eritrea", flag: "🇪🇷" },
  SWZ: { name_fr: "Eswatini", name_en: "Eswatini", flag: "🇸🇿" },
  ETH: { name_fr: "Éthiopie", name_en: "Ethiopia", flag: "🇪🇹" },
  GAB: { name_fr: "Gabon", name_en: "Gabon", flag: "🇬🇦" },
  GMB: { name_fr: "Gambie", name_en: "Gambia", flag: "🇬🇲" },
  GHA: { name_fr: "Ghana", name_en: "Ghana", flag: "🇬🇭" },
  GIN: { name_fr: "Guinée", name_en: "Guinea", flag: "🇬🇳" },
  GNB: { name_fr: "Guinée-Bissau", name_en: "Guinea-Bissau", flag: "🇬🇼" },
  KEN: { name_fr: "Kenya", name_en: "Kenya", flag: "🇰🇪" },
  LSO: { name_fr: "Lesotho", name_en: "Lesotho", flag: "🇱🇸" },
  LBR: { name_fr: "Libéria", name_en: "Liberia", flag: "🇱🇷" },
  LBY: { name_fr: "Libye", name_en: "Libya", flag: "🇱🇾" },
  MDG: { name_fr: "Madagascar", name_en: "Madagascar", flag: "🇲🇬" },
  MWI: { name_fr: "Malawi", name_en: "Malawi", flag: "🇲🇼" },
  MLI: { name_fr: "Mali", name_en: "Mali", flag: "🇲🇱" },
  MRT: { name_fr: "Mauritanie", name_en: "Mauritania", flag: "🇲🇷" },
  MUS: { name_fr: "Maurice", name_en: "Mauritius", flag: "🇲🇺" },
  MAR: { name_fr: "Maroc", name_en: "Morocco", flag: "🇲🇦" },
  MOZ: { name_fr: "Mozambique", name_en: "Mozambique", flag: "🇲🇿" },
  NAM: { name_fr: "Namibie", name_en: "Namibia", flag: "🇳🇦" },
  NER: { name_fr: "Niger", name_en: "Niger", flag: "🇳🇪" },
  NGA: { name_fr: "Nigéria", name_en: "Nigeria", flag: "🇳🇬" },
  RWA: { name_fr: "Rwanda", name_en: "Rwanda", flag: "🇷🇼" },
  STP: { name_fr: "São Tomé", name_en: "São Tomé", flag: "🇸🇹" },
  SEN: { name_fr: "Sénégal", name_en: "Senegal", flag: "🇸🇳" },
  SLE: { name_fr: "Sierra Leone", name_en: "Sierra Leone", flag: "🇸🇱" },
  SOM: { name_fr: "Somalie", name_en: "Somalia", flag: "🇸🇴" },
  ZAF: { name_fr: "Afrique du Sud", name_en: "South Africa", flag: "🇿🇦" },
  SSD: { name_fr: "Soudan du Sud", name_en: "South Sudan", flag: "🇸🇸" },
  SDN: { name_fr: "Soudan", name_en: "Sudan", flag: "🇸🇩" },
  TZA: { name_fr: "Tanzanie", name_en: "Tanzania", flag: "🇹🇿" },
  TGO: { name_fr: "Togo", name_en: "Togo", flag: "🇹🇬" },
  TUN: { name_fr: "Tunisie", name_en: "Tunisia", flag: "🇹🇳" },
  UGA: { name_fr: "Ouganda", name_en: "Uganda", flag: "🇺🇬" },
  ZMB: { name_fr: "Zambie", name_en: "Zambia", flag: "🇿🇲" },
  ZWE: { name_fr: "Zimbabwe", name_en: "Zimbabwe", flag: "🇿🇼" },
  BRA: { name_fr: "Brésil", name_en: "Brazil", flag: "🇧🇷" },
  USA: { name_fr: "États-Unis", name_en: "United States", flag: "🇺🇸" },
  CAN: { name_fr: "Canada", name_en: "Canada", flag: "🇨🇦" },
  JAM: { name_fr: "Jamaïque", name_en: "Jamaica", flag: "🇯🇲" },
  CUB: { name_fr: "Cuba", name_en: "Cuba", flag: "🇨🇺" },
  HTI: { name_fr: "Haïti", name_en: "Haiti", flag: "🇭🇹" },
  TTO: { name_fr: "Trinité-et-Tobago", name_en: "Trinidad & Tobago", flag: "🇹🇹" },
  COL: { name_fr: "Colombie", name_en: "Colombia", flag: "🇨🇴" },
  ARG: { name_fr: "Argentine", name_en: "Argentina", flag: "🇦🇷" },
  PER: { name_fr: "Pérou", name_en: "Peru", flag: "🇵🇪" },
  VEN: { name_fr: "Venezuela", name_en: "Venezuela", flag: "🇻🇪" },
  MEX: { name_fr: "Mexique", name_en: "Mexico", flag: "🇲🇽" },
  FRA: { name_fr: "France", name_en: "France", flag: "🇫🇷" },
  GBR: { name_fr: "Royaume-Uni", name_en: "United Kingdom", flag: "🇬🇧" },
  PRT: { name_fr: "Portugal", name_en: "Portugal", flag: "🇵🇹" },
  ESP: { name_fr: "Espagne", name_en: "Spain", flag: "🇪🇸" },
  DEU: { name_fr: "Allemagne", name_en: "Germany", flag: "🇩🇪" },
  BEL: { name_fr: "Belgique", name_en: "Belgium", flag: "🇧🇪" },
  ITA: { name_fr: "Italie", name_en: "Italy", flag: "🇮🇹" },
  NLD: { name_fr: "Pays-Bas", name_en: "Netherlands", flag: "🇳🇱" },
  IND: { name_fr: "Inde", name_en: "India", flag: "🇮🇳" },
  CHN: { name_fr: "Chine", name_en: "China", flag: "🇨🇳" },
  JPN: { name_fr: "Japon", name_en: "Japan", flag: "🇯🇵" },
  IDN: { name_fr: "Indonésie", name_en: "Indonesia", flag: "🇮🇩" },
  AUS: { name_fr: "Australie", name_en: "Australia", flag: "🇦🇺" },
  DIAF: { name_fr: "Diaspora Africaine", name_en: "African Diaspora", flag: "🌍" },
  CARIB: { name_fr: "Caraïbes", name_en: "Caribbean", flag: "🏝️" },
};

// ─── Familles musicales ───────────────────────────────────────────────────────

const MUSIC_FAMILIES = [
  "Afrobeats", "Afropop", "Afrojazz", "Afrohouse",
  "Griot / Tradition orale", "Musique classique africaine",
  "Highlife", "Jùjú", "Fuji", "Apala",
  "Mbalax", "Coupe-Décalé", "Coupé-Décalé",
  "Soukous / Rumba congolaise", "Ndombolo",
  "Afrobeat (Fela)", "Afropop nigérian",
  "Gnawa", "Chaabi", "Raï", "Maqam", "Tarab",
  "Reggae", "Dancehall", "Roots", "Ska",
  "Jazz africain", "Blues africain",
  "Gospel africain", "Musique sacrée",
  "Hip-hop africain", "Rap africain",
  "Électronique africaine", "Gqom", "Amapiano",
  "Kizomba", "Zouk", "Soca", "Calypso",
  "Bossa nova", "Samba", "Cumbia",
  "Musique du monde", "Fusion", "Contemporain",
  "Autre",
];

// ─── Suggestions de genres ────────────────────────────────────────────────────

const GENRE_SUGGESTIONS = [
  "Afrobeats", "Afropop", "Highlife", "Jùjú", "Fuji",
  "Mbalax", "Soukous", "Ndombolo", "Rumba congolaise",
  "Coupe-Décalé", "Coupé-Décalé", "Gnawa", "Chaabi", "Raï",
  "Afrobeat (Fela)", "Amapiano", "Gqom",
  "Kizomba", "Semba", "Tarraxinha",
  "Zouk", "Kompa", "Bèlè",
  "Reggae", "Dancehall", "Roots Reggae",
  "Soca", "Calypso", "Chutney",
  "Jazz", "Blues", "Soul", "R&B",
  "Gospel", "Spirituals", "Musique sacrée",
  "Hip-hop", "Rap", "Spoken word",
  "Électronique", "Afro House", "Deep House",
  "Bossa nova", "Samba", "Cumbia",
  "Musique traditionnelle", "Musique griot",
  "Musique classique", "Musique de cour",
];

// ─── Couleurs prédéfinies ─────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#D4AF37", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE",
  "#E74C3C", "#2ECC71", "#3498DB", "#9B59B6", "#F39C12",
  "#E91E63", "#00BCD4", "#8BC34A", "#FF5722", "#795548",
];

// ─── Sélecteur multi-pays ─────────────────────────────────────────────────────

function MultiCountrySelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [customName, setCustomName] = useState("");
  const dropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCustomMode(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const entries = Object.entries(WORLD_COUNTRIES);
  const filtered = search.trim()
    ? entries.filter(
        ([code, info]) =>
          info.name_fr.toLowerCase().includes(search.toLowerCase()) ||
          info.name_en.toLowerCase().includes(search.toLowerCase()) ||
          code.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  const addCustom = () => {
    if (!customName) return;
    const code = customCode || `CUST_${Date.now()}`;
    if (!value.includes(code)) onChange([...value, code]);
    setCustomCode(""); setCustomName(""); setCustomMode(false);
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 flex-wrap bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none hover:border-purple-500 transition-colors min-h-[44px]"
      >
        {value.length === 0 ? (
          <span className="text-gray-500 flex items-center gap-2 text-xs italic">
            <Globe size={14} /> Ex: Sénégal, Jamaïque, Brésil… (optionnel)
          </span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {value.map((code) => {
              const info = WORLD_COUNTRIES[code];
              return (
                <span
                  key={code}
                  className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-[11px] font-medium"
                >
                  {info?.flag ?? "🌍"} {info?.name_fr ?? code}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggle(code); }}
                    className="hover:text-white ml-0.5"
                  >
                    <X size={9} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <ChevronDown size={14} className={`ml-auto text-gray-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-[100] bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          {!customMode ? (
            <>
              <div className="p-2 border-b border-white/10">
                <div className="flex items-center gap-2 bg-black/30 rounded-md px-3 py-1.5">
                  <Search size={12} className="text-gray-500" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher : Nigeria, Jamaica, France…"
                    className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-600"
                  />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto">
                {filtered.map(([code, info]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggle(code)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/5 transition-colors ${value.includes(code) ? "bg-purple-500/20 text-purple-300" : "text-white"}`}
                  >
                    <span className="text-lg w-7 text-center">{info.flag}</span>
                    <span className="flex-1 text-left text-sm">{info.name_fr}</span>
                    <span className="text-gray-600 text-[10px] font-mono">{code}</span>
                    {value.includes(code) && <CheckCircle size={13} className="text-purple-400" />}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-gray-600 text-xs py-4">
                    Aucun résultat pour &quot;{search}&quot;
                  </p>
                )}
              </div>

              <div className="border-t border-white/10 p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-blue-400 hover:bg-blue-500/10 text-xs font-medium transition-colors rounded-lg"
                >
                  <Plus size={13} /> Ajouter un pays / région non listé(e)
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full text-center text-xs text-gray-600 hover:text-white py-1"
                >
                  {value.length} sélectionné(s) — Fermer
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-300 flex items-center gap-2"><Plus size={14} /> Pays / région personnalisé(e)</span>
                <button onClick={() => setCustomMode(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500">Code (optionnel)</label>
                  <input type="text" value={customCode} onChange={(e) => setCustomCode(e.target.value.toUpperCase().slice(0, 5))} placeholder="MAR" className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white text-xs font-mono outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500">Nom *</label>
                  <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ex: Antilles, Diaspora, Martinique…" className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-white text-xs outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCustomMode(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white">Annuler</button>
                <button type="button" onClick={addCustom} disabled={!customName} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-purple-500">Ajouter</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sélecteur de famille musicale ───────────────────────────────────────────

function FamilySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customVal, setCustomVal] = useState("");
  const dropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = MUSIC_FAMILIES.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative" ref={dropRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none hover:border-purple-500 transition-colors"
      >
        {value ? (
          <span className="flex-1 text-left">{value}</span>
        ) : (
          <span className="flex-1 text-left text-gray-500 italic text-xs">
            Ex: Afrobeats, Griot, Reggae, Hip-hop…
          </span>
        )}
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-[100] bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer ou saisir une nouvelle famille…"
              className="w-full bg-black/30 rounded px-3 py-1.5 text-white text-xs outline-none placeholder-gray-600"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { onChange(f); setOpen(false); setSearch(""); }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors ${value === f ? "text-purple-300 bg-purple-500/20" : "text-white"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="border-t border-white/10 p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={customVal}
                onChange={(e) => setCustomVal(e.target.value)}
                placeholder="Saisir une famille personnalisée…"
                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-white text-xs outline-none"
              />
              <button
                type="button"
                onClick={() => { if (customVal) { onChange(customVal); setOpen(false); setCustomVal(""); } }}
                disabled={!customVal}
                className="px-3 py-1.5 bg-purple-600 rounded text-white text-xs disabled:opacity-40 hover:bg-purple-500"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gestion des tags ─────────────────────────────────────────────────────────

function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = inputVal
    ? GENRE_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(inputVal.toLowerCase()) &&
          !value.includes(s),
      ).slice(0, 8)
    : GENRE_SUGGESTIONS.filter((s) => !value.includes(s)).slice(0, 8);

  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (clean && !value.includes(clean)) onChange([...value, clean]);
    setInputVal("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); if (inputVal) addTag(inputVal); }
              if (e.key === "," || e.key === ";") { e.preventDefault(); if (inputVal) addTag(inputVal); }
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            placeholder="Ex: afrobeats, griot, traditionnel… (Entrée pour valider)"
            className="flex-1 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 placeholder-gray-700"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => addTag(inputVal)}
              className="px-3 py-2 bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs hover:bg-purple-600/50 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-xl overflow-hidden">
            <p className="text-[10px] text-gray-600 px-3 pt-2 pb-1">Suggestions rapides :</p>
            <div className="flex flex-wrap gap-1.5 p-2">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-gray-300 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-300 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="w-full text-center text-[10px] text-gray-600 hover:text-white py-1.5 border-t border-white/5"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Couleur dominante ─────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${value === c ? "border-white scale-110 shadow-lg" : "border-transparent"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#D4AF37"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#D4AF37"
          className="flex-1 bg-[#1a1a1a] border border-white/20 rounded px-3 py-1.5 text-white text-xs font-mono outline-none focus:border-purple-500"
        />
        {value && (
          <div
            className="w-9 h-9 rounded-lg border border-white/20 flex-shrink-0"
            style={{ background: value }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Stats par genre ──────────────────────────────────────────────────────────

function GenreStats({ genreId }: { genreId: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!genreId) return;
    supabase
      .from("music_tracks")
      .select("id", { count: "exact", head: true })
      .eq("genre_id", genreId)
      .eq("status", "published")
      .then(({ count: c }) => setCount(c ?? 0));
  }, [genreId]);

  if (count === null) return null;
  return (
    <span className="text-[10px] text-gray-500 flex items-center gap-1">
      <BarChart2 size={9} />
      {count} track{count !== 1 ? "s" : ""}
    </span>
  );
}

// ─── Modal Connections Genres ─────────────────────────────────────────────────

function GenreConnectionsModal({
  genreId,
  genres,
  onClose,
  showMsg,
}: {
  genreId: string;
  genres: MusicGenre[];
  onClose: () => void;
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [relations, setRelations] = useState<GenreRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // ─── Form ───
  const [originGenreId, setOriginGenreId] = useState("");
  const [derivedGenreId, setDerivedGenreId] = useState("");
  const [relationType, setRelationType] = useState("influence");
  const [originLat, setOriginLat] = useState("");
  const [originLng, setOriginLng] = useState("");
  const [originLocation, setOriginLocation] = useState("");
  const [derivedLat, setDerivedLat] = useState("");
  const [derivedLng, setDerivedLng] = useState("");
  const [derivedLocation, setDerivedLocation] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ─── New genre ───
  const [originIsNew, setOriginIsNew] = useState(false);
  const [derivedIsNew, setDerivedIsNew] = useState(false);
  const [newOriginFr, setNewOriginFr] = useState("");
  const [newOriginEn, setNewOriginEn] = useState("");
  const [newDerivedFr, setNewDerivedFr] = useState("");
  const [newDerivedEn, setNewDerivedEn] = useState("");

  // ─── Mini map ───
  const [mapTarget, setMapTarget] = useState<"origin" | "derived">("origin");
  const miniMapRef = useRef<any>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ origin: any; derived: any }>({ origin: null, derived: null });

  // ─── Processing ───
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const currentGenre = genres.find((g) => g.id === genreId);
  const otherGenres = genres.filter((g) => g.id !== genreId);

  const RELATION_TYPES = [
    { value: "influence", label: "Influence", color: "#D4AF37", icon: "💡" },
    { value: "derived_from", label: "Dérivé de", color: "#9370DB", icon: "🔄" },
    { value: "fusion", label: "Fusion", color: "#4ECDC4", icon: "🔀" },
    { value: "migration", label: "Migration", color: "#FF6B9D", icon: "🚀" },
  ];

  useEffect(() => { fetchRelations(); }, [genreId]);

  // ─── Mini map init ───
  useEffect(() => {
    if (!showAddForm || !miniMapContainerRef.current) return;
    if (miniMapRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: miniMapContainerRef.current,
        // ✅ NOUVEAU CODE (fonctionne avec CORS)
style: {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
},
        center: [20, 2],
        zoom: 2.5,
        attributionControl: false,
      });
    } catch (e) {
      console.warn("Mini map error:", e);
      return;
    }

    map.on("click", (e: any) => {
      const { lat, lng } = e.lngLat;
      handleMapClick(lat, lng, map);
    });

    miniMapRef.current = map;

    return () => {
      try { map.remove(); } catch {}
      miniMapRef.current = null;
      markersRef.current = { origin: null, derived: null };
    };
  }, [showAddForm]);

  // ─── Map click handler ───
  function handleMapClick(lat: number, lng: number, map?: any) {
    const m = map || miniMapRef.current;
    const target = mapTarget;
    const color = target === "origin" ? "#9370DB" : "#4ECDC4";

    if (target === "origin") {
      setOriginLat(lat.toFixed(4));
      setOriginLng(lng.toFixed(4));
    } else {
      setDerivedLat(lat.toFixed(4));
      setDerivedLng(lng.toFixed(4));
    }

    if (m) {
      if (markersRef.current[target]) {
        markersRef.current[target].setLngLat([lng, lat]);
      } else {
        markersRef.current[target] = new maplibregl.Marker({ color })
          .setLngLat([lng, lat])
          .addTo(m);
      }
    }

    reverseGeocodeLight(lat, lng).then((name) => {
      if (name) {
        if (target === "origin") setOriginLocation(name);
        else setDerivedLocation(name);
      }
    });
  }

  // ─── Reverse geocode ───
  async function reverseGeocodeLight(lat: number, lng: number): Promise<string | null> {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
          lat: lat.toString(), lon: lng.toString(), format: "json", "accept-language": "fr",
        })}`,
        { signal: controller.signal, headers: { "User-Agent": "Lukeni/1.0" } }
      );
      const data = await res.json();
      const a = data?.address;
      if (!a) return null;
      return [a.city || a.town || a.village || a.state, a.country].filter(Boolean).join(", ");
    } catch { return null; }
  }

  // ─── Fetch ───
  async function fetchRelations() {
  setIsLoading(true);
  console.log("🔄 Fetch relations pour genre:", genreId);
  
  const { data, error } = await supabase
    .from("music_genre_relations")
    .select(`*, origin_genre:genre_id_origin (nom_fr, nom_en), derived_genre:genre_id_derived (nom_fr, nom_en)`)
    .or(`genre_id_origin.eq.${genreId},genre_id_derived.eq.${genreId}`);
  
  console.log("📊 Résultat fetch:", { data, error });
  
  if (error) showMsg("error", error.message);
  else if (data) {
    console.log("✅ Relations trouvées:", data.length);
    setRelations(data as unknown as GenreRelation[]);
  }
  setIsLoading(false);
}
  

  // ─── Translate ───
  async function handleTranslate(action: string) {
    setIsTranslating(action);
    try {
      if (action === "desc-fr→en") setDescEn(await autoTranslate(descFr, "fr"));
      if (action === "desc-en→fr") setDescFr(await autoTranslate(descEn, "en"));
      if (action === "origin-fr→en") setNewOriginEn(await autoTranslate(newOriginFr, "fr"));
      if (action === "derived-fr→en") setNewDerivedEn(await autoTranslate(newDerivedFr, "fr"));
    } catch { showMsg("error", "Erreur de traduction"); }
    setIsTranslating(null);
  }

  // ─── Geolocate ───
  async function handleGeolocate() {
    setIsGeolocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000,
        });
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      handleMapClick(lat, lng);
      miniMapRef.current?.flyTo({ center: [lng, lat], zoom: 6 });
    } catch {
      showMsg("error", "Géolocalisation refusée ou indisponible");
    }
    setIsGeolocating(false);
  }

  // ─── Save ───
async function handleAddRelation() {
  console.log("🔍 DEBUG handleAddRelation:", {
    originGenreId,
    derivedGenreId,
    originIsNew,
    derivedIsNew,
    newOriginFr,
    newDerivedFr,
    originLat,
    originLng,
    derivedLat,
    derivedLng,
  });

  let finalOriginId = originGenreId;
  let finalDerivedId = derivedGenreId;

  // ─── Créer genre origine si nouveau ───
   if (originIsNew && newOriginFr.trim()) {
    console.log("🆕 Vérification genre origine:", newOriginFr);
    
    // 1️⃣ Chercher si existe déjà
    const { data: existing } = await supabase
      .from("music_genres")
      .select("id")
      .eq("nom_fr", newOriginFr.trim())
      .single();
    
    if (existing) {
      finalOriginId = existing.id;
      console.log("✅ Genre origine existe déjà:", finalOriginId);
    } else {
      // 2️⃣ Créer seulement s'il n'existe pas
      const { data, error } = await supabase
        .from("music_genres")
        .insert({
          nom_fr: newOriginFr.trim(),
          nom_en: newOriginEn.trim() || newOriginFr.trim(),
          description_fr: "",
          description_en: "",
          status: "draft",
          importance: 1,
          dominant_color: "#9370DB",
          country_codes: [],
          tags: [],
          famille_musicale: null,
          image_url: null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("❌ Erreur création origine:", error);
        showMsg("error", `Erreur origine: ${error.message}`);
        return;
      }
      finalOriginId = data.id;
      console.log("✅ Genre origine créé:", finalOriginId);
    }
  }

  // ─── Créer genre dérivé si nouveau ───
  if (derivedIsNew && newDerivedFr.trim()) {
    console.log("🆕 Création genre dérivé:", newDerivedFr);
    const { data, error } = await supabase
      .from("music_genres")
      .insert({
        nom_fr: newDerivedFr.trim(),
        nom_en: newDerivedEn.trim() || newDerivedFr.trim(),
        description_fr: "",
        description_en: "",
        status: "draft",
        importance: 1,
        dominant_color: "#4ECDC4",
        country_codes: [],
        tags: [],
        famille_musicale: null,
        image_url: null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("❌ Erreur création dérivé:", error);
      showMsg("error", `Erreur dérivé: ${error.message}`);
      return;
    }
    finalDerivedId = data.id;
    console.log("✅ Genre dérivé créé:", finalDerivedId);
  }

  // ─── Validation ───
  if (!finalOriginId || !finalDerivedId) {
    console.error("❌ IDs manquants:", { finalOriginId, finalDerivedId });
    showMsg("error", "Sélectionnez ou créez les deux genres");
    return;
  }

  // ─── Préparation coords GPS ───
  const oLat = originLat && originLat.trim() !== "" ? parseFloat(originLat) : null;
  const oLng = originLng && originLng.trim() !== "" ? parseFloat(originLng) : null;
  const dLat = derivedLat && derivedLat.trim() !== "" ? parseFloat(derivedLat) : null;
  const dLng = derivedLng && derivedLng.trim() !== "" ? parseFloat(derivedLng) : null;

  console.log("📍 Coords GPS:", { oLat, oLng, dLat, dLng });

  // ─── Insert relation ───
  setIsSaving(true);
  const { data: relationData, error: relationError } = await supabase
    .from("music_genre_relations")
    .insert({
      genre_id_origin: finalOriginId,
      genre_id_derived: finalDerivedId,
      origin_lat: oLat,
      origin_lng: oLng,
      origin_location_name: originLocation && originLocation.trim() ? originLocation.trim() : null,
      derived_lat: dLat,
      derived_lng: dLng,
      derived_location_name: derivedLocation && derivedLocation.trim() ? derivedLocation.trim() : null,
      relation_type: relationType,
      description_fr: descFr && descFr.trim() ? descFr.trim() : null,
      description_en: descEn && descEn.trim() ? descEn.trim() : null,
    })
    .select();

  setIsSaving(false);

  console.log("📝 Résultat insert:", { relationData, relationError });

  if (relationError) {
    console.error("❌ Erreur relation:", relationError);
    showMsg("error", `Erreur: ${relationError.message}`);
  } else {
    console.log("✅ Connection créée avec succès!");
    showMsg("success", "✅ Connection ajoutée !");
    fetchRelations();
    resetForm();
  }
}

  function resetForm() {
    setOriginGenreId(""); setDerivedGenreId("");
    setOriginLat(""); setOriginLng(""); setOriginLocation("");
    setDerivedLat(""); setDerivedLng(""); setDerivedLocation("");
    setDescFr(""); setDescEn(""); setRelationType("influence");
    setOriginIsNew(false); setDerivedIsNew(false);
    setNewOriginFr(""); setNewOriginEn("");
    setNewDerivedFr(""); setNewDerivedEn("");
    try {
      markersRef.current.origin?.remove();
      markersRef.current.derived?.remove();
    } catch {}
    markersRef.current = { origin: null, derived: null };
  }

  async function handleDeleteRelation(id: string) {
    const { error } = await supabase.from("music_genre_relations").delete().eq("id", id);
    if (error) showMsg("error", error.message);
    else { showMsg("success", "✅ Connection supprimée !"); fetchRelations(); }
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
        className="w-full max-w-3xl rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: "rgba(2,1,17,0.99)", border: `1px solid ${GOLD}33` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/6 sticky top-0 z-10" style={{ background: "rgba(2,1,17,0.99)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}22` }}>
              <Link2 size={20} style={{ color: GOLD }} />
            </div>
            <div>
              <h2 className="text-white font-serif text-lg">Connections de Genres</h2>
              <p className="text-white/30 text-xs">{currentGenre?.nom_fr || "Genre"} — Origine et influences</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add button / form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-xl text-[#D4AF37] font-bold text-sm hover:bg-[#D4AF37]/30 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Ajouter une connection
            </button>
          ) : (
            <div className="bg-white/[0.03] rounded-2xl p-5 border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Plus size={16} style={{ color: GOLD }} /> Nouvelle Connection
                </h3>
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="text-white/30 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* ── Genres ── */}
              <div className="flex items-start gap-3">
                {/* Origin */}
                <div className="flex-1">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">Genre origine *</label>
                  {!originIsNew ? (
                    <div className="flex gap-1.5">
                      <select
                        value={originGenreId}
                        onChange={(e) => setOriginGenreId(e.target.value)}
                        className="flex-1 bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#9370DB]"
                      >
                        <option value="">— Sélectionner —</option>
                        {otherGenres.map((g) => (
                          <option key={g.id} value={g.id}>{g.nom_fr}{g.nom_en ? ` (${g.nom_en})` : ""}</option>
                        ))}
                      </select>
                      <button onClick={() => setOriginIsNew(true)} className="px-2.5 py-2 bg-[#9370DB]/20 border border-[#9370DB]/30 rounded-lg text-[#9370DB] text-[10px] font-bold hover:bg-[#9370DB]/30" title="Créer un nouveau genre">
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 bg-[#9370DB]/10 border border-[#9370DB]/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#9370DB] font-bold uppercase tracking-wider">Nouveau genre</span>
                        <button onClick={() => setOriginIsNew(false)} className="text-white/30 hover:text-white"><X size={12} /></button>
                      </div>
                      <input type="text" value={newOriginFr} onChange={(e) => setNewOriginFr(e.target.value)} placeholder="Nom FR *" className="w-full bg-[#1a1a1a] border border-white/15 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-[#9370DB]" />
                      <div className="flex gap-1.5">
                        <input type="text" value={newOriginEn} onChange={(e) => setNewOriginEn(e.target.value)} placeholder="Nom EN" className="flex-1 bg-[#1a1a1a] border border-white/15 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-[#9370DB]" />
                        <button onClick={() => handleTranslate("origin-fr→en")} disabled={!!isTranslating || !newOriginFr} className="px-2 py-1.5 bg-[#9370DB]/20 text-[#9370DB] rounded text-[9px] font-bold hover:bg-[#9370DB]/30 disabled:opacity-30">
                          {isTranslating === "origin-fr→en" ? <Loader2 size={10} className="animate-spin" /> : "FR→EN"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="pt-7 text-white/20"><Navigation size={16} className="rotate-90" /></div>

                {/* Derived */}
                <div className="flex-1">
                  <label className="block text-[10px] text-white/40 mb-1.5 uppercase tracking-wider font-bold">Genre dérivé *</label>
                  {!derivedIsNew ? (
                    <div className="flex gap-1.5">
                      <select
                        value={derivedGenreId}
                        onChange={(e) => setDerivedGenreId(e.target.value)}
                        className="flex-1 bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#4ECDC4]"
                      >
                        <option value="">— Sélectionner —</option>
                        {otherGenres.map((g) => (
                          <option key={g.id} value={g.id}>{g.nom_fr}{g.nom_en ? ` (${g.nom_en})` : ""}</option>
                        ))}
                      </select>
                      <button onClick={() => setDerivedIsNew(true)} className="px-2.5 py-2 bg-[#4ECDC4]/20 border border-[#4ECDC4]/30 rounded-lg text-[#4ECDC4] text-[10px] font-bold hover:bg-[#4ECDC4]/30" title="Créer un nouveau genre">
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 bg-[#4ECDC4]/10 border border-[#4ECDC4]/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#4ECDC4] font-bold uppercase tracking-wider">Nouveau genre</span>
                        <button onClick={() => setDerivedIsNew(false)} className="text-white/30 hover:text-white"><X size={12} /></button>
                      </div>
                      <input type="text" value={newDerivedFr} onChange={(e) => setNewDerivedFr(e.target.value)} placeholder="Nom FR *" className="w-full bg-[#1a1a1a] border border-white/15 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-[#4ECDC4]" />
                      <div className="flex gap-1.5">
                        <input type="text" value={newDerivedEn} onChange={(e) => setNewDerivedEn(e.target.value)} placeholder="Nom EN" className="flex-1 bg-[#1a1a1a] border border-white/15 rounded px-3 py-1.5 text-white text-xs outline-none focus:border-[#4ECDC4]" />
                        <button onClick={() => handleTranslate("derived-fr→en")} disabled={!!isTranslating || !newDerivedFr} className="px-2 py-1.5 bg-[#4ECDC4]/20 text-[#4ECDC4] rounded text-[9px] font-bold hover:bg-[#4ECDC4]/30 disabled:opacity-30">
                          {isTranslating === "derived-fr→en" ? <Loader2 size={10} className="animate-spin" /> : "FR→EN"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Relation type ── */}
              <div>
                <label className="block text-[10px] text-white/40 mb-2 uppercase tracking-wider font-bold">Type de relation</label>
                <div className="flex gap-2 flex-wrap">
                  {RELATION_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setRelationType(rt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        relationType === rt.value ? "border-current shadow-lg" : "border-white/10 text-white/40 hover:text-white/60"
                      }`}
                      style={relationType === rt.value ? { color: rt.color, borderColor: rt.color, backgroundColor: `${rt.color}20` } : {}}
                    >
                      {rt.icon} {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Mini map ── */}
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/10">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <MapPin size={10} /> Cliquez pour positionner
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMapTarget("origin")}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                        mapTarget === "origin" ? "bg-[#9370DB]/30 text-[#9370DB] border border-[#9370DB]/50" : "text-white/30 border border-transparent hover:text-white/50"
                      }`}
                    >
                      📍 Origine
                    </button>
                    <button
                      onClick={() => setMapTarget("derived")}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-bold transition-all ${
                        mapTarget === "derived" ? "bg-[#4ECDC4]/30 text-[#4ECDC4] border border-[#4ECDC4]/50" : "text-white/30 border border-transparent hover:text-white/50"
                      }`}
                    >
                      📍 Dérivé
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    <button
                      onClick={handleGeolocate}
                      disabled={isGeolocating}
                      className="px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-30 transition-all flex items-center gap-1"
                    >
                      {isGeolocating ? <Loader2 size={9} className="animate-spin" /> : <Navigation size={9} />}
                      Ma position
                    </button>
                  </div>
                </div>
                <div ref={miniMapContainerRef} className="w-full h-48 cursor-crosshair" />
                <div className="flex items-center gap-4 px-4 py-2 bg-white/[0.03] border-t border-white/10 text-[10px]">
                  <span className={originLat ? "text-[#9370DB]" : "text-white/20"}>
                    🟣 {originLat ? `${originLat}, ${originLng}` : "— non défini —"}
                    {originLocation && <span className="text-white/30 ml-1">({originLocation})</span>}
                  </span>
                  <span className={derivedLat ? "text-[#4ECDC4]" : "text-white/20"}>
                    🟢 {derivedLat ? `${derivedLat}, ${derivedLng}` : "— non défini —"}
                    {derivedLocation && <span className="text-white/30 ml-1">({derivedLocation})</span>}
                  </span>
                </div>
              </div>

              {/* ── Descriptions ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Description FR</label>
                    <button
  type="button"  // ✅ AJOUTE CECI
  onClick={() => handleTranslate("desc-fr→en")}
  disabled={!!isTranslating || !descFr}
  className="text-[9px] text-[#D4AF37] hover:text-white disabled:opacity-30 flex items-center gap-1"
>

                      {isTranslating === "desc-fr→en" ? <Loader2 size={9} className="animate-spin" /> : <Languages size={9} />} FR→EN
                    </button>
                  </div>
                  <textarea value={descFr} onChange={(e) => setDescFr(e.target.value)} rows={3} placeholder="Ex: L'Afrobeats a influencé l'Amapiano…" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37] resize-none placeholder-white/15" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Description EN</label>
                    <button
  type="button"  // ✅ AJOUTE CECI
  onClick={() => handleTranslate("desc-en→fr")}
  disabled={!!isTranslating || !descEn}
  className="text-[9px] text-[#D4AF37] hover:text-white disabled:opacity-30 flex items-center gap-1"
>
                      {isTranslating === "desc-en→fr" ? <Loader2 size={9} className="animate-spin" /> : <Languages size={9} />} EN→FR
                    </button>
                  </div>
                  <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={3} placeholder="Ex: Afrobeats influenced Amapiano…" className="w-full bg-[#1a1a1a] border border-white/15 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#D4AF37] resize-none placeholder-white/15" />
                </div>
              </div>

              {/* ── Submit ── */}
              <button
                onClick={handleAddRelation}
                disabled={isSaving || (!originGenreId && !originIsNew) || (!derivedGenreId && !derivedIsNew)}
                className="w-full py-2.5 bg-[#D4AF37] text-black rounded-xl font-bold text-sm hover:bg-[#E5C158] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {isSaving ? "Création…" : "Créer la connection"}
              </button>
            </div>
          )}

          {/* ── Existing relations ── */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <Globe size={14} style={{ color: GOLD }} />
              Connections existantes ({relations.length})
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" style={{ color: GOLD }} size={24} /></div>
            ) : relations.length === 0 ? (
              <div className="text-center py-8 text-white/20 text-sm">
                <Link2 size={32} className="mx-auto mb-2 opacity-20" />
                <p>Aucune connection</p>
                <p className="text-[10px] text-white/10 mt-1">Ajoutez une connection pour voir les liens sur la carte</p>
              </div>
            ) : (
              <div className="space-y-2">
                {relations.map((r) => {
                  const rt = RELATION_TYPES.find((t) => t.value === r.relation_type);
                  return (
                    <div key={r.id} className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/8 hover:border-white/15 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white text-sm font-medium">{r.origin_genre?.nom_fr || "Origine"}</span>
                          <span style={{ color: rt?.color || GOLD }} className="text-xs">{rt?.icon || "→"}</span>
                          <span className="text-white text-sm font-medium">{r.derived_genre?.nom_fr || "Dérivé"}</span>
                          {rt && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: rt.color, backgroundColor: `${rt.color}20` }}>
                              {rt.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-white/30">
                          {r.origin_location_name && <span className="flex items-center gap-1"><MapPin size={9} className="text-[#9370DB]" /> {r.origin_location_name}</span>}
                          {r.derived_location_name && <span className="flex items-center gap-1"><MapPin size={9} className="text-[#4ECDC4]" /> {r.derived_location_name}</span>}
                        </div>
                        {(r.description_fr || r.description_en) && (
                          <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{r.description_fr || r.description_en}</p>
                        )}
                      </div>
                      <button onClick={() => handleDeleteRelation(r.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

const GOLD = "#D4AF37";

export default function MusicGenresTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [genres, setGenres] = useState<MusicGenre[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchGenre, setSearchGenre] = useState("");

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomFr, setNomFr] = useState("");
  const [nomEn, setNomEn] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [famille, setFamille] = useState("");
  const [importance, setImportance] = useState(3);
  const [status, setStatus] = useState("draft");
  const [imageUrl, setImageUrl] = useState("");
  const [countryCodes, setCountryCodes] = useState<string[]>([]);
  const [dominantColor, setDominantColor] = useState("#D4AF37");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Modal suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tracksCount, setTracksCount] = useState<number>(0);

  // ✅ NOUVEAU: Modal connections
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [selectedGenreForConnections, setSelectedGenreForConnections] = useState<string | null>(null);

  useEffect(() => { fetchGenres(); }, []);

  async function fetchGenres() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("music_genres")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) showMsg("error", error.message);
    else if (data) setGenres(data as MusicGenre[]);
    setIsLoading(false);
  }

  const resetForm = useCallback(() => {
    setEditingId(null);
    setNomFr(""); setNomEn("");
    setDescFr(""); setDescEn("");
    setFamille(""); setImportance(3);
    setStatus("draft"); setImageUrl("");
    setCountryCodes([]); setDominantColor("#D4AF37");
    setTags([]);
  }, []);

  const handleEdit = useCallback((g: MusicGenre) => {
    setEditingId(g.id);
    setNomFr(g.nom_fr || "");
    setNomEn(g.nom_en || "");
    setDescFr(g.description_fr || "");
    setDescEn(g.description_en || "");
    setFamille(g.famille_musicale || "");
    setImportance(g.importance || 3);
    setStatus(g.status || "draft");
    setImageUrl(g.image_url || "");
    setCountryCodes(g.country_codes || []);
    setDominantColor(g.dominant_color || "#D4AF37");
    setTags(g.tags || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const checkGenreDependencies = async (genreId: string) => {
    const { count } = await supabase
      .from("music_tracks")
      .select("id", { count: "exact", head: true })
      .eq("genre_id", genreId);
    
    setTracksCount(count || 0);
    return count || 0;
  };

  const handleDeleteClick = async (id: string) => {
    await checkGenreDependencies(id);
    setGenreToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!genreToDelete) return;
    
    const count = await checkGenreDependencies(genreToDelete);
    
    if (count > 0) {
      showMsg("error", `⚠️ Ce genre est utilisé par ${count} track(s). Réassignez-les d'abord.`);
      setDeleteModalOpen(false);
      setGenreToDelete(null);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase.from("music_genres").delete().eq("id", genreToDelete);
      if (error) throw error;
      setGenres((prev) => prev.filter((g) => g.id !== genreToDelete));
      showMsg("success", "Genre supprimé.");
      setDeleteModalOpen(false);
      setGenreToDelete(null);
      setTracksCount(0);
    } catch (error: any) {
      showMsg("error", error.message);
    }
    
    setIsDeleting(false);
  };

  const handleLingua = async (action: string) => {
    setIsProcessing(action);
    try {
      if (action === "translate-en") setNomEn(await autoTranslate(nomFr, "fr"));
      if (action === "translate-fr") setNomFr(await autoTranslate(nomEn, "en"));
      if (action === "correct-fr") setNomFr(await autoCorrect(nomFr, "fr"));
      if (action === "correct-en") setNomEn(await autoCorrect(nomEn, "en"));
      if (action === "translate-desc-en") setDescEn(await autoTranslate(descFr, "fr"));
      if (action === "translate-desc-fr") setDescFr(await autoTranslate(descEn, "en"));
    } catch {
      showMsg("error", "Erreur API lingua");
    }
    setIsProcessing(null);
  };

  const handleSave = async () => {
    if (!nomFr.trim()) return showMsg("error", "Nom FR requis.");
    
    setIsSaving(true);

    const cleanCountryCodes = Array.isArray(countryCodes) 
      ? countryCodes.filter(c => c && c.trim()) 
      : [];
    
    const cleanTags = Array.isArray(tags) 
      ? tags.filter(t => t && t.trim()) 
      : [];

    const payload = {
      nom_fr: nomFr.trim() || null,
      nom_en: nomEn.trim() || null,
      description_fr: descFr.trim() || null,
      description_en: descEn.trim() || null,
      famille_musicale: famille.trim() || null,
      importance: importance || 1,
      status: status || "draft",
      image_url: imageUrl?.trim() || null,
      country_codes: cleanCountryCodes,
      dominant_color: dominantColor || "#D4AF37",
      tags: cleanTags,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("music_genres")
          .update(payload)
          .eq("id", editingId)
          .select();
        
        if (error) throw new Error(error.message || "Erreur lors de la mise à jour");
        showMsg("success", "✅ Genre mis à jour !");
      } else {
        const insertPayload = { ...payload, created_at: new Date().toISOString() };
        const { data, error } = await supabase
          .from("music_genres")
          .insert(insertPayload)
          .select();
        
        if (error) throw new Error(error.message || "Erreur lors de la création");
        showMsg("success", "✅ Genre créé !");
      }
      
      resetForm();
      fetchGenres();
    } catch (err: any) {
      console.error("Error saving genre:", err);
      showMsg("error", err.message || "Erreur lors de la sauvegarde");
    }
    
    setIsSaving(false);
  };

  const baseFiltered = filter === "all" ? genres : genres.filter((g) => g.status === filter);
  const filtered = searchGenre
    ? baseFiltered.filter(
        (g) =>
          g.nom_fr?.toLowerCase().includes(searchGenre.toLowerCase()) ||
          g.nom_en?.toLowerCase().includes(searchGenre.toLowerCase()) ||
          g.famille_musicale?.toLowerCase().includes(searchGenre.toLowerCase()),
      )
    : baseFiltered;

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={40} />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Music className="text-purple-400" size={24} />
        <div>
          <h2 className="text-xl md:text-2xl font-serif">Genres Musicaux</h2>
          <p className="text-gray-400 text-xs">
            {genres.length} genres · {genres.filter((g) => g.status === "published").length} publiés
          </p>
        </div>
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {["all", "draft", "published", "archived"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === f ? "bg-purple-600 text-white border-purple-600" : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"}`}
            >
              {f === "all" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)} (
              {(f === "all" ? genres : genres.filter((g) => g.status === f)).length})
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
          <Search size={13} className="text-gray-500" />
          <input
            type="text"
            value={searchGenre}
            onChange={(e) => setSearchGenre(e.target.value)}
            placeholder="Rechercher un genre, famille…"
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder-gray-600"
          />
        </div>
      </div>

      {/* ── Formulaire ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {editingId ? <Edit2 size={18} className="text-purple-400" /> : <PlusCircle size={18} className="text-purple-400" />}
            {editingId ? "Modifier le Genre" : "Nouveau Genre"}
          </h3>
          {editingId && (
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <X size={14} /> Annuler
            </button>
          )}
        </div>

        {/* Noms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Nom FR *</label>
            <input
              type="text"
              value={nomFr}
              onChange={(e) => setNomFr(e.target.value)}
              placeholder="Ex: Mbalax, Afrobeats, Gnawa, Soukous…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 placeholder-gray-700"
            />
            <div className="flex gap-1 mt-1">
              <button onClick={() => handleLingua("correct-fr")} disabled={!!isProcessing} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Corriger</button>
              <button onClick={() => handleLingua("translate-fr")} disabled={!!isProcessing} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> EN→FR</button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Nom EN</label>
            <input
              type="text"
              value={nomEn}
              onChange={(e) => setNomEn(e.target.value)}
              placeholder="Ex: Mbalax, Afrobeats, Gnawa, Soukous…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 placeholder-gray-700"
            />
            <div className="flex gap-1 mt-1">
              <button onClick={() => handleLingua("correct-en")} disabled={!!isProcessing} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><SpellCheck size={10} /> Correct</button>
              <button onClick={() => handleLingua("translate-en")} disabled={!!isProcessing} className="p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> FR→EN</button>
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇫🇷 Description FR</label>
            <textarea
              value={descFr}
              onChange={(e) => setDescFr(e.target.value)}
              rows={4}
              placeholder="Ex: Musique sénégalaise créée par Youssou N'Dour dans les années 1970, fusion de sabar traditionnel et de jazz occidental…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 resize-none placeholder-gray-700"
            />
            <button onClick={() => handleLingua("translate-desc-en")} disabled={!!isProcessing} className="mt-1 p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Traduire en EN</button>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🇬🇧 Description EN</label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              rows={4}
              placeholder="Ex: Senegalese music created by Youssou N'Dour in the 1970s, a fusion of traditional sabar drumming and western jazz…"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 resize-none placeholder-gray-700"
            />
            <button onClick={() => handleLingua("translate-desc-fr")} disabled={!!isProcessing} className="mt-1 p-1 text-[10px] bg-white/5 text-gray-400 rounded hover:bg-white/10 flex items-center gap-1 disabled:opacity-30"><Languages size={10} /> Traduire en FR</button>
          </div>
        </div>

        {/* Famille musicale */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-mono">
            🎸 Famille musicale
          </label>
          <FamilySelector value={famille} onChange={setFamille} />
        </div>

        {/* Pays d'origine */}
        <div className="border border-purple-500/20 rounded-xl p-4 bg-purple-500/5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-purple-400" />
            <span className="text-sm font-bold text-purple-300">Pays / régions d&apos;origine</span>
            {countryCodes.length > 0 && (
              <span className="ml-auto text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {countryCodes.length} sélectionné(s)
              </span>
            )}
          </div>
          <MultiCountrySelector value={countryCodes} onChange={setCountryCodes} />
          <p className="text-[10px] text-gray-600 flex items-start gap-1.5">
            <Info size={9} className="flex-shrink-0 mt-0.5" />
            Associez ce genre aux pays où il est né ou prédominant. Vous pouvez ajouter des régions (Caraïbes, Diaspora…).
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-mono flex items-center gap-1.5">
            <Tag size={11} /> Tags / Mots-clés
          </label>
          <TagsInput value={tags} onChange={setTags} />
        </div>

        {/* Couleur dominante */}
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-mono flex items-center gap-1.5">
            <Palette size={11} /> Couleur dominante
            {dominantColor && (
              <span
                className="inline-block w-4 h-4 rounded-full ml-1 border border-white/20"
                style={{ background: dominantColor }}
              />
            )}
          </label>
          <ColorPicker value={dominantColor} onChange={setDominantColor} />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">⭐ Importance</label>
            <select
              value={importance}
              onChange={(e) => setImportance(parseInt(e.target.value))}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500"
            >
              <option value={1}>⭐ 1 — Mineur</option>
              <option value={2}>⭐⭐ 2 — Notable</option>
              <option value={3}>⭐⭐⭐ 3 — Important</option>
              <option value={4}>⭐⭐⭐⭐ 4 — Majeur</option>
              <option value={5}>⭐⭐⭐⭐⭐ 5 — Fondamental</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500"
            >
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
              <option value="archived">📦 Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-mono">🖼️ Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… ou /images/genre.jpg"
              className="w-full bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 placeholder-gray-700"
            />
          </div>
        </div>

        {/* Bouton save */}
        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-purple-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {editingId ? "Mettre à jour" : "Créer le Genre"}
          </button>
        </div>
      </div>

      {/* ── Liste des genres ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <Music size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun genre trouvé.</p>
          </div>
        )}

        {filtered.map((g) => (
          <div
            key={g.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl gap-3 hover:border-white/20 transition-colors group"
          >
            <div
              className="hidden sm:block flex-shrink-0 w-1 rounded-full self-stretch"
              style={{ background: g.dominant_color || "#D4AF37", minHeight: 40 }}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${g.status === "published" ? "bg-green-500/20 text-green-400" : g.status === "draft" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>
                  {g.status}
                </span>
                {g.famille_musicale && (
                  <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {g.famille_musicale}
                  </span>
                )}
                <span className="text-[10px] text-yellow-500/70">{"⭐".repeat(g.importance || 0)}</span>
                <GenreStats genreId={g.id} />
              </div>

              <p className="text-white text-sm font-semibold truncate">{g.nom_fr}</p>
              <p className="text-gray-500 text-xs italic truncate">{g.nom_en}</p>

              {(g.country_codes ?? []).length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {(g.country_codes ?? []).slice(0, 6).map((code) => {
                    const info = WORLD_COUNTRIES[code];
                    return (
                      <span key={code} className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                        {info?.flag ?? "🌍"} {info?.name_fr ?? code}
                      </span>
                    );
                  })}
                  {(g.country_codes ?? []).length > 6 && (
                    <span className="text-[10px] text-gray-600">+{(g.country_codes ?? []).length - 6}</span>
                  )}
                </div>
              )}

              {(g.tags ?? []).length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(g.tags ?? []).slice(0, 5).map((tag) => (
                    <span key={tag} className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => handleEdit(g)} className="p-2 bg-white/5 text-gray-400 hover:text-purple-400 rounded-lg transition-colors">
                <Edit2 size={15} />
              </button>
              {/* ✅ NOUVEAU BOUTON CONNECTIONS */}
              <button
                onClick={() => {
                  setSelectedGenreForConnections(g.id);
                  setShowConnectionsModal(true);
                }}
                className="p-2 bg-white/5 text-gray-400 hover:text-[#D4AF37] rounded-lg transition-colors"
                title="Gérer les connections"
              >
                <Link2 size={15} />
              </button>
              <button onClick={() => handleDeleteClick(g.id)} className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ MODAL DE SUPPRESSION */}
      <DeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer ce genre ?"
        description="Les tracks associés perdront leur genre. Cette action est irréversible."
        itemName={genres.find(g => g.id === genreToDelete)?.nom_fr}
        dependencies={
          tracksCount > 0 
            ? [`⚠️ ${tracksCount} track(s) utilisent ce genre`] 
            : []
        }
        warningMessage="Assurez-vous qu'aucun track n'utilise ce genre avant de supprimer."
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setGenreToDelete(null);
          setTracksCount(0);
        }}
        isDeleting={isDeleting}
        confirmText="Supprimer définitivement"
        cancelText="Annuler"
      />

      {/* ✅ MODAL CONNECTIONS GENRES */}
      <AnimatePresence>
        {showConnectionsModal && selectedGenreForConnections && (
          <GenreConnectionsModal
            genreId={selectedGenreForConnections}
            genres={genres}
            onClose={() => {
              setShowConnectionsModal(false);
              setSelectedGenreForConnections(null);
            }}
            showMsg={showMsg}
          />
        )}
      </AnimatePresence>
    </div>
  );
}