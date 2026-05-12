import React from 'react';
import { Post } from '../types';
import { X, Check, AlertCircle, Trash2, Edit2, Copy, FileText, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ImportItem {
  id: string;
  post: Post;
  status: 'new' | 'duplicate' | 'date_conflict';
  existingPost?: Post;
  resolution: 'keep_existing' | 'overwrite' | 'add_as_new' | 'skip';
}

interface ImportResolutionModalProps {
  isOpen: boolean;
  items: ImportItem[];
  onClose: () => void;
  onUpdateItem: (id: string, resolution: ImportItem['resolution']) => void;
  onBulkUpdate: (type: 'all_new' | 'all_overwrite' | 'all_skip' | 'all_keep_both') => void;
  onProcess: () => void;
  isProcessing: boolean;
}

export const ImportResolutionModal: React.FC<ImportResolutionModalProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateItem,
  onBulkUpdate,
  onProcess,
  isProcessing
}) => {
  if (!isOpen) return null;

  const duplicates = items.filter(i => i.status === 'duplicate');
  const dateConflicts = items.filter(i => i.status === 'date_conflict');
  const newItems = items.filter(i => i.status === 'new');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
      >
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-8 h-8 text-amber-500" />
              CSV Import Review
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              Analyze results: We found {items.length} items to import.
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{newItems.length}</div>
              <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">New To Add</div>
              <button 
                onClick={() => onBulkUpdate('all_new')}
                className="mt-3 text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-widest"
              >
                Set New to Import
              </button>
            </div>
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{duplicates.length}</div>
              <div className="text-xs font-black text-amber-500 uppercase tracking-widest mt-1">Exact Duplicates</div>
              <button 
                onClick={() => onBulkUpdate('all_overwrite')}
                className="mt-3 text-[10px] font-black text-amber-600 hover:underline uppercase tracking-widest"
              >
                Set All to Overwrite
              </button>
            </div>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{dateConflicts.length}</div>
              <div className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1">Date Conflicts</div>
              <div className="flex gap-3 mt-3">
                <button 
                  onClick={() => onBulkUpdate('all_keep_both')}
                  className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest"
                >
                  Keep Both
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Action Toggle Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900 dark:bg-black rounded-2xl gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black text-sm">!</div>
              <div>
                <div className="text-white text-sm font-bold">Fast Import Actions</div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Apply to all {items.length} items</div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => {
                  onBulkUpdate('all_new');
                  onBulkUpdate('all_overwrite');
                }}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
              >
                Import All
              </button>
              <button 
                onClick={() => onBulkUpdate('all_skip')}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Skip All
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="space-y-3">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 py-2 border-b border-slate-100 dark:border-slate-800 mb-4 hidden sm:grid sm:grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="col-span-5">Content Details</div>
              <div className="col-span-3">Status / Existing</div>
              <div className="col-span-4 text-right">Resolution Action</div>
            </div>

            {items.length > 100 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Showing first 100 of {items.length} items. Actions like "Overwrite All" will still apply to all items.
              </div>
            )}

            {items.slice(0, 100).map((item) => (
              <div 
                key={item.id} 
                className={`group p-4 rounded-2xl border transition-all ${
                  item.resolution === 'skip' 
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-50 grayscale' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                  {/* Info */}
                  <div className="sm:col-span-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.post.date}</span>
                      <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase">{item.post.format}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{item.post.contentTitle}</h4>
                    <p className="text-xs text-slate-400 truncate">{item.post.contentType} • {item.post.topicTheme}</p>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-3">
                    <div className="flex flex-col gap-1.5">
                      <div className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                        item.status === 'new' ? 'bg-emerald-500/10 text-emerald-600' :
                        item.status === 'duplicate' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {item.status === 'duplicate' ? <Copy className="w-3 h-3" /> : 
                         item.status === 'date_conflict' ? <AlertCircle className="w-3 h-3" /> : 
                         <Check className="w-3 h-3" />}
                        {item.status.replace('_', ' ')}
                      </div>
                      
                      {item.existingPost && (
                        <div className="text-[10px] text-slate-400 font-medium italic truncate">
                          vs: {item.existingPost.contentTitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="sm:col-span-4 flex justify-end gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                      <button 
                        onClick={() => onUpdateItem(item.id, item.status === 'new' ? 'add_as_new' : 'overwrite')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          item.resolution === 'overwrite' || (item.resolution === 'add_as_new' && item.status === 'new')
                            ? 'bg-amber-500 text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {item.status === 'duplicate' ? 'Overwrite' : 'Import'}
                      </button>
                      
                      {item.status !== 'new' && (
                        <button 
                          onClick={() => onUpdateItem(item.id, 'add_as_new')}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            item.resolution === 'add_as_new' && item.status !== 'new'
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          Keep Both
                        </button>
                      )}

                      <button 
                        onClick={() => onUpdateItem(item.id, 'skip')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          item.resolution === 'skip'
                            ? 'bg-slate-300 dark:bg-slate-600 text-white' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                Ready to Import: {items.filter(i => i.resolution !== 'skip').length} Items
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Skipping {items.filter(i => i.resolution === 'skip').length} duplicates/conflicts
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-none px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all uppercase text-xs tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={onProcess}
              disabled={isProcessing || items.filter(i => i.resolution !== 'skip').length === 0}
              className="flex-1 sm:flex-none px-10 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm & Import'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
