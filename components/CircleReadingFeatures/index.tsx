import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkPlus, Highlighter, TrendingUp, Clock, PieChart,
  MessageSquare, CheckCircle, HelpCircle, ThumbsUp, ThumbsDown,
  X, Plus, Loader2, Copy
} from 'lucide-react';
import type {
  CircleBookmark,
  CircleHighlight,
  ReadingStats,
  CircleEvent,
  CirclePoll,
  CircleSummary,
  CircleQuiz,
} from '@/lib/hooks/useCircleReadingFeatures';

// ============================================================================
// 1. COMPOSANT : Repères collectifs (Bookmarks)
// ============================================================================
export function BookmarksPanel({
  bookmarks,
  onAddBookmark,
  onRemoveBookmark, 
  currentPage,
  lang = 'fr',
}: {
  bookmarks: CircleBookmark[];
  onAddBookmark: (page: number, label: string, category: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  currentPage: number;
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('citation'); // ← MODIFIÉ ICI

  // ← "note" A ÉTÉ RETIRÉ DE CETTE LISTE
  const CATEGORIES = [
    { key: 'spoiler', label_fr: '⚠️ Spoiler', label_en: '⚠️ Spoiler', emoji: '⚠️', color: 'red' },
    { key: 'concept', label_fr: '💡 Concept', label_en: '💡 Concept', emoji: '💡', color: 'blue' },
    { key: 'citation', label_fr: '✨ Citation', label_en: '✨ Citation', emoji: '✨', color: 'yellow' },
    { key: 'important', label_fr: '🔴 Important', label_en: '🔴 Important', emoji: '🔴', color: 'orange' },
  ];

  const pageBookmarks = bookmarks.filter(b => b.page_number === currentPage);
  const allPagesWithBookmarks = Array.from(
    new Set(bookmarks.map(b => b.page_number))
  ).sort((a, b) => a - b);

  const handleAdd = () => {
    if (newLabel.trim()) {
      onAddBookmark(currentPage, newLabel, selectedCategory);
      setNewLabel('');
      setSelectedCategory('citation'); // ← MODIFIÉ ICI
      setShowForm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-500/10 border border-blue-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-500/20 transition-colors text-left"
      >
        <BookmarkPlus size={14} className="text-blue-400" />
        <span className="text-blue-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Repères' : 'Bookmarks'} ({allPagesWithBookmarks.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-blue-500/20 max-h-64 overflow-y-auto"
        >
          {/* Ajouter un repère */}
          <div className="p-3 border-b border-blue-500/20">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs font-bold transition-colors"
              >
                <Plus size={12} />
                {lang === 'fr' ? 'Ajouter un repère' : 'Add bookmark'}
              </button>
            ) : (
              <div className="space-y-2">
                 <textarea
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder={lang === 'fr' ? 'Écrivez votre repère ou note ici...' : 'Write your bookmark or note here...'}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-white outline-none focus:border-blue-500/40 placeholder:text-gray-400 resize-none"
                />

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold">
                    {lang === 'fr' ? 'Catégorie' : 'Category'}
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setSelectedCategory(cat.key)}
                        className={`p-2 rounded text-center text-lg transition-all ${selectedCategory === cat.key
                            ? 'bg-blue-500/40 border border-blue-400'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        title={lang === 'fr' ? cat.label_fr : cat.label_en}
                      >
                        {cat.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={!newLabel.trim()}
                    className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {lang === 'fr' ? 'Ajouter' : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-2 py-1 bg-white/5 text-gray-400 rounded text-xs font-bold hover:bg-white/10 transition-colors"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Repères actuels */}
          {pageBookmarks.length > 0 && (
            <div className="p-3 space-y-2">
              <p className="text-blue-300 text-xs font-bold mb-2">
                {lang === 'fr' ? 'Page actuelle' : 'Current page'}
              </p>
              {pageBookmarks.map(bookmark => {
                const cat = CATEGORIES.find(c => c.key === bookmark.category);
                return (
                  <div key={bookmark.id} className="flex items-start gap-2 p-2 bg-white/[0.03] rounded text-xs group">
                    <span className="text-lg flex-shrink-0">{cat?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{bookmark.label}</p>
                      <p className="text-gray-600 text-[10px]">{bookmark.profiles?.full_name}</p>
                    </div>
                    <button
                      onClick={() => onRemoveBookmark(bookmark.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-red-400 flex-shrink-0"
                      title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Navigation rapide */}
          {allPagesWithBookmarks.length > 0 && (
            <div className="p-3 border-t border-blue-500/20">
              <p className="text-gray-600 text-[10px] font-bold mb-2 uppercase">
                {lang === 'fr' ? 'Pages avec repères' : 'Pages with bookmarks'}
              </p>
              <div className="flex flex-wrap gap-1">
                {allPagesWithBookmarks.map(page => (
                  <span
                    key={page}
                    className={`px-2 py-1 rounded text-xs font-bold ${page === currentPage
                        ? 'bg-blue-500 text-black'
                        : 'bg-white/5 text-gray-400'
                      }`}
                  >
                    p.{page}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// 2. COMPOSANT : Statistiques de lecture
// ============================================================================
export function ReadingStatsPanel({
  stats,
  lang = 'fr',
}: {
  stats: any;
  lang?: 'fr' | 'en';
}) {
  if (!stats) return null;

  const yourProgress = stats.your_page || 0;
  const progressPercent = Math.round((stats.average_page / stats.furthest_page) * 100);
  const behindAhead = yourProgress - stats.average_page;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-green-400" />
        <h3 className="text-green-400 text-xs font-bold uppercase">
          {lang === 'fr' ? 'Statistiques' : 'Statistics'}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400 text-xs">
              {lang === 'fr' ? 'Progression moyenne' : 'Average progress'}
            </span>
            <span className="text-green-400 text-xs font-bold">p.{stats.average_page}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-green-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">
            {lang === 'fr' ? 'Votre position' : 'Your position'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold">p.{yourProgress}</span>
            {behindAhead > 0 ? (
              <span className="text-green-400 text-[10px] font-bold">+{behindAhead}</span>
            ) : behindAhead < 0 ? (
              <span className="text-amber-400 text-[10px] font-bold">{behindAhead}</span>
            ) : (
              <span className="text-gray-600 text-[10px]">même rythme</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">
            {lang === 'fr' ? 'Plus loin' : 'Furthest'}
          </span>
          <span className="text-white text-xs font-bold">p.{stats.furthest_page}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">
            {lang === 'fr' ? 'Membres actifs' : 'Active members'}
          </span>
          <span className="text-white text-xs font-bold">{stats.members_count}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 3. COMPOSANT : Timeline d'événements
// ============================================================================
export function EventsTimeline({
  events,
  lang = 'fr',
}: {
  events: CircleEvent[];
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'member_joined':
        return '👤';
      case 'milestone_reached':
        return '🎉';
      case 'chapter_finished':
        return '✅';
      case 'highlight_added':
        return '✨';
      default:
        return '📝';
    }
  };

  const getEventLabel = (type: string) => {
    const labels: Record<string, { fr: string; en: string }> = {
      member_joined: { fr: 'A rejoint', en: 'Joined' },
      milestone_reached: { fr: 'Jalon atteint', en: 'Milestone' },
      chapter_finished: { fr: 'Chapitre fini', en: 'Chapter finished' },
      highlight_added: { fr: 'Highlight ajouté', en: 'Highlight added' },
    };
    return labels[type]?.[lang] || type;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-purple-500/10 border border-purple-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-500/20 transition-colors text-left"
      >
        <Clock size={14} className="text-purple-400" />
        <span className="text-purple-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Timeline' : 'Timeline'} ({events.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-purple-500/20 max-h-64 overflow-y-auto p-3 space-y-2"
        >
          {events.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-2">
              {lang === 'fr' ? 'Aucun événement' : 'No events'}
            </p>
          ) : (
            events.map(event => (
              <div key={event.id} className="flex gap-2">
                <span className="text-lg flex-shrink-0">{getEventIcon(event.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">
                    {event.profiles?.full_name || 'Système'}
                  </p>
                  <p className="text-gray-400 text-xs">{event.description}</p>
                  <p className="text-gray-700 text-[10px] mt-0.5">
                    {new Date(event.created_at).toLocaleDateString(
                      lang === 'fr' ? 'fr-FR' : 'en-US',
                      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// 4. COMPOSANT : Sondages
// ============================================================================
export function PollsPanel({
  polls,
  onVote,
  lang = 'fr',
}: {
  polls: CirclePoll[];
  onVote: (pollId: string, optionIndex: number) => void;
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (polls.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-pink-500/10 border border-pink-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-pink-500/20 transition-colors text-left"
      >
        <PieChart size={14} className="text-pink-400" />
        <span className="text-pink-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Sondages' : 'Polls'} ({polls.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-pink-500/20 max-h-96 overflow-y-auto p-3 space-y-4"
        >
          {polls.map(poll => {
            const totalVotes = poll.responses?.length || 0;
            const optionVotes = new Map<number, number>();

            (poll.responses || []).forEach(response => {
              optionVotes.set(
                response.option_index,
                (optionVotes.get(response.option_index) || 0) + 1
              );
            });

            return (
              <div key={poll.id} className="border border-pink-500/20 rounded p-3 space-y-2">
                <p className="text-white text-xs font-bold">{poll.question}</p>
                <div className="space-y-1.5">
                  {poll.options.map((option, idx) => {
                    const votes = optionVotes.get(idx) || 0;
                    const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                    return (
                      <button
                        key={idx}
                        onClick={() => onVote(poll.id, idx)}
                        className="w-full flex items-center gap-2 group"
                      >
                        <div className="flex-1 text-left">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-gray-300 text-xs">{option}</span>
                            <span className="text-gray-600 text-[10px]">{percent}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full bg-pink-500 group-hover:bg-pink-400 transition-colors"
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// 5. COMPOSANT : Résumés collaboratifs
// ============================================================================
export function SummariesPanel({
  summaries,
  onVote,
  lang = 'fr',
}: {
  summaries: CircleSummary[];
  onVote: (summaryId: string, isUpvote: boolean) => void;
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (summaries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cyan-500/20 transition-colors text-left"
      >
        <MessageSquare size={14} className="text-cyan-400" />
        <span className="text-cyan-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Résumés' : 'Summaries'} ({summaries.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-cyan-500/20 max-h-96 overflow-y-auto p-3 space-y-3"
        >
          {summaries.map(summary => (
            <div key={summary.id} className="border border-cyan-500/20 rounded p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">{summary.title}</p>
                  <p className="text-gray-600 text-[10px]">par {summary.profiles?.full_name}</p>
                </div>
                {summary.is_official && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-bold flex-shrink-0">
                    ✓ Official
                  </span>
                )}
              </div>

              <p className="text-gray-300 text-xs line-clamp-2">{summary.content}</p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onVote(summary.id, true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-white/5 hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
                >
                  <ThumbsUp size={10} />
                  <span>{summary.upvote_count}</span>
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// 6. COMPOSANT : Questions de compréhension
// ============================================================================
export function QuizzesPanel({
  quizzes,
  onAnswer,
  lang = 'fr',
}: {
  quizzes: CircleQuiz[];
  onAnswer: (quizId: string, optionIndex: number) => void;
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (quizzes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-orange-500/10 border border-orange-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-500/20 transition-colors text-left"
      >
        <HelpCircle size={14} className="text-orange-400" />
        <span className="text-orange-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Questions' : 'Quizzes'} ({quizzes.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-orange-500/20 max-h-96 overflow-y-auto p-3 space-y-4"
        >
          {quizzes.map(quiz => (
            <div key={quiz.id} className="border border-orange-500/20 rounded p-3 space-y-2">
              <p className="text-white text-xs font-bold">{quiz.question}</p>

              {quiz.userResponse ? (
                <div className="space-y-1">
                  {quiz.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-xs ${idx === quiz.userResponse?.selected_option_index
                          ? quiz.userResponse?.is_correct
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                          : 'bg-white/5 text-gray-400'
                        }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {quiz.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => onAnswer(quiz.id, idx)}
                      className="w-full p-2 rounded text-xs bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 transition-colors text-left"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}