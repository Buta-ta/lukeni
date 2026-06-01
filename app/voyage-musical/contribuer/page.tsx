"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  MapPin, Clock, User, Upload, CheckCircle,
  ChevronLeft, ChevronRight, Loader2, X,
  Music, Users, Mic, Globe, AlertCircle
} from 'lucide-react';
import { AFRICAN_COUNTRIES } from '@/lib/countries';


// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Étape 1 — Où
  country_code: string;
  city: string;
  gps_lat: number | null;
  gps_lng: number | null;
  // Étape 2 — Quand
  era_decade: number | null;
  era_label_fr: string;
  era_label_en: string;
  // Étape 3 — Qui
  artist_type: 'solo' | 'group' | 'instrument' | 'ceremony' | 'anonymous' | '';
  artist_name: string;
  instrument_name: string;
  genre_id: string;
  // Étape 4 — Quoi
  title: string;
  audio_url: string;
  cover_url: string;
  description_fr: string;
  description_en: string;
  // Étape 5 — Droits
  rights_type: 'own_creation' | 'public_domain' | 'family_recording' | 'traditional' | '';
  rights_confirmed: boolean;
}

// ─── Décennies ────────────────────────────────────────────────────────────────

const DECADES_OPTIONS = [
  { value: 1900, label_fr: 'Avant 1920',    label_en: 'Before 1920' },
  { value: 1920, label_fr: 'Années 1920',   label_en: '1920s'       },
  { value: 1930, label_fr: 'Années 1930',   label_en: '1930s'       },
  { value: 1940, label_fr: 'Années 1940',   label_en: '1940s'       },
  { value: 1950, label_fr: 'Années 1950',   label_en: '1950s'       },
  { value: 1960, label_fr: 'Années 1960',   label_en: '1960s'       },
  { value: 1970, label_fr: 'Années 1970',   label_en: '1970s'       },
  { value: 1980, label_fr: 'Années 1980',   label_en: '1980s'       },
  { value: 1990, label_fr: 'Années 1990',   label_en: '1990s'       },
  { value: 2000, label_fr: 'Années 2000',   label_en: '2000s'       },
  { value: 2010, label_fr: 'Années 2010',   label_en: '2010s'       },
  { value: 2020, label_fr: "Aujourd'hui",   label_en: 'Today'       },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ContribuerPage() {
  const [lang, setLang]     = useState<'fr' | 'en'>('fr');
  const [step, setStep]     = useState(1);
  const [user, setUser]     = useState<any>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted]   = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    country_code: '', city: '', gps_lat: null, gps_lng: null,
    era_decade: null, era_label_fr: '', era_label_en: '',
    artist_type: '', artist_name: '', instrument_name: '', genre_id: '',
    title: '', audio_url: '', cover_url: '', description_fr: '', description_en: '',
    rights_type: '', rights_confirmed: false,
  });

  // Lire le param ?country= de l'URL
  useEffect(() => {
    const saved = localStorage.getItem('lukeni_lang') as 'fr' | 'en' | null;
    if (saved) setLang(saved);

    const params = new URLSearchParams(window.location.search);
    const country = params.get('country');
    if (country && AFRICAN_COUNTRIES[country]) {
      setForm(f => ({ ...f, country_code: country }));
    }

    supabase.auth.getSession().then(({ data: { session } }) =>
      setUser(session?.user ?? null)
    );

    supabase.from('music_genres')
      .select('id, nom_fr, nom_en, color')
      .eq('status', 'published')
      .then(({ data }) => setGenres(data || []));
  }, []);

  const update = (key: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  // ── Géolocalisation automatique ────────────────────────────────────────────

  const handleGeoLoc = useCallback(async () => {
    if (!navigator.geolocation) {
      setError(lang === 'fr' ? 'Géolocalisation non supportée' : 'Geolocation not supported');
      return;
    }
    setIsGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        update('gps_lat', lat);
        update('gps_lng', lng);

        // Reverse geocoding via Nominatim (OpenStreetMap, gratuit)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const countryCode = data.address?.country_code?.toUpperCase();
          if (data.address?.city || data.address?.town || data.address?.village) {
            update('city', data.address.city || data.address.town || data.address.village);
          }
          // Convertir code ISO 2 → ISO 3 si nécessaire
          // (Nominatim retourne ISO 2, notre DB utilise ISO 3)
          const iso2to3: Record<string, string> = {
            CD: 'COD', GH: 'GHA', NG: 'NGA', SN: 'SEN', ML: 'MLI',
            CI: 'CIV', CM: 'CMR', ET: 'ETH', TZ: 'TZA', KE: 'KEN',
            ZA: 'ZAF', MA: 'MAR', DZ: 'DZA', TN: 'TUN', EG: 'EGY',
            AO: 'AGO', MZ: 'MOZ', ZW: 'ZWE', ZM: 'ZMB', BJ: 'BEN',
            // ... ajouter selon les besoins
          };
          const iso3 = iso2to3[countryCode] || countryCode;
          if (iso3 && AFRICAN_COUNTRIES[iso3]) update('country_code', iso3);
        } catch {}
        setIsGeoLoading(false);
      },
      () => {
        setError(lang === 'fr'
          ? 'Impossible de vous localiser. Sélectionnez manuellement.'
          : 'Unable to locate you. Please select manually.');
        setIsGeoLoading(false);
      },
      { timeout: 8000 }
    );
  }, [lang]);

  // ── Upload Cloudinary ──────────────────────────────────────────────────────

  const openAudioWidget = useCallback(() => {
    setIsUploading(true);
    const open = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url'],
        resourceType: 'auto',
        multiple: false,
        maxFileSize: 15000000,
        clientAllowedFormats: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
      }, (_: any, result: any) => {
        setIsUploading(false);
        if (result.event === 'success') update('audio_url', result.info.secure_url);
      });
      widget.open();
    };

    // @ts-ignore
    if (!window.cloudinary) {
      const s = document.createElement('script');
      s.src = 'https://upload-widget.cloudinary.com/global/all.js';
      s.onload = open;
      document.body.appendChild(s);
    } else { open(); }
  }, []);

  const openCoverWidget = useCallback(() => {
    const open = () => {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget({
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera', 'url'],
        resourceType: 'image',
        multiple: false,
        maxFileSize: 5000000,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      }, (_: any, result: any) => {
        if (result.event === 'success') update('cover_url', result.info.secure_url);
      });
      widget.open();
    };
    // @ts-ignore
    if (!window.cloudinary) {
      const s = document.createElement('script');
      s.src = 'https://upload-widget.cloudinary.com/global/all.js';
      s.onload = open;
      document.body.appendChild(s);
    } else { open(); }
  }, []);

  // ── Validation par étape ───────────────────────────────────────────────────

  const canProceed = () => {
    switch (step) {
      case 1: return !!form.country_code;
      case 2: return !!form.era_decade;
      case 3: return !!form.artist_type && (
        form.artist_type === 'anonymous' ||
        form.artist_type === 'ceremony'  ||
        (form.artist_type === 'instrument' ? !!form.instrument_name : !!form.artist_name)
      );
      case 4: return !!form.title && !!form.audio_url;
      case 5: return !!form.rights_type && form.rights_confirmed;
      default: return false;
    }
  };

  // ── Soumission ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) {
      setError(lang === 'fr'
        ? 'Vous devez être connecté pour contribuer'
        : 'You must be logged in to contribute');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const { error: err } = await supabase.from('music_contributions').insert({
      contributor_id:  user.id,
      title:           form.title,
      artist_name:     form.artist_name || form.instrument_name || null,
      artist_type:     form.artist_type || null,
      instrument_name: form.instrument_name || null,
      country_code:    form.country_code,
      city:            form.city || null,
      gps_lat:         form.gps_lat,
      gps_lng:         form.gps_lng,
      era_decade:      form.era_decade,
      era_label_fr:    form.era_label_fr || null,
      era_label_en:    form.era_label_en || null,
      genre_id:        form.genre_id || null,
      audio_url:       form.audio_url,
      cover_url:       form.cover_url || null,
      description_fr:  form.description_fr || null,
      description_en:  form.description_en || null,
      rights_type:     form.rights_type,
      rights_confirmed: true,
      status:          'pending',
    });

    setIsSubmitting(false);
    if (err) { setError(err.message); return; }
    setIsSubmitted(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  const STEPS = [
    { num: 1, label_fr: 'Où',          label_en: 'Where',  icon: MapPin      },
    { num: 2, label_fr: 'Quand',        label_en: 'When',   icon: Clock       },
    { num: 3, label_fr: 'Qui',          label_en: 'Who',    icon: User        },
    { num: 4, label_fr: 'Quoi',         label_en: 'What',   icon: Upload      },
    { num: 5, label_fr: 'Droits',       label_en: 'Rights', icon: CheckCircle },
  ];

  // ── Succès ─────────────────────────────────────────────────────────────────
  if (isSubmitted) return (
    <div className="min-h-screen bg-[#020111] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 mx-auto mb-6"
        >
          <CheckCircle size={80} className="text-[#D4AF37]" />
        </motion.div>
        <h2 className="text-3xl font-serif italic text-white mb-4">
          {lang === 'fr' ? 'Merci pour votre contribution !' : 'Thank you for your contribution!'}
        </h2>
        <p className="text-white/50 text-sm mb-2">
          {lang === 'fr'
            ? 'Votre morceau a été soumis et sera examiné par notre équipe dans les 48-72h.'
            : 'Your track has been submitted and will be reviewed by our team within 48-72h.'}
        </p>
        <p className="text-white/30 text-xs mb-8">
          {lang === 'fr'
            ? 'Vous serez notifié par email une fois la validation effectuée.'
            : 'You will be notified by email once validated.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/voyage-musical"
            className="flex items-center justify-center gap-2 px-6 py-3 
              bg-[#D4AF37] text-black rounded-full font-bold text-sm 
              hover:bg-white transition-colors">
            <MapPin size={14} />
            {lang === 'fr' ? 'Retour à la carte' : 'Back to map'}
          </Link>
          <Link href="/voyage-musical/communaute"
            className="flex items-center justify-center gap-2 px-6 py-3 
              bg-white/5 border border-white/10 text-white rounded-full 
              font-bold text-sm hover:bg-white/10 transition-colors">
            <Users size={14} />
            {lang === 'fr' ? 'Voir mes contributions' : 'View my contributions'}
          </Link>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020111] text-white">

      {/* ── Header ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 
        bg-[#020111]/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/voyage-musical"
            className="flex items-center gap-2 text-white/40 
              hover:text-[#D4AF37] transition-colors group">
            <ChevronLeft size={16}
              className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {lang === 'fr' ? 'Retour à la carte' : 'Back to map'}
            </span>
          </Link>
          <h1 className="font-serif italic text-white text-base">
            {lang === 'fr' ? 'Contribuer' : 'Contribute'}
          </h1>
          <button
            onClick={() => {
              const nl: 'fr' | 'en' = lang === 'fr' ? 'en' : 'fr';
              setLang(nl);
              localStorage.setItem('lukeni_lang', nl);
            }}
            className="text-[9px] font-black text-white/40 
              hover:text-[#D4AF37] transition-colors uppercase"
          >
            {lang}
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Stepper ── */}
        <div className="flex items-center justify-between mb-10 relative">
          {/* Ligne de progression */}
          <div className="absolute top-4 left-0 right-0 h-px bg-white/8 z-0" />
          <motion.div
            className="absolute top-4 left-0 h-px bg-[#D4AF37] z-0"
            animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />

          {STEPS.map(s => {
            const isActive    = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-2 z-10">
                <motion.div
                  className={`w-8 h-8 rounded-full border-2 flex items-center 
                    justify-center transition-all ${
                    isCompleted
                      ? 'bg-[#D4AF37] border-[#D4AF37]'
                      : isActive
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]'
                        : 'bg-[#020111] border-white/15'
                  }`}
                  animate={isActive ? {
                    boxShadow: ['0 0 0px rgba(212,175,55,0)', '0 0 16px rgba(212,175,55,0.5)', '0 0 0px rgba(212,175,55,0)']
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isCompleted ? (
                    <CheckCircle size={14} className="text-black" />
                  ) : (
                    <s.icon size={12} className={isActive ? 'text-[#D4AF37]' : 'text-white/30'} />
                  )}
                </motion.div>
                <span className={`text-[8px] font-black uppercase tracking-wider hidden sm:block ${
                  isActive ? 'text-[#D4AF37]' : isCompleted ? 'text-white/50' : 'text-white/20'
                }`}>
                  {lang === 'fr' ? s.label_fr : s.label_en}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Erreur connexion ── */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 mb-6 
              bg-yellow-500/10 border border-yellow-500/30 rounded-2xl"
          >
            <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-200 text-sm">
              {lang === 'fr'
                ? 'Connectez-vous pour pouvoir soumettre une contribution.'
                : 'Sign in to submit a contribution.'}
            </p>
            <Link href="/auth"
              className="ml-auto px-3 py-1.5 bg-yellow-500 text-black 
                rounded-full font-bold text-xs flex-shrink-0 hover:bg-yellow-400 
                transition-colors">
              {lang === 'fr' ? 'Se connecter' : 'Sign in'}
            </Link>
          </motion.div>
        )}

        {/* ── Contenu des étapes ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >

            {/* ══ ÉTAPE 1 — OÙ ══ */}
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-2xl font-serif italic text-white mb-2">
                    {lang === 'fr' ? 'Où cette musique est-elle née ?' : 'Where was this music born?'}
                  </h2>
                  <p className="text-white/40 text-sm">
                    {lang === 'fr'
                      ? 'Sélectionnez le pays d\'origine ou utilisez votre position.'
                      : 'Select the country of origin or use your location.'}
                  </p>
                </div>

                {/* Sélecteur pays */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Pays *' : 'Country *'}
                  </label>
                  <select
                    value={form.country_code}
                    onChange={e => update('country_code', e.target.value)}
                    className="w-full bg-white/4 border border-white/10 rounded-2xl 
                      px-4 py-3 text-white text-sm outline-none 
                      focus:border-[#D4AF37]/50 focus:bg-white/6 transition-all"
                  >
                    <option value="">
                      {lang === 'fr' ? '— Choisir un pays —' : '— Choose a country —'}
                    </option>
                    {Object.entries(AFRICAN_COUNTRIES)
                      .sort((a, b) => {
                        const na = lang === 'fr' ? a[1].name_fr : a[1].name_en;
                        const nb = lang === 'fr' ? b[1].name_fr : b[1].name_en;
                        return na.localeCompare(nb);
                      })
                      .map(([code, info]) => (
                        <option key={code} value={code}>
                          {lang === 'fr' ? info.name_fr : info.name_en}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Ville (optionnel)' : 'City (optional)'}
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => update('city', e.target.value)}
                    placeholder={lang === 'fr' ? 'Ex: Kinshasa' : 'E.g.: Kinshasa'}
                    className="w-full bg-white/4 border border-white/10 rounded-2xl 
                      px-4 py-3 text-white text-sm outline-none 
                      focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
                  />
                </div>

                {/* Géolocalisation */}
                <button
                  onClick={handleGeoLoc}
                  disabled={isGeoLoading}
                  className="flex items-center gap-2 px-4 py-2.5 
                    bg-white/4 border border-white/10 rounded-xl 
                    text-white/50 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 
                    transition-all text-xs font-medium disabled:opacity-40"
                >
                  {isGeoLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <MapPin size={14} />}
                  {lang === 'fr'
                    ? 'Utiliser ma position actuelle'
                    : 'Use my current location'}
                  {form.gps_lat && (
                    <span className="ml-2 text-[#D4AF37] text-[9px]">
                      ✓ {form.gps_lat.toFixed(4)}, {form.gps_lng?.toFixed(4)}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* ══ ÉTAPE 2 — QUAND ══ */}
            {step === 2 && (
              <>
                <div>
                  <h2 className="text-2xl font-serif italic text-white mb-2">
                    {lang === 'fr' ? 'De quelle époque vient-elle ?' : 'From which era does it come?'}
                  </h2>
                  <p className="text-white/40 text-sm">
                    {lang === 'fr'
                      ? 'Choisissez la décennie approximative.'
                      : 'Choose the approximate decade.'}
                  </p>
                </div>

                {/* Sélecteur décennie visuel */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {DECADES_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => update('era_decade', d.value)}
                      className={`py-3 px-2 rounded-2xl border text-center 
                        transition-all ${
                        form.era_decade === d.value
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                          : 'bg-white/4 border-white/8 text-white/50 hover:border-white/20'
                      }`}
                    >
                      <p className="text-sm font-bold font-mono">
                        {d.value}s
                      </p>
                      <p className="text-[8px] mt-0.5 opacity-70">
                        {lang === 'fr' ? d.label_fr : d.label_en}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Label d'époque personnalisé */}
                {form.era_decade && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[9px] font-black uppercase 
                        tracking-widest text-white/40 mb-2">
                        {lang === 'fr' ? 'Nom d\'époque FR (optionnel)' : 'Era name FR (optional)'}
                      </label>
                      <input
                        type="text"
                        value={form.era_label_fr}
                        onChange={e => update('era_label_fr', e.target.value)}
                        placeholder="Ex: Ère de l'indépendance"
                        className="w-full bg-white/4 border border-white/10 rounded-xl 
                          px-4 py-2.5 text-white text-sm outline-none 
                          focus:border-[#D4AF37]/50 transition-all placeholder:text-white/15"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase 
                        tracking-widest text-white/40 mb-2">
                        {lang === 'fr' ? 'Nom d\'époque EN (optionnel)' : 'Era name EN (optional)'}
                      </label>
                      <input
                        type="text"
                        value={form.era_label_en}
                        onChange={e => update('era_label_en', e.target.value)}
                        placeholder="E.g.: Independence Era"
                        className="w-full bg-white/4 border border-white/10 rounded-xl 
                          px-4 py-2.5 text-white text-sm outline-none 
                          focus:border-[#D4AF37]/50 transition-all placeholder:text-white/15"
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* ══ ÉTAPE 3 — QUI ══ */}
            {step === 3 && (
              <>
                <div>
                  <h2 className="text-2xl font-serif italic text-white mb-2">
                    {lang === 'fr' ? 'Qui a créé cette musique ?' : 'Who created this music?'}
                  </h2>
                </div>

                {/* Type d'artiste */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'solo',      icon: User,   label_fr: 'Artiste solo',          label_en: 'Solo artist'       },
                    { value: 'group',     icon: Users,  label_fr: 'Groupe / Orchestre',    label_en: 'Group / Orchestra' },
                    { value: 'instrument',icon: Music,  label_fr: 'Instrument seul',       label_en: 'Solo instrument'   },
                    { value: 'ceremony',  icon: Globe,  label_fr: 'Cérémonie / Rituel',    label_en: 'Ceremony / Ritual' },
                    { value: 'anonymous', icon: Mic,    label_fr: 'Anonyme / Inconnu',     label_en: 'Anonymous / Unknown' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => update('artist_type', t.value)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border 
                        text-left transition-all ${
                        form.artist_type === t.value
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                          : 'bg-white/4 border-white/8 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <t.icon size={18} className={
                        form.artist_type === t.value ? 'text-[#D4AF37]' : 'text-white/30'
                      } />
                      <span className="text-sm font-medium">
                        {lang === 'fr' ? t.label_fr : t.label_en}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Nom artiste / instrument */}
                <AnimatePresence>
                  {form.artist_type && form.artist_type !== 'anonymous' && form.artist_type !== 'ceremony' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {form.artist_type === 'instrument' ? (
                        <div>
                          <label className="block text-[9px] font-black uppercase 
                            tracking-widest text-white/40 mb-2">
                            {lang === 'fr' ? 'Nom de l\'instrument *' : 'Instrument name *'}
                          </label>
                          <input
                            type="text"
                            value={form.instrument_name}
                            onChange={e => update('instrument_name', e.target.value)}
                            placeholder="Ex: Kora, Balafon, Djembé..."
                            className="w-full bg-white/4 border border-white/10 rounded-2xl 
                              px-4 py-3 text-white text-sm outline-none 
                              focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] font-black uppercase 
                            tracking-widest text-white/40 mb-2">
                            {lang === 'fr'
                              ? (form.artist_type === 'group' ? 'Nom du groupe *' : 'Nom de l\'artiste *')
                              : (form.artist_type === 'group' ? 'Group name *' : 'Artist name *')}
                          </label>
                          <input
                            type="text"
                            value={form.artist_name}
                            onChange={e => update('artist_name', e.target.value)}
                            placeholder={lang === 'fr'
                              ? "Ex: Franco & TPOK Jazz"
                              : "E.g.: Franco & TPOK Jazz"}
                            className="w-full bg-white/4 border border-white/10 rounded-2xl 
                              px-4 py-3 text-white text-sm outline-none 
                              focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Genre musical */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Genre musical (optionnel)' : 'Music genre (optional)'}
                  </label>
                  <select
                    value={form.genre_id}
                    onChange={e => update('genre_id', e.target.value)}
                    className="w-full bg-white/4 border border-white/10 rounded-2xl 
                      px-4 py-3 text-white text-sm outline-none 
                      focus:border-[#D4AF37]/50 transition-all"
                  >
                    <option value="">
                      {lang === 'fr' ? '— Choisir un genre —' : '— Choose a genre —'}
                    </option>
                    {genres.map(g => (
                      <option key={g.id} value={g.id}>
                        {lang === 'fr' ? g.nom_fr : g.nom_en}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* ══ ÉTAPE 4 — QUOI ══ */}
            {step === 4 && (
              <>
                <div>
                  <h2 className="text-2xl font-serif italic text-white mb-2">
                    {lang === 'fr' ? 'Le fichier audio' : 'The audio file'}
                  </h2>
                </div>

                {/* Titre */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Titre du morceau *' : 'Track title *'}
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => update('title', e.target.value)}
                    placeholder={lang === 'fr' ? "Ex: Nakombela" : "E.g.: Nakombela"}
                    className="w-full bg-white/4 border border-white/10 rounded-2xl 
                      px-4 py-3 text-white text-sm outline-none 
                      focus:border-[#D4AF37]/50 transition-all placeholder:text-white/20"
                  />
                </div>

                {/* Upload audio */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Fichier audio *' : 'Audio file *'}
                  </label>
                  {form.audio_url ? (
                    <div className="p-4 bg-[#D4AF37]/8 border border-[#D4AF37]/20 
                      rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-[#D4AF37]">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">
                          {lang === 'fr' ? 'Fichier audio uploadé' : 'Audio file uploaded'}
                        </span>
                      </div>
                      <audio src={form.audio_url} controls
                        className="w-full h-8" />
                      <button
                        onClick={openAudioWidget}
                        className="text-[9px] text-white/30 hover:text-white 
                          transition-colors underline"
                      >
                        {lang === 'fr' ? 'Remplacer' : 'Replace'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={openAudioWidget}
                      disabled={isUploading}
                      className="w-full flex flex-col items-center gap-3 p-8 
                        border-2 border-dashed border-white/15 rounded-2xl 
                        text-white/30 hover:border-[#D4AF37]/40 hover:text-white/60 
                        transition-all disabled:opacity-40"
                    >
                      {isUploading
                        ? <Loader2 size={28} className="animate-spin" />
                        : <Upload size={28} />}
                      <div>
                        <p className="text-sm font-medium">
                          {isUploading
                            ? (lang === 'fr' ? 'Upload en cours…' : 'Uploading…')
                            : (lang === 'fr' ? 'Cliquer pour uploader' : 'Click to upload')}
                        </p>
                        <p className="text-[9px] mt-1 opacity-60">
                          MP3, WAV, OGG, M4A • Max 15MB
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Pochette (optionnel) */}
                <div>
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40 mb-2">
                    {lang === 'fr' ? 'Image / Pochette (optionnel)' : 'Image / Cover (optional)'}
                  </label>
                  <button
                    onClick={openCoverWidget}
                    className="flex items-center gap-3 px-4 py-2.5 
                      bg-white/4 border border-white/10 rounded-xl 
                      text-white/40 hover:text-white/70 hover:border-white/20 
                      transition-all text-sm"
                  >
                    {form.cover_url ? (
                      <>
                        <img src={form.cover_url} alt=""
                          className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-[#D4AF37] text-xs">
                          {lang === 'fr' ? 'Image ajoutée ✓' : 'Image added ✓'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span className="text-xs">
                          {lang === 'fr' ? 'Ajouter une image' : 'Add an image'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase 
                      tracking-widest text-white/40 mb-2">
                      {lang === 'fr' ? 'Description FR (optionnel)' : 'Description FR (optional)'}
                    </label>
                    <textarea
                      value={form.description_fr}
                      onChange={e => update('description_fr', e.target.value)}
                      rows={3}
                      placeholder={lang === 'fr' ? 'Contexte, histoire du morceau…' : 'Context, history of the track…'}
                      className="w-full bg-white/4 border border-white/10 rounded-2xl 
                        px-4 py-3 text-white text-sm outline-none 
                        focus:border-[#D4AF37]/50 transition-all resize-none 
                        placeholder:text-white/15"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase 
                      tracking-widest text-white/40 mb-2">
                      {lang === 'fr' ? 'Description EN (optionnel)' : 'Description EN (optional)'}
                    </label>
                    <textarea
                      value={form.description_en}
                      onChange={e => update('description_en', e.target.value)}
                      rows={3}
                      placeholder="Context, history of the track…"
                      className="w-full bg-white/4 border border-white/10 rounded-2xl 
                        px-4 py-3 text-white text-sm outline-none 
                        focus:border-[#D4AF37]/50 transition-all resize-none 
                        placeholder:text-white/15"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ══ ÉTAPE 5 — DROITS ══ */}
            {step === 5 && (
              <>
                <div>
                  <h2 className="text-2xl font-serif italic text-white mb-2">
                    {lang === 'fr' ? 'Droits & Confirmation' : 'Rights & Confirmation'}
                  </h2>
                  <p className="text-white/40 text-sm">
                    {lang === 'fr'
                      ? 'Cette étape est obligatoire pour protéger les créateurs.'
                      : 'This step is mandatory to protect creators.'}
                  </p>
                </div>

                {/* Type de droits */}
                <div className="space-y-3">
                  <label className="block text-[9px] font-black uppercase 
                    tracking-widest text-white/40">
                    {lang === 'fr' ? 'Ce fichier est *' : 'This file is *'}
                  </label>
                  {[
                    {
                      value: 'own_creation',
                      label_fr: 'Ma propre création',
                      label_en: 'My own creation',
                      desc_fr: 'Je suis l\'auteur ou l\'interprète',
                      desc_en: 'I am the author or performer',
                    },
                    {
                      value: 'public_domain',
                      label_fr: 'Dans le domaine public',
                      label_en: 'In the public domain',
                      desc_fr: 'Plus de 70 ans ou droits expirés',
                      desc_en: 'Over 70 years old or expired rights',
                    },
                    {
                      value: 'family_recording',
                      label_fr: 'Un enregistrement familial',
                      label_en: 'A family recording',
                      desc_fr: 'Enregistrement privé d\'un proche',
                      desc_en: 'Private recording of a family member',
                    },
                    {
                      value: 'traditional',
                      label_fr: 'Une musique traditionnelle',
                      label_en: 'Traditional music',
                      desc_fr: 'Patrimoine culturel sans auteur identifié',
                      desc_en: 'Cultural heritage without identified author',
                    },
                  ].map(r => (
                    <button
                      key={r.value}
                      onClick={() => update('rights_type', r.value)}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl 
                        border text-left transition-all ${
                        form.rights_type === r.value
                          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40'
                          : 'bg-white/4 border-white/8 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 
                        flex-shrink-0 flex items-center justify-center ${
                        form.rights_type === r.value
                          ? 'border-[#D4AF37] bg-[#D4AF37]'
                          : 'border-white/20'
                      }`}>
                        {form.rights_type === r.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${
                          form.rights_type === r.value ? 'text-white' : 'text-white/60'
                        }`}>
                          {lang === 'fr' ? r.label_fr : r.label_en}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {lang === 'fr' ? r.desc_fr : r.desc_en}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Confirmation finale */}
                <button
                  onClick={() => update('rights_confirmed', !form.rights_confirmed)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl 
                    border transition-all ${
                    form.rights_confirmed
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40'
                      : 'bg-white/4 border-white/8 hover:border-white/20'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 
                    flex items-center justify-center mt-0.5 ${
                    form.rights_confirmed
                      ? 'border-[#D4AF37] bg-[#D4AF37]'
                      : 'border-white/20'
                  }`}>
                    {form.rights_confirmed && (
                      <CheckCircle size={12} className="text-black" />
                    )}
                  </div>
                  <p className={`text-sm text-left leading-relaxed ${
                    form.rights_confirmed ? 'text-white' : 'text-white/50'
                  }`}>
                    {lang === 'fr'
                      ? 'Je confirme avoir le droit de partager ce fichier sur Lukeni et j\'accepte qu\'il soit utilisé à des fins éducatives et patrimoniales.'
                      : 'I confirm I have the right to share this file on Lukeni and I agree it may be used for educational and heritage purposes.'}
                  </p>
                </button>

                {/* Récapitulatif */}
                <div className="p-5 bg-white/[0.02] border border-white/8 
                  rounded-2xl space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest 
                    text-white/30 mb-3">
                    {lang === 'fr' ? 'Récapitulatif' : 'Summary'}
                  </p>
                  {[
                    {
                      label: lang === 'fr' ? 'Pays' : 'Country',
                      value: form.country_code
                        ? (lang === 'fr'
                          ? AFRICAN_COUNTRIES[form.country_code]?.name_fr
                          : AFRICAN_COUNTRIES[form.country_code]?.name_en)
                        : '—',
                    },
                    {
                      label: lang === 'fr' ? 'Époque' : 'Era',
                      value: form.era_decade ? `${form.era_decade}s` : '—',
                    },
                    {
                      label: lang === 'fr' ? 'Artiste' : 'Artist',
                      value: form.artist_name || form.instrument_name || form.artist_type || '—',
                    },
                    {
                      label: lang === 'fr' ? 'Titre' : 'Title',
                      value: form.title || '—',
                    },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-white/30 text-xs">{row.label}</span>
                      <span className="text-white text-xs font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Erreur */}
                {error && (
                  <div className="flex items-center gap-2 p-3 
                    bg-red-500/10 border border-red-500/30 rounded-xl">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-200 text-xs">{error}</p>
                  </div>
                )}
              </>
            )}

          </motion.div>
        </AnimatePresence>

        {/* ── Navigation entre étapes ── */}
        <div className="flex items-center justify-between mt-10 pt-6 
          border-t border-white/8">
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3 
              bg-white/4 border border-white/10 rounded-full 
              text-white/50 hover:text-white hover:border-white/20 
              transition-all text-sm font-medium disabled:opacity-30 group"
          >
            <ChevronLeft size={14}
              className="group-hover:-translate-x-0.5 transition-transform" />
            {lang === 'fr' ? 'Précédent' : 'Previous'}
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 
                bg-[#D4AF37] text-black rounded-full font-bold text-sm 
                hover:bg-white transition-colors 
                shadow-[0_0_20px_rgba(212,175,55,0.3)]
                disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none group"
            >
              {lang === 'fr' ? 'Continuer' : 'Continue'}
              <ChevronRight size={14}
                className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting || !user}
              className="flex items-center gap-2 px-6 py-3 
                bg-[#D4AF37] text-black rounded-full font-bold text-sm 
                hover:bg-white transition-colors 
                shadow-[0_0_20px_rgba(212,175,55,0.3)]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {lang === 'fr' ? 'Soumettre' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}