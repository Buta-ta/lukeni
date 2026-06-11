"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Trash2, Users, AlertCircle, X, ShieldAlert, BookOpen, Clock 
} from 'lucide-react';

interface Circle {
  id: string;
  name: string;
  book_id: string;
  creator_id: string;
  max_members: number;
  access_code: string;
  created_at: string;
  library_books: {
    title_fr: string;
  };
  member_count?: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function ReadingCirclesAdminTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal pour gérer les membres
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Confirmations
  const [deleteCircleId, setDeleteCircleId] = useState<string | null>(null);
  const [blockMemberConfirm, setBlockMemberConfirm] = useState<{ circleId: string, userId: string, name: string } | null>(null);

  useEffect(() => {
    fetchCircles();
  }, []);

  async function fetchCircles() {
    setIsLoading(true);
    
    // 1. Récupérer d'abord les cercles (sans la jointure qui cause l'erreur 400)
    const { data: circlesData, error } = await supabase
      .from('reading_circles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !circlesData) {
      showMsg('error', "Erreur lors du chargement des cercles");
      setIsLoading(false);
      return;
    }

    // 2. Récupérer manuellement les titres des livres
    const bookIds = [...new Set(circlesData.map(c => c.book_id))];
    const { data: booksData } = await supabase
      .from('library_books')
      .select('id, title_fr')
      .in('id', bookIds);

    const booksMap = Object.fromEntries((booksData || []).map(b => [b.id, b.title_fr]));

    // 3. Compter le nombre de membres pour chaque cercle
    const { data: membersData } = await supabase
      .from('circle_members')
      .select('circle_id');

    // 4. Assembler le tout
    const formattedCircles = circlesData.map((c: any) => {
      const count = membersData?.filter(m => m.circle_id === c.id).length || 0;
      return { 
        ...c, 
        member_count: count,
        library_books: { title_fr: booksMap[c.book_id] || "Livre inconnu" }
      };
    });

    setCircles(formattedCircles);
    setIsLoading(false);
  }

  // 📂 Voir les membres d'un cercle
  async function openMembersModal(circle: Circle) {
    setSelectedCircle(circle);
    setIsLoadingMembers(true);

    const { data, error } = await supabase
      .from('circle_members')
      .select(`
        id, user_id, role,
        profiles ( full_name, email )
      `)
      .eq('circle_id', circle.id);

    if (error) {
      showMsg('error', "Impossible de charger les membres");
    } else {
      setMembers(data as any);
    }
    setIsLoadingMembers(false);
  }

  // 🗑️ Supprimer un cercle
  async function handleDeleteCircle() {
    if (!deleteCircleId) return;

    const { error } = await supabase
      .from('reading_circles')
      .delete()
      .eq('id', deleteCircleId);

    if (error) {
      showMsg('error', "Erreur lors de la suppression du cercle.");
    } else {
      showMsg('success', "Cercle de lecture supprimé avec succès !");
      setCircles(circles.filter(c => c.id !== deleteCircleId));
      if (selectedCircle?.id === deleteCircleId) setSelectedCircle(null);
    }
    setDeleteCircleId(null);
  }

  // 🚫 Bloquer un membre (L'astuce des 3 requêtes rejetées)
  async function handleBlockMember() {
    if (!blockMemberConfirm) return;
    const { circleId, userId, name } = blockMemberConfirm;

    try {
      // 1. Le retirer de la table des membres (pour qu'il disparaisse du chat)
      await supabase.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', userId);

      // 2. Nettoyer son vieil historique de requêtes (pour éviter un conflit)
      await supabase.from('circle_join_requests').delete().eq('circle_id', circleId).eq('user_id', userId);

      // 3. 🛑 L'astuce : Insérer 3 requêtes "rejected" pour bloquer toute nouvelle demande
      const rejections = [
        { circle_id: circleId, user_id: userId, status: 'rejected' },
        { circle_id: circleId, user_id: userId, status: 'rejected' },
        { circle_id: circleId, user_id: userId, status: 'rejected' }
      ];
      await supabase.from('circle_join_requests').insert(rejections);

      showMsg('success', `${name} a été définitivement banni de ce cercle.`);
      
      // Mettre à jour l'UI localement
      setMembers(members.filter(m => m.user_id !== userId));
      setBlockMemberConfirm(null);
      fetchCircles(); // Mettre à jour le compteur

    } catch (err: any) {
      console.error(err);
      showMsg('error', "Erreur lors du bannissement du membre.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-red-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-500/20 rounded-xl">
          <Users className="text-red-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-serif text-white">Clubs de Lecture</h2>
          <p className="text-gray-400 text-xs">Gérer les cercles et bannir les membres</p>
        </div>
      </div>

      {/* Liste des Cercles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {circles.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun cercle de lecture trouvé.</p>
        ) : (
          circles.map((circle) => (
            <div key={circle.id} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-5 relative group">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">
                  Code: {circle.access_code}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 pr-16">{circle.name}</h3>
              <p className="text-sm text-gray-400 flex items-center gap-2 mb-4">
                <BookOpen size={14} className="text-emerald-500" /> 
                {circle.library_books?.title_fr || "Livre inconnu"}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {circle.member_count} / {circle.max_members} membres
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {new Date(circle.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => openMembersModal(circle)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Voir les membres
                </button>
                <button
                  onClick={() => setDeleteCircleId(circle.id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                  title="Supprimer le cercle"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🟢 MODAL : Gestion des membres d'un cercle */}
      <AnimatePresence>
        {selectedCircle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedCircle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="text-emerald-500" size={20} />
                    Membres du cercle
                  </h3>
                  <p className="text-gray-400 text-xs mt-1">Cercle : {selectedCircle.name}</p>
                </div>
                <button onClick={() => setSelectedCircle(null)} className="p-2 text-gray-500 hover:text-white rounded-lg bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1">
                {isLoadingMembers ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-500" size={24} /></div>
                ) : members.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm">Ce cercle n'a aucun membre.</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                        <div>
                          <p className="text-white text-sm font-bold flex items-center gap-2">
                            {member.profiles?.full_name || 'Utilisateur inconnu'}
                            {member.role === 'creator' && <span className="px-2 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded-full">Créateur</span>}
                          </p>
                          <p className="text-gray-500 text-xs font-mono">{member.profiles?.email}</p>
                        </div>
                        
                        {member.role !== 'creator' && (
                          <button
                            onClick={() => setBlockMemberConfirm({ circleId: selectedCircle.id, userId: member.user_id, name: member.profiles?.full_name || 'Cet utilisateur' })}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/20"
                          >
                            <ShieldAlert size={14} />
                            Bannir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 MODAL : Confirmation Suppression Cercle */}
      <AnimatePresence>
        {deleteCircleId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Supprimer ce cercle ?</h3>
              <p className="text-gray-400 text-sm mb-6">Cette action est définitive. Tous les messages et les membres seront supprimés.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteCircleId(null)} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold">
                  Annuler
                </button>
                <button onClick={handleDeleteCircle} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold">
                  Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔴 MODAL : Confirmation Bannissement */}
      <AnimatePresence>
        {blockMemberConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full text-center">
              <ShieldAlert size={40} className="text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Bannir {blockMemberConfirm.name} ?</h3>
              <p className="text-gray-400 text-sm mb-6">Il sera exclu du chat et ne pourra plus jamais envoyer de demande d'adhésion pour ce cercle.</p>
              <div className="flex gap-3">
                <button onClick={() => setBlockMemberConfirm(null)} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold">
                  Annuler
                </button>
                <button onClick={handleBlockMember} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold">
                  Bannir définitivement
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}