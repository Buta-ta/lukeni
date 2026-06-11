"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, ShieldCheck, UserPlus, Trash2, Check, X,
  Mail, Lock, User, Search, AlertCircle, CheckCircle,
  Edit2, Key, Shield, Users, Crown, Pencil
} from 'lucide-react';

const ALL_TABS = [
  { id: 'hero', label: 'Background', icon: '🖼️' },
  { id: 'suggestions', label: 'Recherche', icon: '🔍' },
  { id: 'constellation', label: 'Constellation', icon: '⭐' },
  { id: 'categories', label: 'Catégories', icon: '🏷️' },
  { id: 'topic_suggestions', label: 'Sujets', icon: '💡' },
  { id: 'articles', label: 'Articles', icon: '📄' },
  { id: 'events', label: 'Événements', icon: '📅' },
  { id: 'article_events', label: 'Art↔Evt', icon: '🔗' },
  { id: 'music_eras', label: 'Époques', icon: '🕐' },
  { id: 'music_genres', label: 'Genres', icon: '🎵' },
  { id: 'music_tracks', label: 'Tracks', icon: '🎧' },
  { id: 'press', label: 'Presse', icon: '📰' },
  { id: 'library', label: 'Bibliothèque', icon: '📚' },
  { id: 'reading_circles', label: 'Clubs Lecture', icon: '👥' },
  { id: 'investigations', label: 'Enquêtes', icon: '🕵️' }, // ← AJOUTÉ ICI
  { id: 'ads', label: 'Publicités', icon: '📣' },
  { id: 'visitors', label: 'Visiteurs', icon: '👁️' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'about', label: 'À Propos', icon: '📖' },
  { id: 'admins', label: 'Admins', icon: '👑' },
];

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  allowed_tabs: string[];
  created_at: string;
}

