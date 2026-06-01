// app/admin/tabs/ContributionsTab.tsx

"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, Inbox, CheckCircle, XCircle, Eye, Edit2, 
  Trash2, AlertCircle, Music, MapPin, Calendar, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteModal from "@/components/admin/shared/DeleteModal";

interface Contribution {
  id: string;
  title: string;
  artist: string;
  country_code: string;
  genre: string;
  year: number | null;
  audio_url: string | null;
  youtube_url: string | null;
  message: string | null;
  contributor_name: string | null;
  contributor_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function ContributionsTab({
  showMsg,
}: {
  showMsg: (type: "success" | "error", text: string) => void;
}) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  // Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchContributions();
  }, []);

  async function fetchContributions() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("music_contributions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      showMsg("error", error.message);
    } else if (data) {
      setContributions(data as unknown as Contribution[]);
    }
    setIsLoading(false);
  }

  const handleApprove = async (contribution: Contribution) => {
    setIsProcessing(contribution.id);
    
    try {
      // Créer un track à partir de la contribution
      const { error: trackError } = await supabase.from("music_tracks").insert({
        type: "song",
        title_fr: contribution.title,
        title_en: contribution.title,
        artist_fr: contribution.artist,
        artist_en: contribution.artist,
        year: contribution.year,
        genre_id: null, // À assigner manuellement
        status: "published",
        audio_url: contribution.audio_url,
        country_code: contribution.country_code,
        country_name_fr: contribution.country_code,
        country_name_en: contribution.country_code,
        lat: null,
        lng: null,
      });

      if (trackError) throw trackError;

      // Mettre à jour le statut de la contribution
      const { error: contribError } = await supabase
        .from("music_contributions")
        .update({ status: "approved" })
        .eq("id", contribution.id);

      if (contribError) throw contribError;

      showMsg("success", "✅ Contribution approuvée et track créé !");
      fetchContributions();
    } catch (error: any) {
      showMsg("error", `Erreur: ${error.message}`);
    }

    setIsProcessing(null);
  };

  const handleReject = async (id: string) => {
    setIsProcessing(id);
    
    try {
      const { error } = await supabase
        .from("music_contributions")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      showMsg("success", "Contribution rejetée.");
      fetchContributions();
    } catch (error: any) {
      showMsg("error", error.message);
    }

    setIsProcessing(null);
  };

  const handleDeleteClick = (id: string) => {
    setContributionToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contributionToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("music_contributions")
        .delete()
        .eq("id", contributionToDelete);

      if (error) throw error;

      showMsg("success", "Contribution supprimée.");
      setContributions(prev => prev.filter(c => c.id !== contributionToDelete));
      setDeleteModalOpen(false);
      setContributionToDelete(null);
    } catch (error: any) {
      showMsg("error", error.message);
    }
    
    setIsDeleting(false);
  };

  const filteredContributions = contributions.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const stats = {
    total: contributions.length,
    pending: contributions.filter(c => c.status === 'pending').length,
    approved: contributions.filter(c => c.status === 'approved').length,
    rejected: contributions.filter(c => c.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-red-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Inbox className="text-red-400" size={24} />
          <div>
            <h2 className="text-xl md:text-2xl font-serif">Contributions Communautaires</h2>
            <p className="text-gray-400 text-xs">
              {stats.total} soumissions · {stats.pending} en attente
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-gray-400">En attente</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-gray-400">Approuvées</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          <p className="text-xs text-gray-400">Rejetées</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-red-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvées' : 'Rejetées'}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filteredContributions.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Inbox size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucune contribution trouvée.</p>
          </div>
        ) : (
          filteredContributions.map((c) => (
            <div
              key={c.id}
              className="bg-white/[0.02] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      c.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {c.status}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {/* Titre */}
                  <h3 className="text-white font-bold mb-1">{c.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{c.artist}</p>

                  {/* Details */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {c.country_code && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {c.country_code}
                      </span>
                    )}
                    {c.year && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {c.year}
                      </span>
                    )}
                    {c.genre && (
                      <span className="flex items-center gap-1">
                        <Music size={10} /> {c.genre}
                      </span>
                    )}
                    {c.contributor_name && (
                      <span className="flex items-center gap-1">
                        <User size={10} /> {c.contributor_name}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  {c.message && (
                    <p className="text-gray-400 text-xs mt-3 p-3 bg-white/5 rounded-lg">
                      {c.message}
                    </p>
                  )}

                  {/* URLs */}
                  <div className="flex gap-2 mt-3">
                    {c.audio_url && (
                      <audio src={c.audio_url} controls className="h-8" />
                    )}
                    {c.youtube_url && (
                      <a
                        href={c.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Voir YouTube →
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {c.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(c)}
                        disabled={isProcessing === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium hover:bg-green-600/30 disabled:opacity-40 transition-colors"
                      >
                        {isProcessing === c.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        Approuver
                      </button>
                      <button
                        onClick={() => handleReject(c.id)}
                        disabled={isProcessing === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium hover:bg-red-600/30 disabled:opacity-40 transition-colors"
                      >
                        <XCircle size={12} />
                        Rejeter
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteClick(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        title="Supprimer cette contribution ?"
        description="Cette action est irréversible."
        itemName={contributions.find(c => c.id === contributionToDelete)?.title}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteModalOpen(false);
          setContributionToDelete(null);
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
}