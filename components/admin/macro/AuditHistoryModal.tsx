"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, History, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuditHistoryModal({ chartId, onClose }: { chartId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('macro_charts_audit_log').select('*').eq('chart_id', chartId)
      .order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, [chartId]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f0f0f] border border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h3 className="text-white font-bold flex items-center gap-2"><History size={18} className="text-teal-400"/> Historique des modifications</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-white"/></button>
        </div>
        {loading ? <Loader2 className="animate-spin text-teal-400 mx-auto my-8" /> : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {logs.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Aucun historique.</p>}
            {logs.map(log => (
              <div key={log.id} className="bg-white/5 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded font-bold ${log.action === 'insert' ? 'bg-green-500/20 text-green-400' : log.action === 'delete' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {log.action.toUpperCase()}
                  </span>
                  <span className="text-gray-500">{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <p className="text-gray-400">Acteur : {log.actor_id ? log.actor_id.slice(0, 8) : 'système'}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}