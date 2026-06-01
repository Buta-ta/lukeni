// components/admin/shared/DeleteModal.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  itemName?: string;
  dependencies?: string[];
  warningMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export default function DeleteModal({
  isOpen,
  title,
  description,
  itemName,
  dependencies = [],
  warningMessage,
  onConfirm,
  onCancel,
  isDeleting = false,
  confirmText = "Supprimer définitivement",
  cancelText = "Annuler"
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#0A0A1A] border border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header avec icône danger */}
            <div className="relative p-6 border-b border-white/5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-gray-400">
                      {description}
                    </p>
                  )}
                </div>

                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="flex-shrink-0 p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Nom de l'élément */}
              {itemName && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-300 font-medium">
                    {itemName}
                  </p>
                </div>
              )}

              {/* Dépendances */}
              {dependencies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    ⚠️ Impacts de cette suppression :
                  </p>
                  <ul className="space-y-1.5">
                    {dependencies.map((dep, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-2"
                      >
                        <span className="text-red-400 flex-shrink-0">•</span>
                        <span>{dep}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning message custom */}
              {warningMessage && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <AlertTriangle size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300">
                    {warningMessage}
                  </p>
                </div>
              )}

              {/* Message final */}
              <p className="text-xs text-gray-500 italic">
                Cette action est <strong className="text-red-400">irréversible</strong>. 
                Les données supprimées ne pourront pas être récupérées.
              </p>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                {cancelText}
              </button>
              
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 rounded-lg text-white text-sm font-bold hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {confirmText}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}