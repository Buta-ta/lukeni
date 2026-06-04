"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Send, Bell, Mail, AlertCircle, CheckCircle,
  Eye, Users, Clock, TrendingUp, Filter, Search,
  Zap, MessageSquare, X, Smartphone, Wifi, WifiOff, User
} from 'lucide-react';

interface NotificationLog {
  id: string;
  notification_type: string;
  sent_at: string;
  recipients_count: number;
  errors_count: number;
  status: string;
  event_id?: string;
}

interface Recipient {
  id: string;
  user_id: string;
  endpoint: string;
  status: 'sent' | 'failed' | 'expired';
  error_message?: string;
  sent_at: string;
}

interface PushSubscriber {
  id: string;
  endpoint: string;
  created_at: string;
  is_active: boolean;
  user_id?: string;
}

export default function NotificationsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'recipients' | 'subscribers'>('send');
  const [isLoading, setIsLoading] = useState(false);

  // ── Send Manual Push ──────────────────────────────────────────────────────
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('https://lukeni.app/encyclopedie');
  const [isSending, setIsSending] = useState(false);
  const [activeSubCount, setActiveSubCount] = useState(0);

  // ── Send Email ────────────────────────────────────────────────────────────
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── Logs & Recipients ─────────────────────────────────────────────────────
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'expired'>('all');

  // ── Subscribers ───────────────────────────────────────────────────────────
  const [subscribers, setSubscribers] = useState<PushSubscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    // Compter les abonnés actifs pour l'onglet "Envoyer"
    supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('is_active', true)
      .then(({ count }) => setActiveSubCount(count || 0));

    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'subscribers') fetchSubscribers();
  }, [activeTab]);

  async function fetchLogs() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data as any);
    setIsLoading(false);
  }

  async function fetchRecipients(logId: string) {
    setRecipientsLoading(true);
    const { data, error } = await supabase
      .from('notification_recipients')
      .select('*')
      .eq('notification_log_id', logId)
      .order('sent_at', { ascending: false });
    if (data) setRecipients(data as any);
    setRecipientsLoading(false);
  }

  async function fetchSubscribers() {
    setSubsLoading(true);
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSubscribers(data as PushSubscriber[]);
    setSubsLoading(false);
  }

  // ── ENVOYER PUSH MANUEL ────────────────────────────────────────────────────
  async function sendManualPush() {
    if (!pushTitle.trim() || !pushBody.trim()) {
      showMsg('error', 'Titre et contenu requis');
      return;
    }

    setIsSending(true);
    try {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key, auth, user_id')
        .eq('is_active', true);

      if (!subscriptions || subscriptions.length === 0) {
        showMsg('error', 'Aucun abonné push');
        setIsSending(false);
        return;
      }

      const payload = JSON.stringify({
        title: pushTitle,
        body: pushBody,
        icon: 'https://lukeni.app/icons/icon-192x192.png',
        badge: 'https://lukeni.app/icons/badge-72x72.png',
        url: pushUrl,
        tag: `manual-${Date.now()}`,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: 'manual_push',
            title: pushTitle,
            body: pushBody
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMsg('success', `${result.notifications_sent || 0} notifications envoyées`);
        setPushTitle('');
        setPushBody('');
        setPushUrl('https://lukeni.app/encyclopedie');
      } else {
        showMsg('error', result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsSending(false);
    }
  }

  // ── ENVOYER EMAIL MANUEL ───────────────────────────────────────────────────
  async function sendManualEmail() {
    if (!emailSubject.trim() || !emailBody.trim() || !emailTo.trim()) {
      showMsg('error', 'Tous les champs requis');
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          html: emailBody,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showMsg('success', 'Email envoyé !');
        setEmailSubject('');
        setEmailBody('');
        setEmailTo('');
      } else {
        showMsg('error', result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsSendingEmail(false);
    }
  }

  const filteredRecipients = recipients.filter(r =>
    filterStatus === 'all' || r.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Bell className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white">Notifications</h2>
            <p className="text-gray-400 text-xs">Gérer le Push Web et les Emails</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
        {[
          { id: 'send' as const, label: '📤 Envoyer', icon: Send },
          { id: 'subscribers' as const, label: '📱 Abonnés', icon: Smartphone },
          { id: 'logs' as const, label: '📊 Historique', icon: TrendingUp },
          { id: 'recipients' as const, label: '👥 Destinataires', icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-400 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SEND TAB */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Push Notification</h3>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full font-bold">
                {activeSubCount} abonnés actifs
              </span>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📢 Titre</label>
              <input
                type="text" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Ex: 🌍 Nouvel événement historique" maxLength={100}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📝 Contenu</label>
              <textarea
                value={pushBody} onChange={(e) => setPushBody(e.target.value)}
                placeholder="Message à afficher..." maxLength={240} rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🔗 URL (optionnel)</label>
              <input
                type="url" value={pushUrl} onChange={(e) => setPushUrl(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
              />
            </div>

            <button
              onClick={sendManualPush}
              disabled={isSending || !pushTitle.trim() || !pushBody.trim() || activeSubCount === 0}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {isSending ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours...</> : <><Send size={16} /> Envoyer à {activeSubCount} utilisateurs</>}
            </button>
          </motion.div>

          {/* Email */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-6 space-y-4">
             {/* ... Identique à ton code original Email ... */}
            <div className="flex items-center gap-2 mb-4">
              <Mail size={20} className="text-green-400" />
              <h3 className="text-lg font-bold text-white">Email Manuel</h3>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📧 Destinataire</label>
              <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="utilisateur@example.com" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📌 Sujet</label>
              <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Sujet de l'email" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">✉️ Contenu (HTML)</label>
              <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="<p>Votre message HTML ici...</p>" rows={4} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 resize-none font-mono text-xs" />
            </div>
            <button onClick={sendManualEmail} disabled={isSendingEmail || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50 transition-all">
              {isSendingEmail ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : <><Mail size={16} /> Envoyer l'email</>}
            </button>
          </motion.div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SUBSCRIBERS TAB (NOUVEAU) */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <p className="text-blue-400 text-xs font-bold mb-1">Abonnés Actifs</p>
              <p className="text-2xl font-bold text-white">{subscribers.filter(s => s.is_active).length}</p>
            </div>
            <div className="flex-1 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="text-red-400 text-xs font-bold mb-1">Désabonnés / Expirés</p>
              <p className="text-2xl font-bold text-white">{subscribers.filter(s => !s.is_active).length}</p>
            </div>
          </div>

          {subsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Smartphone size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucun appareil enregistré dans la base.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subscribers.map((sub) => (
                <motion.div key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3 ${sub.is_active ? 'bg-[#0f0f0f] border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sub.is_active ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
                      <span className={`text-xs font-bold ${sub.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {sub.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      {sub.user_id && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400 flex items-center gap-1"><User size={10} /> Connecté</span>}
                    </div>
                    <p className="text-gray-400 font-mono text-[10px] truncate" title={sub.endpoint}>
                      {sub.endpoint.replace('https://fcm.googleapis.com/fcm/send/', '...')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock size={12} /> Ajouté le {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* LOGS TAB */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400" size={40} /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500"><Bell size={48} className="mx-auto mb-4 opacity-30" /><p>Aucun historique de notifications</p></div>
          ) : (
            logs.map(log => (
              <motion.div key={log.id} layout onClick={() => { setSelectedLog(log); fetchRecipients(log.id); }} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2.5 rounded-lg ${log.status === 'sent' ? 'bg-green-500/20' : log.status === 'partially_sent' ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                      {log.status === 'sent' ? <CheckCircle className="text-green-400" size={18} /> : <AlertCircle className="text-yellow-400" size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white capitalize">{log.notification_type}</span>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-gray-400">{log.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Users size={12} /> {log.recipients_count} envoyés</span>
                        {log.errors_count > 0 && <span className="flex items-center gap-1 text-red-400"><AlertCircle size={12} /> {log.errors_count} erreurs</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(log.sent_at).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <Eye size={16} className="text-gray-600" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* RECIPIENTS TAB */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'recipients' && (
        <div className="space-y-4">
          {!selectedLog ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>Sélectionnez un log ci-dessus pour voir les destinataires</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{selectedLog.notification_type}</h3>
                  <p className="text-xs text-gray-500">{new Date(selectedLog.sent_at).toLocaleString('fr-FR')}</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-lg"><X size={16} /></button>
              </div>

              <div className="flex gap-2 mb-4">
                {['all', 'sent', 'failed', 'expired'].map(status => (
                  <button key={status} onClick={() => setFilterStatus(status as any)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {status === 'all' ? 'Tous' : status === 'sent' ? '✓ Envoyés' : status === 'failed' ? '✗ Échoués' : '⏰ Expirés'}
                  </button>
                ))}
              </div>

              {recipientsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
              ) : filteredRecipients.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><Users size={32} className="mx-auto mb-2 opacity-30" /><p>Aucun destinataire avec ce statut</p></div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredRecipients.map(r => (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center justify-between p-3 rounded-lg text-xs ${r.status === 'sent' ? 'bg-green-500/10 border border-green-500/20' : r.status === 'expired' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 font-mono truncate">{r.endpoint.slice(0, 50)}...</p>
                        {r.error_message && <p className="text-[10px] text-gray-500 mt-0.5">{r.error_message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded font-bold ${r.status === 'sent' ? 'bg-green-500/20 text-green-400' : r.status === 'expired' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.status === 'sent' ? '✓' : r.status === 'expired' ? '⏰' : '✗'}
                        </span>
                        <Clock size={10} className="text-gray-600" />
                        <span className="text-gray-600">{new Date(r.sent_at).toLocaleTimeString('fr-FR')}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}