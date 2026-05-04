import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${isDanger ? 'bg-rose-50' : 'bg-amber-50'}`}>
                  {isDanger ? (
                    <Trash2 className="w-6 h-6 text-rose-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                {message}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 bg-slate-50 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isDanger 
                      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                  }`}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
