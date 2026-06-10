import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useUserCircles } from '@/lib/hooks/useUserCircles';
import type { User } from '@supabase/supabase-js';

export function ProfileCircles({ user, lang = 'fr' }: { user: User | null; lang?: 'fr' | 'en' }) {
  const { circles, requests, isLoading } = useUserCircles(user);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-8 bg-white/5 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse h-32 bg-white/5 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════
          CERCLES OÙ L'UTILISATEUR EST MEMBRE
      ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-400" />
          <h3 className="text-white font-serif text-lg font-bold">
            {lang === 'fr' ? 'Mes cercles de lecture' : 'My reading circles'}
          </h3>
          <span className="text-gray-600 text-sm">({circles.length})</span>
        </div>

        {circles.length === 0 ? (
          <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-3xl text-center">
            <p className="text-gray-500 text-sm">
              {lang === 'fr'
                ? "Vous n'êtes membre d'aucun cercle de lecture"
                : "You're not a member of any reading circle"}
            </p>
            <Link
              href="/bibliotheque"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-500/30 transition-colors"
            >
              {lang === 'fr' ? 'Explorer les cercles' : 'Explore circles'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {circles.map(circle => (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#0d0d1a] to-[#080810] border border-white/[0.07] rounded-3xl overflow-hidden hover:border-white/20 transition-all"
              >
                <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />

                <div className="p-5">
                  <div className="flex gap-4 mb-3">
                    {circle.book_cover && (
                      <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        <img src={circle.book_cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold text-sm truncate">{circle.name}</h4>
                      {circle.book_title && (
                        <p className="text-gray-400 text-xs truncate mt-0.5">{circle.book_title}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      circle.role === 'creator'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-gray-400'
                    }`}>
                      {circle.role === 'creator'
                        ? (lang === 'fr' ? '👑 Créateur' : '👑 Creator')
                        : (lang === 'fr' ? 'Membre' : 'Member')
                    }
                    </span>

                    <Link
                      href={`/bibliotheque/circles/${circle.id}`}
                      className="text-emerald-400 text-xs font-bold hover:text-white transition-colors"
                    >
                      {lang === 'fr' ? 'Ouvrir →' : 'Open →'}
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DEMANDES D'ADHÉSION
      ═══════════════════════════════════════════════════════════ */}
      {requests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            <h3 className="text-white font-serif text-lg font-bold">
              {lang === 'fr' ? 'Mes demandes' : 'My requests'}
            </h3>
            <span className="text-gray-600 text-sm">({requests.length})</span>
          </div>

          <div className="space-y-3">
            {requests.map(req => (
              <motion.div
                key={req.circle_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 border rounded-3xl ${
                  req.status === 'pending'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  {req.book_cover && (
                    <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                      <img src={req.book_cover} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm truncate">{req.circle_name}</h4>
                    {req.book_title && (
                      <p className="text-gray-400 text-xs truncate mt-0.5">{req.book_title}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      {/* Statut */}
                      <span className={`flex items-center gap-1 text-xs font-bold ${
                        req.status === 'pending' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {req.status === 'pending' ? (
                          <>
                            <Clock size={12} />
                            {lang === 'fr' ? 'En attente' : 'Pending'}
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            {lang === 'fr' ? 'Refusée' : 'Rejected'}
                          </>
                        )}
                      </span>

                      {/* Tentatives restantes */}
                      <span className={`text-xs font-bold ${
                        req.remaining_attempts > 1
                          ? 'text-gray-400'
                          : req.remaining_attempts === 1
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}>
                        {lang === 'fr'
                          ? `${req.remaining_attempts}/3 tentatives restantes`
                          : `${req.remaining_attempts}/3 attempts left`}
                      </span>
                    </div>

                    {/* Barre de tentatives */}
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i <= (3 - req.remaining_attempts)
                              ? 'bg-red-500'
                              : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}