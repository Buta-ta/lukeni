// components/admin/PaymentManagementTab.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CreditCard, Clock, BookOpen, Search, User, Star, AlertCircle, CheckCircle, Trash2, PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function PaymentManagementTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [activeTab, setActiveTab] = useState<'trial' | 'investigations' | 'books' | 'grants' | 'history'>('trial');

  // Trial Config
  const [trialMinutes, setTrialMinutes] = useState(30);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isSavingTrial, setIsSavingTrial] = useState(false);

  // Products Pricing
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [pricingEdits, setPricingEdits] = useState<Record<string, { price_cfa: number; price_eur: number; is_paid: boolean }>>({});
  const [isSavingPricing, setIsSavingPricing] = useState<string | null>(null);

  // Grants
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAccessType, setGrantAccessType] = useState<'investigation' | 'book'>('investigation');
  const [grantScope, setGrantScope] = useState<'single' | 'all'>('single');
  const [grantTargetId, setGrantTargetId] = useState('');
  const [isSavingGrant, setIsSavingGrant] = useState(false);
  const [grants, setGrants] = useState<any[]>([]);

  // History
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchTrialConfig();
    fetchProducts();
    fetchGrants();
    fetchTransactions();
  }, []);

  const fetchTrialConfig = async () => {
    const { data } = await supabase.from('trial_config').select('*').eq('id', 1).single();
    if (data) {
      setTrialMinutes(data.trial_duration_minutes || 30);
      setTrialEnabled(data.is_trial_enabled ?? true);
    }
  };

  const fetchProducts = async () => {
    const [invRes, bookRes, pricingRes] = await Promise.all([
      supabase.from('investigations').select('id, title_fr').order('created_at', { ascending: false }),
      supabase.from('library_books').select('id, title_fr').order('created_at', { ascending: false }),
      supabase.from('product_pricing').select('*')
    ]);

    setInvestigations(invRes.data || []);
    setBooks(bookRes.data || []);

    const edits: Record<string, any> = {};
    (pricingRes.data || []).forEach(p => {
      edits[`${p.product_type}_${p.product_id}`] = {
        price_cfa: p.price_xof_cfa,
        price_eur: p.price_eur,
        is_paid: true
      };
    });
    setPricingEdits(edits);
  };

  const fetchGrants = async () => {
    // Étape 1 : Récupérer tous les grants
    const { data: grantsData } = await supabase
      .from('admin_user_access_grants')
      .select('*')
      .order('granted_at', { ascending: false });

    if (!grantsData || grantsData.length === 0) {
      setGrants([]);
      return;
    }

    // Étape 2 : Récupérer les profils correspondants
    const userIds = grantsData.map(g => g.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    // Étape 3 : Fusionner les données
    const merged = grantsData.map(grant => ({
      ...grant,
      profiles: profilesData?.find(p => p.id === grant.user_id) || null
    }));

    setGrants(merged);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from('fedapay_transactions').select('*').order('created_at', { ascending: false }).limit(50);
    setTransactions(data || []);
  };

  const handleSaveTrial = async () => {
    setIsSavingTrial(true);
    const { error } = await supabase.from('trial_config').update({
      trial_duration_minutes: trialMinutes,
      is_trial_enabled: trialEnabled
    }).eq('id', 1);

    if (error) showMsg('error', error.message);
    else showMsg('success', 'Configuration Trial sauvegardée !');
    setIsSavingTrial(false);
  };

  const handlePricingChange = (key: string, field: 'price_cfa' | 'price_eur' | 'is_paid', value: any) => {
    setPricingEdits(prev => {
      const current = prev[key] || { price_cfa: 0, price_eur: 0, is_paid: false };
      const updated = { ...current, [field]: value };

      // Auto-conversion
      if (field === 'price_cfa') {
        updated.price_eur = parseFloat((Number(value) / 655).toFixed(2));
      } else if (field === 'price_eur') {
        updated.price_cfa = Math.round(Number(value) * 655);
      }

      return { ...prev, [key]: updated };
    });
  };

  const handleSavePricing = async (productType: string, productId: string) => {
    const key = `${productType}_${productId}`;
    const edit = pricingEdits[key];
    if (!edit || !edit.is_paid) return;

    setIsSavingPricing(key);
    const payload = {
      product_type: productType,
      product_id: productId,
      price_xof_cfa: edit.price_cfa,
      price_eur: edit.price_eur,
      is_active: true
    };

    const { error } = await supabase.from('product_pricing').upsert(payload, { onConflict: 'product_type,product_id' });

    if (error) showMsg('error', error.message);
    else showMsg('success', 'Prix sauvegardé !');

    setIsSavingPricing(null);
  };

  const handleRemovePricing = async (productType: string, productId: string) => {
    const { error } = await supabase.from('product_pricing').delete().eq('product_type', productType).eq('product_id', productId);
    if (error) showMsg('error', error.message);
    else {
      setPricingEdits(prev => {
        const next = { ...prev };
        delete next[`${productType}_${productId}`];
        return next;
      });
      showMsg('success', 'Accès gratuit restauré');
    }
  };

  const handleGrantAccess = async () => {
    if (!grantUserId.trim()) return showMsg('error', 'ID Utilisateur requis');
    setIsSavingGrant(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      showMsg('error', 'Session admin introuvable');
      setIsSavingGrant(false);
      return;
    }

    const targetIds = grantScope === 'all' ? [] : [grantTargetId];

    const { error } = await supabase.from('admin_user_access_grants').insert({
      admin_id: session.user.id,
      user_id: grantUserId,
      access_type: grantAccessType,
      access_scope: grantScope,
      target_ids: targetIds
    });

    if (error) showMsg('error', error.message);
    else {
      showMsg('success', 'Accès accordé !');
      setGrantUserId('');
      fetchGrants();
    }
    setIsSavingGrant(false);
  };

  const renderProductRow = (product: any, type: 'investigation' | 'book') => {
    const key = `${type}_${product.id}`;
    const edit = pricingEdits[key] || { price_cfa: 0, price_eur: 0, is_paid: false };

    return (
      <div key={product.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm truncate">{product.title_fr}</p>
          <p className="text-[10px] text-gray-600 truncate">{product.id}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={edit.is_paid}
              onChange={(e) => handlePricingChange(key, 'is_paid', e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="text-gray-400">Payant</span>
          </label>

          {edit.is_paid && (
            <>
              <input
                type="number"
                value={edit.price_cfa}
                onChange={(e) => handlePricingChange(key, 'price_cfa', Number(e.target.value))}
                placeholder="CFA"
                className="w-24 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
              />
              <input
                type="number"
                value={edit.price_eur}
                onChange={(e) => handlePricingChange(key, 'price_eur', Number(e.target.value))}
                placeholder="EUR"
                step="0.01"
                className="w-20 bg-[#1a1a1a] border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
              />
              <button
                onClick={() => handleSavePricing(type, product.id)}
                disabled={isSavingPricing === key}
                className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500 disabled:opacity-50"
              >
                {isSavingPricing === key ? '...' : '💾'}
              </button>
              <button
                onClick={() => handleRemovePricing(type, product.id)}
                className="p-1 text-red-400 hover:bg-red-500/10 rounded"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="text-emerald-400" size={24} />
        <h2 className="text-xl font-serif">Gestion Monétaire</h2>
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
        {[
          { id: 'trial', icon: <Clock size={14} />, label: 'Trial' },
          { id: 'investigations', icon: <Search size={14} />, label: 'Enquêtes' },
          { id: 'books', icon: <BookOpen size={14} />, label: 'Livres' },
          { id: 'grants', icon: <User size={14} />, label: 'Accès' },
          { id: 'history', icon: <Star size={14} />, label: 'Historique' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'trial' && (
        <div className="bg-[#0f0f0f] p-6 rounded-xl border border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white">🕐 Configuration de l'essai gratuit</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={trialEnabled} onChange={(e) => setTrialEnabled(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
              <span className="text-sm text-gray-300">Essai activé</span>
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Durée (minutes)</label>
            <input
              type="number"
              value={trialMinutes}
              onChange={(e) => setTrialMinutes(Number(e.target.value))}
              className="w-32 bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>
          <button onClick={handleSaveTrial} disabled={isSavingTrial} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-emerald-500 disabled:opacity-50">
            {isSavingTrial ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {activeTab === 'investigations' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">🎓 Prix des Enquêtes</h3>
          {investigations.map(inv => renderProductRow(inv, 'investigation'))}
        </div>
      )}

      {activeTab === 'books' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">📖 Prix des Livres</h3>
          {books.map(book => renderProductRow(book, 'book'))}
        </div>
      )}

      {activeTab === 'grants' && (
        <div className="space-y-6">
          <div className="bg-[#0f0f0f] p-6 rounded-xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white">👤 Accorder un accès gratuit</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ID Utilisateur (UUID)</label>
              <input
                type="text"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="ex: 123e4567-e89b-12d3-a456-426614174000"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white text-sm outline-none"
              />
            </div>
            <div className="flex gap-4">
              <select value={grantAccessType} onChange={(e) => setGrantAccessType(e.target.value as any)} className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white text-sm outline-none">
                <option value="investigation">🎓 Enquête</option>
                <option value="book">📖 Livre</option>
              </select>
              <select value={grantScope} onChange={(e) => setGrantScope(e.target.value as any)} className="bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white text-sm outline-none">
                <option value="single">Solo</option>
                <option value="all">Tous</option>
              </select>
            </div>
            {grantScope === 'single' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">ID du produit</label>
                <input
                  type="text"
                  value={grantTargetId}
                  onChange={(e) => setGrantTargetId(e.target.value)}
                  placeholder="UUID de l'enquête ou du livre"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded px-3 py-2 text-white text-sm outline-none"
                />
              </div>
            )}
            <button onClick={handleGrantAccess} disabled={isSavingGrant} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-500 disabled:opacity-50">
              {isSavingGrant ? 'Enregistrement...' : 'Accorder l\'accès'}
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-400">Historique des accès accordés</h4>
            {grants.map(g => (
              <div key={g.id} className="p-3 bg-white/[0.03] border border-white/10 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="text-white font-bold">{g.profiles?.email || g.user_id.slice(0, 8)}</span>
                  <span className="text-gray-500 ml-2">{g.access_type} • {g.access_scope}</span>
                </div>
                <div className="text-gray-600">{new Date(g.granted_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">💰 Historique des paiements</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Utilisateur</th>
                  <th className="px-4 py-2">Produit</th>
                  <th className="px-4 py-2">Montant</th>
                  <th className="px-4 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-gray-300">{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono">{tx.user_id.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-white">{tx.product_type}</td>
                    <td className="px-4 py-2 text-[#D4AF37]">{tx.amount} {tx.currency}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : tx.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}