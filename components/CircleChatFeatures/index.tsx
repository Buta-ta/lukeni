import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Heart, Reply, Pin, PinOff, Search,
  X, Loader2, SmilePlus, AtSign
} from 'lucide-react';
import type { ChatMessage, MessageReaction } from '@/lib/hooks/useCircleChat';

// ============================================================================
// 1. COMPOSANT : Réactions aux messages
// ============================================================================
export function MessageReactions({
  reactions,
  onAddReaction,
  onRemoveReaction,
  isLoading = false,
}: {
  reactions: MessageReaction[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  isLoading?: boolean;
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😢', '🤔', '✨'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-2">
      {reactions.map(r => (
        <motion.button
          key={r.emoji}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => (r.hasUserReacted ? onRemoveReaction(r.emoji) : onAddReaction(r.emoji))}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all ${
            r.hasUserReacted
              ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
          }`}
          disabled={isLoading}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </motion.button>
      ))}

      {/* Ajouter une réaction */}
      {reactions.length < 5 && (
        <div className="relative" ref={pickerRef}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 transition-all border border-white/10"
          >
            <SmilePlus size={12} />
          </motion.button>

          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-8 left-0 bg-[#0d0d1a] border border-white/10 rounded-lg p-2 z-20 flex gap-1"
            >
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAddReaction(emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform cursor-pointer"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. COMPOSANT : Citation/Réponse
// ============================================================================
export function MessageQuotePreview({
  message,
}: {
  message: ChatMessage;
}) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 p-3 bg-white/[0.03] border-l-2 border-emerald-500/50 rounded text-sm mb-2">
      <Reply size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs">
          {message.profiles?.full_name || 'Utilisateur'}
        </p>
        <p className="text-gray-300 truncate">{message.content}</p>
      </div>
    </div>
  );
}

// ============================================================================
// 3. COMPOSANT : Indicateur de présence
// ============================================================================
export function PresenceIndicator({
  presentUsers,
  allMembers,
  lang = 'fr',
}: {
  presentUsers: any[];
  allMembers: any[];
  lang?: 'fr' | 'en';
}) {
  const onlineCount = presentUsers.length;
  const totalCount = allMembers.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm"
    >
      <div className="flex items-center gap-1.5">
        <div className="flex -space-x-2">
          {presentUsers.slice(0, 3).map(user => (
            <div
              key={user.user_id}
              className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0"
              title={user.full_name || user.username}
            >
              {(user.full_name || user.username || '?')[0]?.toUpperCase()}
            </div>
          ))}
          {onlineCount > 3 && (
            <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xs font-bold">
              +{onlineCount - 3}
            </div>
          )}
        </div>
        <span className="text-emerald-400 text-xs font-bold">
          {lang === 'fr'
            ? `${onlineCount}/${totalCount} en ligne`
            : `${onlineCount}/${totalCount} online`}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 4. COMPOSANT : Mentions
// ============================================================================
export function MentionsList({
  members,
  onSelectMember,
  lang = 'fr',
}: {
  members: any[];
  onSelectMember: (userId: string) => void;
  lang?: 'fr' | 'en';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full mb-2 left-0 bg-[#0d0d1a] border border-white/10 rounded-lg overflow-hidden z-30 w-48 max-h-48 overflow-y-auto"
    >
      {members.length === 0 ? (
        <div className="p-3 text-center text-gray-500 text-xs">
          {lang === 'fr' ? 'Aucun membre' : 'No members'}
        </div>
      ) : (
        members.map(member => (
          <button
            key={member.user_id}
            onClick={() => onSelectMember(member.user_id)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
              {(member.profiles?.full_name || 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">
                {member.profiles?.full_name || 'Utilisateur'}
              </p>
            </div>
          </button>
        ))
      )}
    </motion.div>
  );
}

// ============================================================================
// 5. COMPOSANT : Barre de recherche
// ============================================================================
export function ChatSearch({
  onSearch,
  lang = 'fr',
}: {
  onSearch: (query: string) => void;
  lang?: 'fr' | 'en';
}) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
      <input
        type="text"
        placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
        value={searchTerm}
        onChange={e => {
          setSearchTerm(e.target.value);
          onSearch(e.target.value);
        }}
        className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-emerald-500/40 transition-colors placeholder:text-gray-600"
      />
      {searchTerm && (
        <button
          onClick={() => {
            setSearchTerm('');
            onSearch('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 6. COMPOSANT : Messages épinglés
// ============================================================================
export function PinnedMessagesPanel({
  pinnedMessages,
  onUnpin,
  isCreator = false,
  userId,
  lang = 'fr',
}: {
  pinnedMessages: ChatMessage[];
  onUnpin: (messageId: string) => void;
  isCreator?: boolean;
  userId?: string;
  lang?: 'fr' | 'en';
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/10 border border-amber-500/20 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-500/20 transition-colors text-left"
      >
        <Pin size={14} className="text-amber-400" />
        <span className="text-amber-400 text-xs font-bold flex-1">
          {lang === 'fr' ? 'Messages épinglés' : 'Pinned messages'} ({pinnedMessages.length})
        </span>
        <span className="text-gray-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-amber-500/20 max-h-48 overflow-y-auto"
        >
          {pinnedMessages.map(msg => (
            <div key={msg.id} className="flex items-start gap-2 p-3 border-b border-amber-500/10 hover:bg-white/[0.02] transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-gray-500 text-[10px] mb-0.5">
                  {msg.profiles?.full_name || 'Utilisateur'}
                </p>
                <p className="text-gray-300 text-sm truncate">{msg.content}</p>
              </div>
              {/* ✅ DÉPINGLER (créateur seulement) */}
              {isCreator && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onUnpin(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-amber-400 flex-shrink-0"
                  title={lang === 'fr' ? 'Dépingler' : 'Unpin'}
                >
                  <PinOff size={12} />
                </motion.button>
              )}
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}