export default function AdminsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Admin Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newAdminTabs, setNewAdminTabs] = useState<string[]>(['articles', 'events', 'press']);

  // Edit Info Modal (Email/Password)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit Permissions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTabs, setEditTabs] = useState<string[]>([]);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; email: string } | null>(null);

  // Search
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (data) setAdmins(data as unknown as Profile[]);
    setIsLoading(false);
  }

  const createNewAdmin = async () => {
    if (!newEmail || !newPassword) {
      showMsg('error', 'Email et mot de passe requis.');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          allowedTabs: newAdminTabs
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      showMsg('success', `Admin "${newEmail}" créé !`);
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewAdminTabs(['articles', 'events', 'press']);
      fetchAdmins();

    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditInfo = (admin: Profile) => {
    setEditingAdmin(admin);
    setEditEmail(admin.email);
    setEditFullName(admin.full_name || '');
    setEditPassword('');
    setShowEditModal(true);
  };

  const saveEditInfo = async () => {
    if (!editingAdmin) {
      showMsg('error', 'Configuration manquante.');
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingAdmin.id,
          email: editEmail !== editingAdmin.email ? editEmail : undefined,
          password: editPassword.trim() || undefined,
          fullName: editFullName !== editingAdmin.full_name ? editFullName : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      showMsg('success', 'Informations mises à jour !');
      setShowEditModal(false);
      fetchAdmins();

    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    setIsSearching(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${searchEmail}%`)
      .limit(1)
      .single();

    if (data) setSearchResult(data as unknown as Profile);
    else setSearchResult(null);

    setIsSearching(false);
  };

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'admin', allowed_tabs: newAdminTabs })
      .eq('id', userId);

    if (!error) {
      showMsg('success', 'Utilisateur promu admin !');
      setSearchResult(null);
      setSearchEmail('');
      fetchAdmins();
    } else {
      showMsg('error', error.message);
    }
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'user', allowed_tabs: [] })
      .eq('id', userId);

    if (!error) {
      showMsg('success', 'Droits admin retirés.');
      fetchAdmins();
      setEditingId(null);
    } else {
      showMsg('error', error.message);
    }
  };

  const deleteAdmin = async () => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: deleteConfirm.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      showMsg('success', `Admin "${deleteConfirm.email}" supprimé.`);
      setDeleteConfirm(null);
      fetchAdmins();

    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors de la suppression');
    }
  };

  const saveTabs = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ allowed_tabs: editTabs })
      .eq('id', userId);

    if (!error) {
      showMsg('success', 'Permissions mises à jour !');
      setEditingId(null);
      fetchAdmins();
    } else {
      showMsg('error', error.message);
    }
  };

  const toggleTab = (tabId: string) => {
    setEditTabs(prev =>
      prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
    );
  };

  const startEdit = (admin: Profile) => {
    setEditingId(admin.id);
    setEditTabs(admin.allowed_tabs || []);
  };

  const selectAllTabs = () => setEditTabs(ALL_TABS.map(t => t.id));
  const deselectAllTabs = () => setEditTabs([]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-red-400" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <ShieldCheck className="text-red-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white">Gestion des Admins</h2>
            <p className="text-gray-400 text-xs">{admins.length} administrateur{admins.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 transition-all hover:scale-105"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Nouvel Admin</span>
        </button>
      </div>

      {/* Créer un Admin - MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <Crown className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Créer un nouvel admin</h3>
                    <p className="text-gray-500 text-xs">Compte + permissions</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">📧 Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="admin@lukeni.com"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">👤 Nom complet</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🔒 Mot de passe</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-gray-400 font-mono">📋 Permissions (onglets)</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewAdminTabs(ALL_TABS.map(t => t.id))}
                        className="text-[10px] text-red-400 hover:text-red-300"
                      >
                        Tout
                      </button>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={() => setNewAdminTabs([])}
                        className="text-[10px] text-gray-400 hover:text-white"
                      >
                        Aucun
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-[#1a1a1a] rounded-lg border border-white/5">
                    {ALL_TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setNewAdminTabs(prev =>
                            prev.includes(tab.id)
                              ? prev.filter(t => t !== tab.id)
                              : [...prev, tab.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${newAdminTabs.includes(tab.id)
                            ? 'bg-red-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        {newAdminTabs.includes(tab.id) && <Check size={12} />}
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-white/5 text-white rounded-lg text-sm hover:bg-white/10">
                    Annuler
                  </button>
                  <button
                    onClick={createNewAdmin}
                    disabled={isCreating || !newEmail || !newPassword}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Créer l'admin
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✏️ MODAL ÉDITION INFO (Email/Password) */}
      <AnimatePresence>
        {showEditModal && editingAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <Pencil className="text-red-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Modifier l'admin</h3>
                    <p className="text-gray-500 text-xs">{editingAdmin.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">📧 Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">👤 Nom complet</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-mono">🔒 Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-white/5 text-white rounded-lg text-sm hover:bg-white/10">
                    Annuler
                  </button>
                  <button
                    onClick={saveEditInfo}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Sauvegarder
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rechercher et promouvoir */}
      <div className="bg-[#0f0f0f] p-4 md:p-6 rounded-xl border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Search size={18} className="text-red-400" />
          Promouvoir un utilisateur existant
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Nom de l'utilisateur..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-red-500"
              onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            />
          </div>
          <button
            onClick={searchUser}
            disabled={isSearching}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-bold hover:bg-white/10 disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Chercher'}
          </button>
        </div>

        <AnimatePresence>
          {searchResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <User size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{searchResult.full_name || 'Utilisateur'}</p>
                  <p className="text-gray-500 text-xs font-mono">Rôle: {searchResult.role}</p>
                </div>
              </div>
              {searchResult.role === 'admin' ? (
                <span className="text-[10px] px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center gap-1">
                  <Check size={10} /> Déjà admin
                </span>
              ) : (
                <button
                  onClick={() => promoteToAdmin(searchResult.id)}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-all flex items-center gap-2"
                >
                  <Crown size={14} />
                  Promouvoir
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Liste des admins */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Administrateurs</h3>
          <span className="text-xs text-gray-500">{admins.length} total</span>
        </div>

        {admins.map((admin) => (
          <motion.div
            key={admin.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0f0f0f] border border-white/5 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30">
                  <ShieldCheck size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{admin.full_name || 'Admin'}</p>
                  <p className="text-gray-500 text-xs font-mono">{admin.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-600">{(admin.allowed_tabs || []).length} onglets</span>
                    <span className="text-[10px] text-gray-700">•</span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditInfo(admin)}
                  className="p-2 bg-white/5 text-gray-400 hover:text-[#D4AF37] rounded-lg transition-all"
                  title="Modifier email/mot de passe"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => startEdit(admin)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${editingId === admin.id
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  <Edit2 size={12} />
                  {editingId === admin.id ? 'En cours...' : 'Permissions'}
                </button>
                <button
                  onClick={() => removeAdmin(admin.id)}
                  className="p-2 bg-white/5 text-gray-500 hover:text-yellow-400 rounded-lg transition-all"
                  title="Rétrograder en utilisateur"
                >
                  <Shield size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ id: admin.id, email: admin.email })}
                  className="p-2 bg-white/5 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                  title="Supprimer définitivement"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Edit Permissions Panel */}
            <AnimatePresence>
              {editingId === admin.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 pt-2 border-t border-white/5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400 font-mono flex items-center gap-2">
                      <Key size={12} />
                      Sélectionner les onglets accessibles :
                    </p>
                    <div className="flex gap-2">
                      <button onClick={selectAllTabs} className="text-[10px] text-red-400 hover:text-red-300">Tout</button>
                      <span className="text-gray-600">|</span>
                      <button onClick={deselectAllTabs} className="text-[10px] text-gray-400 hover:text-white">Aucun</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => toggleTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${editTabs.includes(tab.id)
                            ? 'bg-red-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        {editTabs.includes(tab.id) && <Check size={12} />}
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">
                      Annuler
                    </button>
                    <button
                      onClick={() => saveTabs(admin.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500"
                    >
                      <Check size={12} />
                      Sauvegarder
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {admins.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 text-sm">Aucun administrateur</p>
            <p className="text-gray-600 text-xs mt-1">Créez votre premier admin ci-dessus</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f0f0f] border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertCircle size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Supprimer cet admin ?</h3>
                  <p className="text-gray-500 text-xs">Action irréversible</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-6">
                <p className="text-gray-400 text-xs mb-1">Email :</p>
                <p className="text-white text-sm font-mono">{deleteConfirm.email}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteAdmin}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}