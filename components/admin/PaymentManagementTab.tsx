// components/admin/PaymentManagementTab.tsx

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, CreditCard, Clock, BookOpen, Search, User as UserIcon, Star, AlertCircle,
  CheckCircle, Trash2, PlusCircle, ChevronRight, Filter, X, Download,
  TrendingUp, Users, Eye, EyeOff, Copy, Check, ArrowUpDown, Calendar,
  Briefcase, Fingerprint // ✅ AJOUT
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface UserOption {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  avatar_url?: string | null;
}

interface ProductOption {
  id: string;
  title_fr: string;
  title_en: string;
  type: 'investigation' | 'book';
  cover_url?: string | null;
}

interface Transaction {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  product_type: string;
  product_id: string;
  product_title?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

const translations = {
  fr: {
    title: 'Gestion Monétaire',
    trial: 'Essai Gratuit',
    pricing: 'Tarification',
    access: 'Accès Gratuits',
    history: 'Historique',
    overview: 'Vue d\'ensemble',

    // Trial
    trialDuration: 'Durée de l\'essai',
    trialEnabled: 'Essai activé',
    minutes: 'minutes',
    save: 'Sauvegarder',
    saving: 'Sauvegarde...',

    // Pricing
    searchProducts: 'Rechercher les produits...',
    investigations: 'Enquêtes',
    books: 'Livres',
    price: 'Prix',
    priceEur: 'Prix EUR',
    priceCfa: 'Prix CFA',
    paid: 'Payant',
    free: 'Gratuit',
    active: 'Actif',

    // Access
    grantAccess: 'Accorder un accès gratuit',
    selectUser: 'Sélectionner un utilisateur...',
    selectProduct: 'Sélectionner un produit...',
    accessType: 'Type d\'accès',
    accessScope: 'Portée',
    single: 'Unique',
    all: 'Tous',
    granted: 'Accès accordé !',
    grantError: 'Erreur lors de l\'octroi d\'accès',

    // History
    searchTransactions: 'Rechercher les transactions...',
    user: 'Utilisateur',
    product: 'Produit',
    amount: 'Montant',
    date: 'Date',
    status: 'Statut',
    noTransactions: 'Aucune transaction',
    deleteTransaction: 'Supprimer cette transaction',
    deletedSuccess: 'Transaction supprimée',
    deleteError: 'Erreur lors de la suppression',

    // Stats
    totalUsers: 'Utilisateurs totaux',
    completedTransactions: 'Transactions terminées',
    failedTransactions: 'Transactions échouées',
    totalRevenue: 'Revenu total',

    // Modal
    confirm: 'Confirmer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    deleting: 'Suppression...',

    // Notifications
    success: 'Succès',
    error: 'Erreur',
  },
  en: {
    title: 'Payment Management',
    trial: 'Free Trial',
    pricing: 'Pricing',
    access: 'Free Access',
    history: 'History',
    overview: 'Overview',

    // Trial
    trialDuration: 'Trial duration',
    trialEnabled: 'Trial enabled',
    minutes: 'minutes',
    save: 'Save',
    saving: 'Saving...',

    // Pricing
    searchProducts: 'Search products...',
    investigations: 'Investigations',
    books: 'Books',
    price: 'Price',
    priceEur: 'Price EUR',
    priceCfa: 'Price CFA',
    paid: 'Paid',
    free: 'Free',
    active: 'Active',

    // Access
    grantAccess: 'Grant free access',
    selectUser: 'Select a user...',
    selectProduct: 'Select a product...',
    accessType: 'Access type',
    accessScope: 'Scope',
    single: 'Single',
    all: 'All',
    granted: 'Access granted!',
    grantError: 'Error granting access',

    // History
    searchTransactions: 'Search transactions...',
    user: 'User',
    product: 'Product',
    amount: 'Amount',
    date: 'Date',
    status: 'Status',
    noTransactions: 'No transactions',
    deleteTransaction: 'Delete this transaction',
    deletedSuccess: 'Transaction deleted',
    deleteError: 'Error deleting transaction',

    // Stats
    totalUsers: 'Total users',
    completedTransactions: 'Completed transactions',
    failedTransactions: 'Failed transactions',
    totalRevenue: 'Total revenue',

    // Modal
    confirm: 'Confirm',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting...',

    // Notifications
    success: 'Success',
    error: 'Error',
  },
};

// ════════════════════════════════════════════════════════════════
// NOTIFICATION TOAST
// ════════════════════════════════════════════════════════════════

function NotificationToast({
  isOpen,
  type,
  message,
  onClose,
}: {
  isOpen: boolean;
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 z-[9999]"
        >
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-md ${type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
          >
            {type === 'success' ? (
              <CheckCircle size={20} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════════
// DELETE MODAL
// ════════════════════════════════════════════════════════════════

function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  title: string;
  message: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-red-500/30 rounded-2xl overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-gray-400 text-sm">{message}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {isLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════════════
// TRIAL CONFIG SECTION
// ════════════════════════════════════════════════════════════════

function TrialSection({
  lang,
  showMsg,
}: {
  lang: 'fr' | 'en';
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const t = translations[lang];
  const [trialMinutes, setTrialMinutes] = useState(30);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTrialConfig = async () => {
      const { data } = await supabase
        .from('trial_config')
        .select('*')
        .eq('id', 1)
        .single();
      if (data) {
        setTrialMinutes(data.trial_duration_minutes || 30);
        setTrialEnabled(data.is_trial_enabled ?? true);
      }
    };
    fetchTrialConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('trial_config')
      .update({
        trial_duration_minutes: trialMinutes,
        is_trial_enabled: trialEnabled,
      })
      .eq('id', 1);

    if (error) {
      showMsg('error', t.error);
    } else {
      showMsg('success', lang === 'fr' ? 'Configuration Trial sauvegardée !' : 'Trial config saved!');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: t.trialDuration, icon: Clock, color: '#60A5FA' },
          { label: t.trialEnabled, icon: CheckCircle, color: '#10B981' },
          { label: lang === 'fr' ? 'État' : 'Status', icon: TrendingUp, color: '#D4AF37' },
        ].map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            className="p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {label}
              </span>
            </div>
            <p className="text-white font-serif text-lg font-bold">
              {label === t.trialDuration
                ? `${trialMinutes}${lang === 'fr' ? ' min' : ''}`
                : trialEnabled
                  ? '✅'
                  : '❌'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={trialEnabled}
              onChange={(e) => setTrialEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded"
            />
            <span className="text-white font-medium">{t.trialEnabled}</span>
          </label>
        </div>

        <div>
          <label className="block text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">
            {t.trialDuration} ({t.minutes})
          </label>
          <input
            type="number"
            min="1"
            value={trialMinutes}
            onChange={(e) => setTrialMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-emerald-500/40 transition-colors"
          />
          <p className="text-[10px] text-gray-600 mt-1">
            💡 {lang === 'fr' ? 'N\'affecte que les nouveaux essais' : 'Only affects new trials'}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          {isSaving ? t.saving : t.save}
        </motion.button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PRICING SECTION
// ════════════════════════════════════════════════════════════════

function PricingSection({
  lang,
  showMsg,
}: {
  lang: 'fr' | 'en';
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const t = translations[lang];
  const [investigations, setInvestigations] = useState<ProductOption[]>([]);
  const [books, setBooks] = useState<ProductOption[]>([]);
  const [pricingEdits, setPricingEdits] = useState<
    Record<string, { price_cfa: number; price_eur: number; is_paid: boolean }>
  >({});
  const [isSavingPricing, setIsSavingPricing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'investigation' | 'book'>('all');

  useEffect(() => {
    const fetchData = async () => {
      const [invRes, bookRes, pricingRes] = await Promise.all([
        supabase
          .from('investigations')
          .select('id, title_fr, title_en')
          .order('created_at', { ascending: false }),
        supabase
          .from('library_books')
          .select('id, title_fr, title_en')
          .order('created_at', { ascending: false }),
        supabase.from('product_pricing').select('*'),
      ]);

      setInvestigations(
        invRes.data?.map((i) => ({ ...i, type: 'investigation' as const })) || []
      );
      setBooks(bookRes.data?.map((b) => ({ ...b, type: 'book' as const })) || []);

      const edits: Record<string, any> = {};
      (pricingRes.data || []).forEach((p) => {
        edits[`${p.product_type}_${p.product_id}`] = {
          price_cfa: p.price_xof_cfa,
          price_eur: p.price_eur,
          is_paid: true,
        };
      });
      setPricingEdits(edits);
    };
    fetchData();
  }, []);

  const handlePricingChange = (
    key: string,
    field: 'price_cfa' | 'price_eur' | 'is_paid',
    value: any
  ) => {
    setPricingEdits((prev) => {
      const current = prev[key] || { price_cfa: 0, price_eur: 0, is_paid: false };
      const updated = { ...current, [field]: value };

      if (field === 'price_cfa') {
        updated.price_eur = parseFloat((Number(value) / 655).toFixed(2));
      } else if (field === 'price_eur') {
        updated.price_cfa = Math.round(Number(value) * 655);
      }

      return { ...prev, [key]: updated };
    });
  };

  const handleSavePricing = async (
    productType: 'investigation' | 'book',
    productId: string
  ) => {
    const key = `${productType}_${productId}`;
    const edit = pricingEdits[key];
    if (!edit || !edit.is_paid) return;

    setIsSavingPricing(key);
    const { error } = await supabase.from('product_pricing').upsert(
      {
        product_type: productType,
        product_id: productId,
        price_xof_cfa: edit.price_cfa,
        price_eur: edit.price_eur,
        is_active: true,
      },
      { onConflict: 'product_type,product_id' }
    );

    if (error) {
      showMsg('error', t.error);
    } else {
      showMsg('success', lang === 'fr' ? 'Prix sauvegardé !' : 'Price saved!');
    }
    setIsSavingPricing(null);
  };

  const handleRemovePricing = async (
    productType: 'investigation' | 'book',
    productId: string
  ) => {
    const { error } = await supabase
      .from('product_pricing')
      .delete()
      .eq('product_type', productType)
      .eq('product_id', productId);

    if (error) {
      showMsg('error', t.error);
    } else {
      setPricingEdits((prev) => {
        const next = { ...prev };
        delete next[`${productType}_${productId}`];
        return next;
      });
      showMsg('success', lang === 'fr' ? 'Accès gratuit restauré' : 'Free access restored');
    }
  };

  const allProducts = [
    ...investigations.map((i) => ({ ...i, type: 'investigation' as const })),
    ...books.map((b) => ({ ...b, type: 'book' as const })),
  ];

  const filtered = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesType =
        filterType === 'all' || p.type === filterType;
      const matchesSearch =
        searchQuery === '' ||
        (lang === 'fr'
          ? p.title_fr
          : p.title_en
        )
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [allProducts, filterType, searchQuery, lang]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder={t.searchProducts}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-gray-600"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'investigation', 'book'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterType === type
                ? 'bg-[#D4AF37] text-black'
                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
            >
              {type === 'investigation' ? t.investigations : type === 'book' ? t.books : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {lang === 'fr' ? 'Aucun produit trouvé' : 'No products found'}
          </div>
        ) : (
          filtered.map((product) => {
            const key = `${product.type}_${product.id}`;
            const edit = pricingEdits[key] || {
              price_cfa: 0,
              price_eur: 0,
              is_paid: false,
            };
            const title = lang === 'fr' ? product.title_fr : product.title_en;

            return (
              <motion.div
                key={product.id}
                layout
                className="p-4 bg-gradient-to-r from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-xl hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider text-black"
                        style={{
                          backgroundColor:
                            product.type === 'investigation'
                              ? '#60A5FA'
                              : '#10B981',
                        }}
                      >
                        {product.type === 'investigation'
                          ? t.investigations
                          : t.books}
                      </span>
                    </div>
                    <p className="text-white font-medium truncate text-sm">
                      {title}
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5 font-mono">
                      {product.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={edit.is_paid}
                        onChange={(e) =>
                          handlePricingChange(key, 'is_paid', e.target.checked)
                        }
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                      <span className="text-gray-400 whitespace-nowrap">
                        {edit.is_paid ? t.paid : t.free}
                      </span>
                    </label>

                    {edit.is_paid && (
                      <>
                        <input
                          type="number"
                          value={edit.price_cfa}
                          onChange={(e) =>
                            handlePricingChange(
                              key,
                              'price_cfa',
                              Number(e.target.value)
                            )
                          }
                          placeholder="CFA"
                          className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={edit.price_eur}
                          onChange={(e) =>
                            handlePricingChange(
                              key,
                              'price_eur',
                              Number(e.target.value)
                            )
                          }
                          placeholder="EUR"
                          className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
                        />
                        <button
                          onClick={() =>
                            handleSavePricing(product.type, product.id)
                          }
                          disabled={isSavingPricing === key}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {isSavingPricing === key ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <CheckCircle size={10} />
                          )}
                          {lang === 'fr' ? 'Appliquer' : 'Apply'}
                        </button>
                        <button
                          onClick={() =>
                            handleRemovePricing(product.type, product.id)
                          }
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ACCESS SECTION
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// ACCESS SECTION (COMPLÈTEMENT REFONDU)
// ════════════════════════════════════════════════════════════════

function AccessSection({
  lang,
  showMsg,
}: {
  lang: 'fr' | 'en';
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const t = translations[lang];
  const [users, setUsers] = useState<UserOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [grants, setGrants] = useState<any[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [grantScope, setGrantScope] = useState<'single' | 'all'>('single');
  const [isSavingGrant, setIsSavingGrant] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingGrants, setIsLoadingGrants] = useState(true);

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, avatar_url')
        .order('created_at', { ascending: false });

      setUsers(
        profiles?.map((p) => ({
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || '',
          username: p.username,
          avatar_url: p.avatar_url,
        })) || []
      );
      setIsLoadingUsers(false);
    };

    fetchUsers();
  }, []);

  // Charger les produits
  useEffect(() => {
    const fetchProducts = async () => {
      const [invRes, bookRes] = await Promise.all([
        supabase.from('investigations').select('id, title_fr, title_en, cover_url'),
        supabase.from('library_books').select('id, title_fr, title_en, cover_url'),
      ]);

      const invs =
        invRes.data?.map((i) => ({ ...i, type: 'investigation' as const })) || [];
      const bks = bookRes.data?.map((b) => ({ ...b, type: 'book' as const })) || [];

      setProducts([...invs, ...bks]);
      setIsLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // Charger les grants accordés
  useEffect(() => {
    loadGrants();
  }, []);

  const loadGrants = async () => {
    const { data: grantsData } = await supabase
      .from('admin_user_access_grants')
      .select('*')
      .order('granted_at', { ascending: false });

    if (!grantsData) {
      setIsLoadingGrants(false);
      return;
    }

    const userIds = grantsData.map((g) => g.user_id);
    const { data: userProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    const userMap = new Map(userProfiles?.map((p) => [p.id, p]) || []);

    const enriched = grantsData.map((g) => ({
      ...g,
      user_profile: userMap.get(g.user_id),
    }));

    setGrants(enriched);
    setIsLoadingGrants(false);
  };

  const handleGrantAccess = async () => {
    if (!selectedUser || !selectedProduct) return;

    setIsSavingGrant(true);
    const { data: { session: authSession } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('admin_user_access_grants')
      .insert({
        admin_id: authSession?.user?.id,
        user_id: selectedUser.id,
        access_type: selectedProduct.type,
        access_scope: grantScope,
        target_ids: grantScope === 'single' ? [selectedProduct.id] : [],
      });

    if (error) {
      showMsg('error', t.grantError);
    } else {
      showMsg('success', t.granted);
      setSelectedUser(null);
      setSelectedProduct(null);
      await loadGrants();
    }

    setIsSavingGrant(false);
  };

  const handleDeleteGrant = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('admin_user_access_grants')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      showMsg('error', t.deleteError);
    } else {
      showMsg('success', lang === 'fr' ? 'Accès supprimé' : 'Access removed');
      await loadGrants();
    }

    setDeleteTarget(null);
    setIsDeleting(false);
  };

  return (
    <div className="space-y-8">
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteGrant}
        isLoading={isDeleting}
        title={lang === 'fr' ? 'Supprimer l\'accès' : 'Remove access'}
        message={lang === 'fr' ? 'Êtes-vous sûr ?' : 'Are you sure?'}
      />

      {/* SECTION 1 : SÉLECTION UTILISATEUR */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <h3 className="text-white font-bold text-lg">
            {lang === 'fr' ? 'Étape 1 : Sélectionner un utilisateur' : 'Step 1: Select a user'}
          </h3>
        </div>

        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {users.map((user) => (
              <motion.button
                key={user.id}
                layout
                onClick={() =>
                  setSelectedUser(selectedUser?.id === user.id ? null : user)
                }
                className={`p-4 rounded-xl border-2 transition-all text-left ${selectedUser?.id === user.id
                  ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-900 flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon
                        size={20}
                        className="m-auto text-gray-600"
                      />
                    )}
                  </div>
                  {selectedUser?.id === user.id && (
                    <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-white font-bold text-sm truncate">
                  {user.full_name || user.username || 'Utilisateur'}
                </p>
                <p className="text-gray-500 text-xs truncate">{user.email}</p>
              </motion.button>
            ))}
          </div>
        )}

        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-blue-400" />
              <div>
                <p className="text-white font-bold text-sm">
                  {selectedUser.full_name}
                </p>
                <p className="text-gray-500 text-xs">{selectedUser.email}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 text-gray-600 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>

      {/* SECTION 2 : SÉLECTION PRODUIT */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Briefcase size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-white font-bold text-lg">
            {lang === 'fr' ? 'Étape 2 : Sélectionner un produit' : 'Step 2: Select a product'}
          </h3>
        </div>

        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {products.map((product) => {
              const title = lang === 'fr' ? product.title_fr : product.title_en;
              return (
                <motion.button
                  key={`${product.type}_${product.id}`}
                  layout
                  onClick={() =>
                    setSelectedProduct(
                      selectedProduct?.id === product.id ? null : product
                    )
                  }
                  className={`p-4 rounded-xl border-2 transition-all text-left overflow-hidden ${selectedProduct?.id === product.id
                    ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Cover/Icon */}
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                      {product.cover_url ? (
                        <img
                          src={product.cover_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          {product.type === 'investigation' ? (
                            <Fingerprint size={20} />
                          ) : (
                            <BookOpen size={20} />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">
                        {title}
                      </p>
                      <p className="text-gray-500 text-xs capitalize">
                        {product.type === 'investigation' ? t.investigations : t.books}
                      </p>
                      {selectedProduct?.id === product.id && (
                        <div className="mt-2">
                          <CheckCircle size={14} className="text-emerald-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-400" />
              <div>
                <p className="text-white font-bold text-sm">
                  {lang === 'fr'
                    ? selectedProduct.title_fr
                    : selectedProduct.title_en}
                </p>
                <p className="text-gray-500 text-xs capitalize">
                  {selectedProduct.type}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="p-1 text-gray-600 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>

      {/* SECTION 3 : PORTÉE + BOUTON */}
      {selectedUser && selectedProduct && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl space-y-4"
        >
          <div>
            <label className="block text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">
              {t.accessScope}
            </label>
            <div className="flex gap-3">
              {(['single', 'all'] as const).map((scope) => (
                <button
                  key={scope}
                  onClick={() => setGrantScope(scope)}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all ${grantScope === scope
                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10 border border-white/10'
                    }`}
                >
                  {scope === 'single' ? t.single : t.all}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGrantAccess}
            disabled={isSavingGrant}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          >
            {isSavingGrant ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PlusCircle size={16} />
            )}
            {isSavingGrant
              ? lang === 'fr'
                ? 'Accordage en cours...'
                : 'Granting...'
              : t.grantAccess}
          </motion.button>
        </motion.div>
      )}

      {/* SECTION 4 : HISTORIQUE DES ACCÈS */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Clock size={16} className="text-amber-400" />
          </div>
          <h3 className="text-white font-bold text-lg">
            {lang === 'fr'
              ? `Accès accordés (${grants.length})`
              : `Granted Access (${grants.length})`}
          </h3>
        </div>

        {isLoadingGrants ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#D4AF37]" />
          </div>
        ) : grants.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {lang === 'fr' ? 'Aucun accès accordé' : 'No access granted'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {grants.map((grant) => (
              <motion.div
                key={grant.id}
                layout
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">
                    {grant.user_profile?.full_name}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {grant.user_profile?.email}
                  </p>
                  <p className="text-gray-700 text-xs mt-1 capitalize">
                    {grant.access_type}
                    {grant.access_scope === 'single'
                      ? ` - ${lang === 'fr' ? 'Accès spécifique' : 'Specific access'}`
                      : ` - ${lang === 'fr' ? 'Accès illimité' : 'Unlimited access'}`}
                  </p>
                </div>

                <button
                  onClick={() => setDeleteTarget(grant)}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HISTORY SECTION
// ════════════════════════════════════════════════════════════════

function HistorySection({
  lang,
  showMsg,
}: {
  lang: 'fr' | 'en';
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const t = translations[lang];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadTransactions = async () => {
      const { data } = await supabase
        .from('fedapay_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data) {
        setIsLoading(false);
        return;
      }

      // Enrichir avec les infos utilisateurs et produits
      const userIds = [...new Set(data.map((t) => t.user_id))];
      const productIds = [...new Set(data.map((t) => t.product_id))];

      const [usersRes, investigationsRes, booksRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds),
        supabase
          .from('investigations')
          .select('id, title_fr, title_en')
          .in('id', productIds),
        supabase
          .from('library_books')
          .select('id, title_fr, title_en')
          .in('id', productIds),
      ]);

      const usersMap = new Map<string, any>(
        usersRes.data?.map((u) => [u.id, u]) || []
      );
      const invMap = new Map<string, any>(
        investigationsRes.data?.map((i) => [i.id, i]) || []
      );
      const booksMap = new Map<string, any>(
        booksRes.data?.map((b) => [b.id, b]) || []
      );

      const enriched = data.map((tx) => {
        const user = usersMap.get(tx.user_id);
        const product =
          tx.product_type === 'investigation'
            ? invMap.get(tx.product_id)
            : booksMap.get(tx.product_id);

        return {
          ...tx,
          user_email: user?.email,
          user_name: user?.full_name,
          product_title:
            lang === 'fr' ? product?.title_fr : product?.title_en,
        };
      });

      setTransactions(enriched);
      setIsLoading(false);
    };

    loadTransactions();
  }, [lang]);

  const handleDeleteTransaction = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const { error } = await supabase
      .from('fedapay_transactions')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      showMsg('error', t.deleteError);
    } else {
      setTransactions((prev) =>
        prev.filter((t) => t.id !== deleteTarget.id)
      );
      showMsg('success', t.deletedSuccess);
    }

    setDeleteTarget(null);
    setIsDeleting(false);
  };

  const filtered = useMemo(() => {
    let result = transactions;

    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.user_email?.toLowerCase().includes(q) ||
          t.user_name?.toLowerCase().includes(q) ||
          t.product_title?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, filterStatus, searchQuery]);

  const stats = {
    total: transactions.length,
    completed: transactions.filter((t) => t.status === 'completed').length,
    failed: transactions.filter((t) => t.status === 'failed').length,
    pending: transactions.filter((t) => t.status === 'pending').length,
    revenue: transactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTransaction}
        isLoading={isDeleting}
        title={lang === 'fr' ? 'Supprimer la transaction' : 'Delete transaction'}
        message={lang === 'fr' ? 'Êtes-vous sûr ?' : 'Are you sure?'}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: t.totalUsers,
            value: new Set(transactions.map((t) => t.user_id)).size,
            icon: Users,
            color: '#60A5FA',
          },
          {
            label: t.completedTransactions,
            value: stats.completed,
            icon: CheckCircle,
            color: '#10B981',
          },
          {
            label: t.failedTransactions,
            value: stats.failed,
            icon: AlertCircle,
            color: '#EF4444',
          },
          {
            label: t.totalRevenue,
            value: `€${(stats.revenue / 100).toFixed(0)}`,
            icon: TrendingUp,
            color: '#D4AF37',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${color}20`,
                  border: `1px solid ${color}40`,
                }}
              >
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {label}
              </span>
            </div>
            <p className="text-white font-serif text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtres et recherche */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder={t.searchTransactions}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-white/30 transition-colors placeholder:text-gray-600"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'completed', 'pending', 'failed'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterStatus === status
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
                  }`}
              >
                {status === 'all'
                  ? 'Tous'
                  : status === 'completed'
                    ? '✓'
                    : status === 'failed'
                      ? '✗'
                      : '⏳'}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table des transactions */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.user}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.product}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.amount}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.status}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                {t.date}
              </th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-600">
                  {t.noTransactions}
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <motion.tr
                  key={tx.id}
                  layout
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{tx.user_name}</p>
                      <p className="text-gray-600 text-xs">{tx.user_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">
                        {tx.product_title}
                      </p>
                      <p className="text-gray-600 text-xs capitalize">
                        {tx.product_type}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-bold">
                      €{(tx.amount / 100).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${tx.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : tx.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(tx.created_at).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(tx)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// OVERVIEW SECTION
// ════════════════════════════════════════════════════════════════

function OverviewSection({
  lang,
}: {
  lang: 'fr' | 'en';
}) {
  const t = translations[lang];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
              <CreditCard size={18} className="text-blue-400" />
            </div>
            <h3 className="text-white font-bold">{lang === 'fr' ? 'Économie du Temps' : 'Time Economy'}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {lang === 'fr'
              ? 'Gérez le coût des indices, les récompenses de progression, et l\'achat de temps supplémentaire.'
              : 'Manage clue costs, progression rewards, and buying extra time.'}
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Users size={18} className="text-purple-400" />
            </div>
            <h3 className="text-white font-bold">{lang === 'fr' ? 'Accès Utilisateurs' : 'User Access'}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {lang === 'fr'
              ? 'Accordez un accès gratuit à des utilisateurs spécifiques ou à tous les contenus.'
              : 'Grant free access to specific users or all content.'}
          </p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <h3 className="text-white font-bold">{lang === 'fr' ? 'Tarification Produits' : 'Product Pricing'}</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          {lang === 'fr'
            ? 'Configurez les tarifs en EUR et CFA avec conversion automatique. Les enquêtes et livres peuvent être gratuits ou payants.'
            : 'Set prices in EUR and CFA with automatic conversion. Investigations and books can be free or paid.'}
        </p>
        <div className="space-y-2 text-xs text-gray-500">
          <p>• {lang === 'fr' ? 'Taux de change : 1 EUR = 655 CFA' : 'Exchange rate: 1 EUR = 655 CFA'}</p>
          <p>• {lang === 'fr' ? 'Les gratuits n\'affectent pas les paiements existants' : 'Free content doesn\'t affect existing payments'}</p>
          <p>• {lang === 'fr' ? 'Les modifications s\'appliquent immédiatement' : 'Changes take effect immediately'}</p>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function PaymentManagementTab({
  showMsg,
}: {
  showMsg: (type: 'success' | 'error', text: string) => void;
}) {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'trial' | 'pricing' | 'access' | 'history'
  >('overview');

  useEffect(() => {
    const saved = localStorage.getItem('lukeni_lang');
    if (saved) setLang(JSON.parse(saved));
  }, []);

  const t = translations[lang];

  const TABS = [
    { key: 'overview' as const, icon: Eye, label: t.overview, color: '#60A5FA' },
    { key: 'trial' as const, icon: Clock, label: t.trial, color: '#60A5FA' },
    { key: 'pricing' as const, icon: CreditCard, label: t.pricing, color: '#10B981' },
    { key: 'access' as const, icon: Users, label: t.access, color: '#A855F7' },
    { key: 'history' as const, icon: TrendingUp, label: t.history, color: '#D4AF37' },
  ];

  return (
    <div className="space-y-6">
      <NotificationToast
        isOpen={false}
        type="success"
        message=""
        onClose={() => { }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
            <CreditCard size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t.title}</h2>
            <p className="text-gray-600 text-xs mt-0.5 font-mono uppercase tracking-wider">
              {lang === 'fr' ? 'Économie du jeu' : 'Game Economy'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const newLang = lang === 'fr' ? 'en' : 'fr';
            setLang(newLang);
            localStorage.setItem('lukeni_lang', JSON.stringify(newLang));
          }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-500 hover:text-white hover:border-white/30 transition-all uppercase tracking-wider"
        >
          {lang.toUpperCase()}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map(({ key, icon: Icon, label, color }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === key
              ? 'text-black'
              : 'bg-white/5 text-gray-600 hover:text-gray-400'
              }`}
            style={
              activeTab === key ? { backgroundColor: color, color: 'black' } : {}
            }
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] rounded-2xl p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OverviewSection lang={lang} />
            </motion.div>
          )}
          {activeTab === 'trial' && (
            <motion.div
              key="trial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <TrialSection lang={lang} showMsg={showMsg} />
            </motion.div>
          )}
          {activeTab === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <PricingSection lang={lang} showMsg={showMsg} />
            </motion.div>
          )}
          {activeTab === 'access' && (
            <motion.div
              key="access"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AccessSection lang={lang} showMsg={showMsg} />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistorySection lang={lang} showMsg={showMsg} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}