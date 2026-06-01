// app/admin/tabs/DashboardTab.tsx

"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, Music, FileAudio, Globe, Users, AlertCircle, 
  Clock, Map 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  tracks: {
    total: number;
    published: number;
    pending: number;
    today: number;
  };
  genres: {
    total: number;
    published: number;
    orphans: number;
  };
  contributions: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  countries: {
    covered: number;
    withTracks: number;
  };
  artists: {
    total: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'track' | 'genre' | 'contribution';
  title: string;
  timestamp: string;
  status?: string;
}

interface TrackWithGenre {
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  lat: number;
  lng: number;
  genre_id: string;
  music_genres?: {
    nom_fr: string;
  } | null;
}

interface CountryData {
  country_code: string;
  country_name_fr: string;
  country_name_en: string;
  lat: number;
  lng: number;
  track_count: number;
  genres: string[];
}

export default function DashboardTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setIsLoading(true);

    try {
      const [tracksRes, genresRes, contributionsRes, countriesRes, artistsRes] = await Promise.all([
        supabase.from("music_tracks").select("id, status, created_at", { count: "exact" }),
        supabase.from("music_genres").select("id, status", { count: "exact" }),
        supabase.from("music_contributions").select("id, status", { count: "exact" }),
        supabase.from("music_countries").select("country_code, track_count", { count: "exact" }),
        supabase.from("music_artists").select("id", { count: "exact" }),
      ]);

      const tracksData = tracksRes.data || [];
      const today = new Date().toISOString().split('T')[0];
      const tracksToday = tracksData.filter(t => t.created_at?.startsWith(today)).length;

      const statsData: DashboardStats = {
        tracks: {
          total: tracksRes.count || 0,
          published: tracksData.filter(t => t.status === 'published').length,
          pending: tracksData.filter(t => t.status === 'pending').length,
          today: tracksToday,
        },
        genres: {
          total: genresRes.count || 0,
          published: (genresRes.data || []).filter(g => g.status === 'published').length,
          orphans: 0,
        },
        contributions: {
          total: contributionsRes.count || 0,
          pending: (contributionsRes.data || []).filter(c => c.status === 'pending').length,
          approved: (contributionsRes.data || []).filter(c => c.status === 'approved').length,
          rejected: (contributionsRes.data || []).filter(c => c.status === 'rejected').length,
        },
        countries: {
          covered: countriesRes.count || 0,
          withTracks: (countriesRes.data || []).filter(c => c.track_count > 0).length,
        },
        artists: {
          total: artistsRes.count || 0,
        },
      };

      setStats(statsData);

      const { data: recentTracks } = await supabase
        .from("music_tracks")
        .select("id, title_fr, created_at, status")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentTracks) {
        setRecentActivity(
          recentTracks.map(t => ({
            id: t.id,
            type: 'track' as const,
            title: t.title_fr,
            timestamp: t.created_at,
            status: t.status,
          }))
        );
      }

    } catch (error) {
      console.error("Error fetching dashboard:", error);
      showMsg("error", "Erreur lors du chargement du dashboard");
    }

    setIsLoading(false);
  }

  async function recalculateMap() {
    if (!confirm("Recalculer toute la carte ? Cela peut prendre quelques secondes.")) return;

    setIsRecalculating(true);

    try {
      const { data: tracksRaw } = await supabase
        .from("music_tracks")
        .select("country_code, country_name_fr, country_name_en, lat, lng, genre_id, music_genres(nom_fr)")
        .eq("status", "published")
        .not("country_code", "is", null);

      if (!tracksRaw || tracksRaw.length === 0) {
        showMsg("error", "Aucun track publié avec pays trouvé");
        setIsRecalculating(false);
        return;
      }

      const tracks = tracksRaw as unknown as TrackWithGenre[];

      // ✅ CORRECTION : Utiliser un objet simple au lieu de Map
      const countryObj: Record<string, CountryData> = {};

      tracks.forEach((track) => {
        const code = track.country_code;
        
        if (!countryObj[code]) {
          countryObj[code] = {
            country_code: code,
            country_name_fr: track.country_name_fr || code,
            country_name_en: track.country_name_en || code,
            lat: track.lat || 0,
            lng: track.lng || 0,
            track_count: 0,
            genres: [],
          };
        }

        countryObj[code].track_count++;
        
        if (track.music_genres?.nom_fr && !countryObj[code].genres.includes(track.music_genres.nom_fr)) {
          countryObj[code].genres.push(track.music_genres.nom_fr);
        }
      });

      // ✅ CORRECTION : Utiliser Object.values() au lieu de Array.from(Map.values())
      const countriesData: CountryData[] = Object.values(countryObj);

      // 3. Supprimer anciennes données
      await supabase.from("music_countries").delete().neq("country_code", "");

      // 4. Insérer nouvelles données
      const { error } = await supabase.from("music_countries").insert(countriesData);

      if (error) throw error;

      showMsg("success", `✅ Carte recalculée : ${countriesData.length} pays mis à jour`);
      fetchDashboardData();

    } catch (error: any) {
      showMsg("error", `Erreur recalcul : ${error.message}`);
    }

    setIsRecalculating(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-white">Dashboard Superadmin</h2>
          <p className="text-sm text-gray-400 mt-1">
            Vue d&apos;ensemble de la plateforme musicale
          </p>
        </div>

        <button
          onClick={recalculateMap}
          disabled={isRecalculating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-600/30 disabled:opacity-40 transition-colors"
        >
          {isRecalculating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Recalcul...
            </>
          ) : (
            <>
              <Map size={16} />
              Recalculer la carte
            </>
          )}
        </button>
      </div>

      {/* Stats grilles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tracks */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <FileAudio size={24} className="text-blue-400" />
            <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
              +{stats.tracks.today} aujourd&apos;hui
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.tracks.total}</p>
          <p className="text-sm text-gray-400">Tracks au total</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="text-green-400">{stats.tracks.published} publiés</span>
            <span className="text-yellow-400">{stats.tracks.pending} en attente</span>
          </div>
        </div>

        {/* Contributions */}
        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-5 relative">
          {stats.contributions.pending > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
              {stats.contributions.pending}
            </div>
          )}
          <div className="flex items-start justify-between mb-3">
            <Users size={24} className="text-orange-400" />
            {stats.contributions.pending > 0 && (
              <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle size={10} />
                À traiter
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.contributions.total}</p>
          <p className="text-sm text-gray-400">Contributions reçues</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="text-green-400">{stats.contributions.approved} approuvées</span>
            <span className="text-yellow-400">{stats.contributions.pending} en attente</span>
          </div>
        </div>

        {/* Genres */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <Music size={24} className="text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.genres.total}</p>
          <p className="text-sm text-gray-400">Genres musicaux</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="text-green-400">{stats.genres.published} publiés</span>
          </div>
        </div>

        {/* Pays */}
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <Globe size={24} className="text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stats.countries.covered}</p>
          <p className="text-sm text-gray-400">Pays couverts</p>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="text-green-400">{stats.countries.withTracks} avec musique</span>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-gray-400" />
          <h3 className="text-lg font-bold text-white">Activité récente</h3>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-600 italic">Aucune activité récente</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileAudio size={14} className="text-blue-400" />
                  <div>
                    <p className="text-sm text-white font-medium">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activity.status === 'published' 
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}