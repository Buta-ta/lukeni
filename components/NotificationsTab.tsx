"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Send, Bell, Mail, AlertCircle, CheckCircle,
  Eye, Users, Clock, TrendingUp, Filter, Search,
  Zap, MessageSquare, X, Smartphone, Wifi, WifiOff, User,
  Trash2, Archive, Volume2, Vibrate
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
  user_name?: string;
}

interface PushSubscriber {
  id: string;
  endpoint: string;
  created_at: string;
  is_active: boolean;
  user_id?: string;
  user_name?: string;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message?: string;
  sent_at: string;
}

export default function NotificationsTab({ showMsg }: { showMsg: (type: 'success' | 'error', text: string) => void }) {
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'recipients' | 'subscribers' | 'emails'>('send');
  const [isLoading, setIsLoading] = useState(false);

  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushUrl, setPushUrl] = useState('https://lukeni.app/encyclopedie');
  const [pushIcon, setPushIcon] = useState('https://lukeni.app/icons/icon-192x192.png');
  const [enableSound, setEnableSound] = useState(true);
  const [enableVibration, setEnableVibration] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeSubCount, setActiveSubCount] = useState(0);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'failed' | 'expired'>('all');

  const [subscribers, setSubscribers] = useState<PushSubscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('is_active', true)
      .then(({ count }) => setActiveSubCount(count || 0));

    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'subscribers') fetchSubscribers();
    if (activeTab === 'emails') fetchEmailLogs();
  }, [activeTab]);

  async function fetchLogs() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);
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

    if (data) {
      setRecipients(data as any);
    }
    setRecipientsLoading(false);
  }

  async function fetchSubscribers() {
    setSubsLoading(true);
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, created_at, is_active, user_id, user_name')
      .order('created_at', { ascending: false });

    if (data) {
      setSubscribers(data as PushSubscriber[]);
    }
    setSubsLoading(false);
  }

  async function fetchEmailLogs() {
    setEmailLogsLoading(true);
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);
    if (data) setEmailLogs(data as EmailLog[]);
    setEmailLogsLoading(false);
  }

  async function deleteLog(logId: string) {
    setIsDeleting(true);
    try {
      const { error: err1 } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('notification_log_id', logId);

      const { error: err2 } = await supabase
        .from('notification_logs')
        .delete()
        .eq('id', logId);

      if (err1 || err2) throw new Error('Erreur lors de la suppression');

      showMsg('success', 'Log supprimé avec succès');
      setSelectedLog(null);
      setDeleteConfirm(null);
      fetchLogs();
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteAllLogs() {
    setIsDeleting(true);
    try {
      const { error: err1 } = await supabase
        .from('notification_recipients')
        .delete(); 

      const { error: err2 } = await supabase
        .from('notification_logs')
        .delete(); 

      if (err1 || err2) throw new Error('Erreur lors de la suppression');

      showMsg('success', 'Tous les logs ont été supprimés');
      setLogs([]);
      setDeleteConfirm(null);
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteEmailLog(logId: string) {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('email_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      showMsg('success', 'Email supprimé');
      setDeleteConfirm(null);
      fetchEmailLogs();
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteAllEmailLogs() {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('email_logs')
        .delete(); 

      if (error) throw error;

      showMsg('success', 'Tous les logs email supprimés');
      setEmailLogs([]);
      setDeleteConfirm(null);
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function sendManualPush() {
    if (!pushTitle.trim() || !pushBody.trim()) {
      showMsg('error', 'Titre et contenu requis');
      return;
    }

    setIsSending(true);
    try {
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
            body: pushBody,
            icon: pushIcon,
            url: pushUrl,
            sound: enableSound,
            vibrate: enableVibration,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMsg('success', `${result.notifications_sent || 0} notification(s) envoyée(s) !`);
        setPushTitle('');
        setPushBody('');
        setPushUrl('https://lukeni.app/encyclopedie');
        setPushIcon('https://lukeni.app/icons/icon-192x192.png');
        setEnableSound(true);
        setEnableVibration(true);
        setTimeout(() => fetchLogs(), 1000);
      } else {
        showMsg('error', result.message || result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsSending(false);
    }
  }

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
        await supabase
          .from('email_logs')
          .insert({
            recipient_email: emailTo,
            subject: emailSubject,
            status: 'sent',
            sent_at: new Date().toISOString(),
          });

        showMsg('success', 'Email envoyé !');
        setEmailSubject('');
        setEmailBody('');
        setEmailTo('');
        fetchEmailLogs();
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
  ).filter(r => {
    if (!searchQuery) return true;
    return r.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredSubscribers = subscribers.filter(s => {
    if (!searchQuery) return true;
    return (
      (s.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredEmailLogs = emailLogs.filter(e => {
    if (!searchQuery) return true;
    return (
      e.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
          { id: 'logs' as const, label: '📊 Push', icon: TrendingUp },
          { id: 'recipients' as const, label: '👥 Destinataires', icon: Users },
          { id: 'emails' as const, label: '📧 Emails', icon: Mail },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setSelectedLog(null);
              }}
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

      {/* SEND TAB */}
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
                type="text" 
                value={pushTitle} 
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Ex: 🌍 Nouvel événement historique" 
                maxLength={100}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📝 Contenu</label>
              <textarea
                value={pushBody} 
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="Message à afficher..." 
                maxLength={240} 
                rows={3}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🎨 Icône (URL)</label>
              <input
                type="url" 
                value={pushIcon} 
                onChange={(e) => setPushIcon(e.target.value)}
                placeholder="https://lukeni.app/icons/icon-192x192.png"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[
                  { url: 'https://lukeni.app/icons/icon-192x192.png', label: '📱 Défaut' },
                  { url: 'https://lukeni.app/icons/bell.png', label: '🔔 Cloche' },
                  { url: 'https://lukeni.app/icons/calendar.png', label: '📅 Calendrier' },
                  { url: 'https://lukeni.app/icons/newspaper.png', label: '📰 Journal' },
                ].map(preset => (
                  <button
                    key={preset.url}
                    onClick={() => setPushIcon(preset.url)}
                    className={`text-xs px-3 py-1 rounded-lg transition-all ${
                      pushIcon === preset.url 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">🔗 URL de destination</label>
              <input
                type="url" 
                value={pushUrl} 
                onChange={(e) => setPushUrl(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
              />
            </div>

            {/* SON ET VIBRATION */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="block text-xs text-gray-400 font-mono">🔊 Options Audio & Vibration</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={enableSound} 
                    onChange={(e) => setEnableSound(e.target.checked)}
                    className="rounded w-4 h-4 accent-blue-500"
                  />
                  <Volume2 size={14} className={enableSound ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="text-xs text-gray-300">Son activé</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={enableVibration} 
                    onChange={(e) => setEnableVibration(e.target.checked)}
                    className="rounded w-4 h-4 accent-blue-500"
                  />
                  <Vibrate size={14} className={enableVibration ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="text-xs text-gray-300">Vibration activée</span>
                </label>
              </div>
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
            <div className="flex items-center gap-2 mb-4">
              <Mail size={20} className="text-green-400" />
              <h3 className="text-lg font-bold text-white">Email Manuel</h3>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📧 Destinataire</label>
              <input 
                type="email" 
                value={emailTo} 
                onChange={(e) => setEmailTo(e.target.value)} 
                placeholder="utilisateur@example.com" 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50" 
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">📌 Sujet</label>
              <input 
                type="text" 
                value={emailSubject} 
                onChange={(e) => setEmailSubject(e.target.value)} 
                placeholder="Sujet de l'email" 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50" 
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono">✉️ Contenu (HTML)</label>
              <textarea 
                value={emailBody} 
                onChange={(e) => setEmailBody(e.target.value)} 
                placeholder="<p>Votre message HTML ici...</p>" 
                rows={4} 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none focus:border-green-500/50 resize-none font-mono text-xs" 
              />
            </div>
            <button 
              onClick={sendManualEmail} 
              disabled={isSendingEmail || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()} 
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-500 disabled:opacity-50 transition-all">
              {isSendingEmail ? <><Loader2 size={16} className="animate-spin" /> Envoi...</> : <><Mail size={16} /> Envoyer l'email</>}
            </button>
          </motion.div>
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
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

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou endpoint..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
            />
          </div>

          {subsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Smartphone size={48} className="mx-auto mb-4 opacity-30" />
              <p>Aucun résultat</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSubscribers.map((sub) => (
                <motion.div key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-3 ${sub.is_active ? 'bg-[#0f0f0f] border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sub.is_active ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
                      <span className={`text-xs font-bold ${sub.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {sub.is_active ? 'Actif' : 'Inactif'}
                      </span>
                      {sub.user_name && (
                        <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-400 flex items-center gap-1">
                          <User size={10} /> {sub.user_name}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 font-mono text-[10px] truncate" title={sub.endpoint}>
                      {sub.endpoint.replace('https://fcm.googleapis.com/fcm/send/', '...')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                    <Clock size={12} /> {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOGS TAB (PUSH) */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {logs.length > 0 && (
            <button
              onClick={() => setDeleteConfirm('all-logs')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-all"
            >
              <Trash2 size={14} /> Supprimer tout l'historique
            </button>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-400" size={40} /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500"><Bell size={48} className="mx-auto mb-4 opacity-30" /><p>Aucun historique</p></div>
          ) : (
            logs.map(log => (
              <motion.div key={log.id} layout className="space-y-2">
                <div onClick={() => { setSelectedLog(log); fetchRecipients(log.id); }} className="bg-[#0f0f0f] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-blue-500/30 transition-all">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(log.id);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {deleteConfirm === log.id && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-red-400 font-bold mb-2">Êtes-vous sûr ?</p>
                      <p className="text-xs text-gray-400">Cette action est irréversible.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => deleteLog(log.id)}
                        disabled={isDeleting}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 disabled:opacity-50"
                      >
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}

          {deleteConfirm === 'all-logs' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <div className="flex-1">
                <p className="text-sm text-red-400 font-bold mb-2">Supprimer tout l'historique ?</p>
                <p className="text-xs text-gray-400">{logs.length} logs seront supprimés définitivement.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteAllLogs}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression...' : 'Tout supprimer'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* RECIPIENTS TAB */}
      {activeTab === 'recipients' && (
        <div className="space-y-4">
          {!selectedLog ? (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>Sélectionnez un log dans l'onglet "Push" pour voir les destinataires</p>
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

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
                />
              </div>

              {recipientsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
              ) : filteredRecipients.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><Users size={32} className="mx-auto mb-2 opacity-30" /><p>Aucun résultat</p></div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredRecipients.map(r => (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center justify-between p-3 rounded-lg text-xs ${r.status === 'sent' ? 'bg-green-500/10 border border-green-500/20' : r.status === 'expired' ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 font-mono truncate text-[10px]">{r.endpoint.slice(0, 60)}...</p>
                        {r.error_message && <p className="text-[10px] text-red-400 mt-0.5">{r.error_message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded font-bold ${r.status === 'sent' ? 'bg-green-500/20 text-green-400' : r.status === 'expired' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.status === 'sent' ? '✓' : r.status === 'expired' ? '⏰' : '✗'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EMAILS TAB */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
              <p className="text-green-400 text-xs font-bold mb-1">Emails Envoyés</p>
              <p className="text-2xl font-bold text-white">{emailLogs.filter(e => e.status === 'sent').length}</p>
            </div>
            <div className="flex-1 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <p className="text-red-400 text-xs font-bold mb-1">Erreurs</p>
              <p className="text-2xl font-bold text-white">{emailLogs.filter(e => e.status !== 'sent').length}</p>
            </div>
          </div>

          {emailLogs.length > 0 && (
            <button
              onClick={() => setDeleteConfirm('all-emails')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-600/30 transition-all"
            >
              <Trash2 size={14} /> Supprimer tous les emails
            </button>
          )}

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par email ou sujet..."
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-blue-500/50"
            />
          </div>

          {emailLogsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500"><Mail size={48} className="mx-auto mb-4 opacity-30" /><p>Aucun email envoyé</p></div>
          ) : (
            <div className="space-y-2">
              {filteredEmailLogs.map(email => (
                <motion.div key={email.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex items-center justify-between p-4 border rounded-xl gap-3 ${email.status === 'sent' ? 'bg-[#0f0f0f] border-white/10' : 'bg-red-500/5 border-red-500/10'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {email.status === 'sent' ? <CheckCircle size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-red-400" />}
                      <span className={`text-xs font-bold ${email.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                        {email.status === 'sent' ? 'Envoyé' : 'Erreur'}
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm">{email.subject}</p>
                    <p className="text-gray-400 text-xs mt-1">{email.recipient_email}</p>
                    {email.error_message && <p className="text-red-400 text-[10px] mt-1">{email.error_message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(email.sent_at).toLocaleString('fr-FR')}
                    </span>
                    <button
                      onClick={() => setDeleteConfirm(email.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {deleteConfirm === 'all-emails' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
              <div className="flex-1">
                <p className="text-sm text-red-400 font-bold mb-2">Supprimer tous les logs emails ?</p>
                <p className="text-xs text-gray-400">{emailLogs.length} emails seront supprimés.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteAllEmailLogs}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression...' : 'Tout supprimer'}
                </button>
              </div>
            </motion.div>
          )}

          {emailLogs.map(email => (
            deleteConfirm === email.id && (
              <motion.div key={email.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-bold mb-2">Supprimer cet email ?</p>
                  <p className="text-xs text-gray-400">{email.subject}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => deleteEmailLog(email.id)}
                    disabled={isDeleting}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-500 disabled:opacity-50"
                  >
                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </motion.div>
            )
          ))}
        </div>
      )}
    </div>
  );
}