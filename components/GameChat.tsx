// components/GameChat.tsx
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameChat } from '@/lib/hooks/useGameChat';
import { useGamePresence } from '@/lib/hooks/useGamePresence';

interface GameChatProps {
  gameId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GameChat({ gameId, userId, isOpen, onClose }: GameChatProps) {
  const { messages, sendMessage } = useGameChat(gameId, userId);
  const { presentUsers } = useGamePresence(gameId, userId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-0 h-full w-80 bg-[#0a0502]/95 border-l border-[#3a2511] flex flex-col z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#3a2511] flex justify-between items-center bg-[#1a1005]">
        <div>
          <h3 className="text-[#D4AF37] font-bold">Chat de partie</h3>
          <div className="flex gap-1 mt-1">
            {presentUsers.map(u => (
              <div key={u.user_id} className="w-2 h-2 rounded-full bg-green-500" title={u.full_name || 'En ligne'} />
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.user_id === userId ? 'items-end' : 'items-start'}`}
            >
              {msg.type === 'system' ? (
                <div className="text-xs text-gray-500 italic text-center w-full my-2">
                  {msg.content}
                </div>
              ) : (
                <>
                  <span className="text-xs text-gray-500 mb-1">{msg.profiles?.full_name || 'Anonyme'}</span>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    msg.user_id === userId 
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-[#3a2511] text-white'
                  }`}>
                    {msg.content}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-[#3a2511] bg-[#1a1005]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 bg-black/30 border border-[#3a2511] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
          />
          <button 
            type="submit"
            className="p-2 bg-[#D4AF37] text-black rounded-lg hover:bg-[#b5952f] transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}