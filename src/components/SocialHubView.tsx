import React, { useState, useEffect } from 'react';
import { Post, SocialHistoryEntry } from '../types';
import { 
  Facebook, 
  Instagram, 
  Send, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Plus,
  MoreHorizontal,
  History,
  Activity,
  Calendar,
  Trash2,
  Loader2,
  Check,
  X,
  RefreshCcw,
  ArrowUpDown,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFacebookPost } from '../hooks/useFacebookPost';
import { ConfirmationModal } from './ConfirmationModal';
import { NotificationToast } from './NotificationToast';

interface SocialHubViewProps {
  posts: Post[];
  handleOpenFBModal: (post: Post) => void;
  handleCreateForDate: (date: Date) => void;
  handleDeletePost: (id: string) => void;
  handleDeletePostFromFB?: (post: Post) => Promise<'deleted' | 'requested' | 'denied' | 'error'>;
  canDelete?: boolean;
  governanceSettings?: {
    restrictDeletionToSupervisor: boolean;
    requireDeletionApproval: boolean;
    requireFacebookDeletionApproval: boolean;
  };
  handleApproveDeletion?: (id: string) => Promise<void>;
  handleRejectDeletion?: (id: string) => Promise<void>;
  handleCancelDeletionRequest?: (id: string, type: 'hub' | 'facebook') => Promise<void>;
  userRole?: string;
}

export const SocialHubView: React.FC<SocialHubViewProps> = ({ 
  posts, 
  handleOpenFBModal,
  handleCreateForDate,
  handleDeletePost,
  handleDeletePostFromFB,
  canDelete = true,
  governanceSettings,
  handleApproveDeletion,
  handleRejectDeletion,
  handleCancelDeletionRequest,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'published' | 'scheduled' | 'history'>('overview');
  const [publishedSort, setPublishedSort] = useState<'posted' | 'planned' | 'title'>('posted');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<SocialHistoryEntry[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const publishedPosts = posts
    .filter(p => p.fbPostId && p.fbStatus === 'posted')
    .sort((a, b) => {
      if (publishedSort === 'posted') {
        const timeA = a.fbPublishedTime ? new Date(a.fbPublishedTime).getTime() : (a.updatedAt?.toMillis?.() || new Date(a.date).getTime());
        const timeB = b.fbPublishedTime ? new Date(b.fbPublishedTime).getTime() : (b.updatedAt?.toMillis?.() || new Date(b.date).getTime());
        return timeB - timeA;
      }
      if (publishedSort === 'planned') {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeB === timeA) {
          // Inner sort by updatedAt if dates are same
          const upA = a.updatedAt?.toMillis?.() || 0;
          const upB = b.updatedAt?.toMillis?.() || 0;
          return upB - upA;
        }
        return timeB - timeA;
      }
      return (a.contentTitle || '').localeCompare(b.contentTitle || '');
    });

  const scheduledPosts = posts
    .filter(p => p.fbPostId && p.fbStatus === 'scheduled')
    .sort((a, b) => {
      const timeA = a.fbScheduledTime ? new Date(a.fbScheduledTime).getTime() : new Date(a.date).getTime();
      const timeB = b.fbScheduledTime ? new Date(b.fbScheduledTime).getTime() : new Date(b.date).getTime();
      return timeA - timeB;
    });

  // Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'fb' | 'hub' | null;
    post: Post | null;
  }>({ isOpen: false, type: null, post: null });

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  const { deleteFacebookPost, isLoading: isDeleting, error: fbError } = useFacebookPost();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const sortMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
      if (isSortOpen && sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId, isSortOpen]);

  useEffect(() => {
    if (fbError) {
      setNotification({
        isOpen: true,
        title: 'Facebook Error',
        message: fbError,
        type: 'error'
      });
    }
  }, [fbError]);

  useEffect(() => {
    const q = query(
      collection(db, 'history'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SocialHistoryEntry[];
      setHistoryEntries(entries);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteFromFBDirect = async (post: Post) => {
    if (!post.fbPostId) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'This post does not have a linked Facebook ID.',
        type: 'error'
      });
      return;
    }

    // Check governance if handler provided
    if (handleDeletePostFromFB) {
      const govResult = await handleDeletePostFromFB(post);
      if (govResult === 'requested') {
        setNotification({
          isOpen: true,
          title: 'Request Submitted',
          message: 'Facebook deletion request was sent to supervisors for approval.',
          type: 'success'
        });
        setConfirmModal({ isOpen: false, type: null, post: null });
        return;
      }
      if (govResult === 'denied' || govResult === 'error') {
        setConfirmModal({ isOpen: false, type: null, post: null });
        return;
      }
    }

    const result = await deleteFacebookPost(post.fbPostId);
    
    if (result) {
      try {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
          fbPostId: null,
          fbStatus: null,
          fbPublishedTime: null,
          fbScheduledTime: null,
          status: 'Not Started',
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'history'), {
          postId: post.id,
          contentTitle: post.contentTitle,
          action: 'delete',
          platform: 'facebook',
          timestamp: serverTimestamp(),
          userEmail: auth.currentUser?.email || 'unknown',
          userName: auth.currentUser?.displayName || 'Unknown User',
          details: 'Deleted post from Facebook Page via Social Hub'
        });

        setNotification({
          isOpen: true,
          title: 'Post Deleted',
          message: 'The post has been successfully removed from Facebook.',
          type: 'success'
        });
      } catch (err) {
        console.error("Error updating post after deletion:", err);
        setNotification({
          isOpen: true,
          title: 'Sync Error',
          message: 'Facebook post was deleted, but failed to update local record.',
          type: 'error'
        });
      }
    }
    setConfirmModal({ isOpen: false, type: null, post: null });
  };

  const handleRemoveFromHub = (post: Post) => {
    handleDeletePost(post.id);
    setConfirmModal({ isOpen: false, type: null, post: null });
  };

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'manual_publish': return 'bg-emerald-50 text-emerald-600';
      case 'schedule': return 'bg-amber-50 text-amber-600';
      case 'auto_publish': return 'bg-blue-50 text-blue-600';
      case 'delete': return 'bg-rose-50 text-rose-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'manual_publish': return 'FB Posted';
      case 'schedule': return 'FB Scheduled';
      case 'auto_publish': return 'System Auto-Publish';
      case 'delete': return 'Deleted from FB';
      default: return action;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 pt-0 sm:p-6 sm:pt-0 space-y-6 sm:space-y-8">
      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'fb'}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => confirmModal.post && handleDeleteFromFBDirect(confirmModal.post)}
        title="Delete from Facebook?"
        message={`This will permanently delete "${confirmModal.post?.contentTitle}" from your Facebook page. This action cannot be undone.`}
        confirmText="Delete Post"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen && confirmModal.type === 'hub'}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => confirmModal.post && handleRemoveFromHub(confirmModal.post)}
        title="Remove from Hub?"
        message={`Are you sure you want to remove "${confirmModal.post?.contentTitle}" from the planner hub? This will NOT delete it from Facebook.`}
        confirmText="Remove Now"
        isDanger={false}
      />

      {/* Notifications */}
      <NotificationToast
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      {/* Interaction Bar: Tabs + Create Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 dark:bg-slate-800/40 rounded-lg w-fit overflow-x-auto no-scrollbar border border-slate-200/60 dark:border-slate-700/50 transition-colors duration-300">
            {['overview', 'scheduled', 'published', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  setOpenMenuId(null);
                }}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right side controls for Published/Scheduled (moved to left group on large screens) */}
          {(activeTab === 'published' || activeTab === 'scheduled') && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {activeTab === 'published' && publishedPosts.length > 0 && (
                <div className="relative" ref={sortMenuRef}>
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${
                      isSortOpen 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ListFilter className={`w-3.5 h-3.5 transition-colors ${isSortOpen ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'}`} />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Sort</span>
                  </button>

                  <AnimatePresence>
                    {isSortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-52 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-100 dark:border-slate-800 z-[110] overflow-hidden p-2.5"
                      >
                        <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 mb-1.5">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sort Published By</span>
                        </div>
                        {[
                          { id: 'posted', label: 'Recently Posted' },
                          { id: 'planned', label: 'Planned Date' },
                          { id: 'title', label: 'Title' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setPublishedSort(s.id as any);
                              setIsSortOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                              publishedSort === s.id 
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                          >
                            {s.label}
                            {publishedSort === s.id && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500/80 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {(activeTab === 'published' ? publishedPosts : scheduledPosts).length} Live Items
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Create Direct Post Button */}
        <button 
          onClick={() => handleCreateForDate(new Date())}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all shadow-md shadow-amber-200/50 shrink-0 text-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Direct Post
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Quick Stats */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <button 
                onClick={() => setActiveTab('published')}
                className="w-full text-left bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer group/card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg group-hover/card:bg-blue-500/30 transition-colors">
                    <Send className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{publishedPosts.length}</span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Total Published</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Live across all platforms</p>
              </button>
              <button 
                onClick={() => setActiveTab('scheduled')}
                className="w-full text-left bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-900/10 p-6 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700 transition-all cursor-pointer group/card"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg group-hover/card:bg-amber-500/30 transition-colors">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{scheduledPosts.length}</span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Scheduled</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Awaiting automation</p>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">Recent Audit Trail</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-amber-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {historyEntries.length > 0 ? (
                  historyEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {entry.platform === 'facebook' && <Facebook className="w-3 h-3 text-[#1877F2]" />}
                          {entry.platform === 'instagram' && <Instagram className="w-3 h-3 text-pink-500" />}
                          {entry.platform === 'meta' && <div className="flex -space-x-1"><Facebook className="w-3 h-3 text-[#1877F2] relative z-10" /><Instagram className="w-3 h-3 text-pink-500 relative z-0" /></div>}
                          {entry.platform === 'system' && <Activity className="w-3 h-3 text-slate-400 dark:text-slate-600" />}
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{entry.contentTitle}</h4>
                          <span className={`static px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getActionStyles(entry.action)}`}>
                            {getActionLabel(entry.action)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          by <span className="font-bold text-slate-600 dark:text-slate-300">{entry.userName}</span> • {entry.timestamp ? format(entry.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400 dark:text-slate-600">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">No history events yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Social Platform Status */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Connected Apps
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-[#1877F2]" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Facebook Page</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Synchronized</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Instagram Business</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Synchronized via Meta</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-relaxed">
                  Your Meta APIs are active. Posting from the hub will update your Planner Table automatically without leaving the app. Instagram is connected via your linked Facebook Page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center gap-3">
            <History className="w-6 h-6 text-slate-800 dark:text-slate-200" />
            <h3 className="font-bold text-slate-900 dark:text-white">Full Audit History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/40">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Content</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Action</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">User</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {historyEntries.length > 0 ? (
                  historyEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {entry.timestamp ? format(entry.timestamp.toDate(), 'MMM dd, yyyy HH:mm') : 'Just now'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {entry.platform === 'facebook' && <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />}
                          {entry.platform === 'system' && <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />}
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{entry.contentTitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionStyles(entry.action)}`}>
                          {getActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.userName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{entry.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{entry.details || '-'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 dark:text-slate-600">
                      <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No audit logs found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'published' || activeTab === 'scheduled') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === 'published' ? publishedPosts : scheduledPosts).length > 0 ? (
              (activeTab === 'published' ? publishedPosts : scheduledPosts).map(post => (
              <div key={post.id} id={`post-${post.id}`} className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-900 dark:bg-slate-800 rounded-lg border border-slate-700">
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{post.contentType}</span>
                    {post.deletionRequested && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-rose-200 dark:border-rose-800 animate-pulse">
                        Pending Hub Removal
                      </span>
                    )}
                    {post.facebookDeletionRequested && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                        Pending FB Removal
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === post.id ? null : post.id);
                      }}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-600 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {openMenuId === post.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-[90]" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                          }}
                        />
                        <div 
                          ref={menuRef}
                          className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-800 z-[100] overflow-hidden py-1"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenFBModal(post);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Details
                          </button>
                          {post.deletionRequested || post.facebookDeletionRequested ? (
                            <div className="flex flex-col">
                              {userRole === 'marketing_supervisor' ? (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveDeletion?.(post.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2 transition-colors border-t border-slate-50 dark:border-slate-800"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve {post.facebookDeletionRequested ? 'FB' : ''} Deletion
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectDeletion?.(post.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject Deletion
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelDeletionRequest?.(post.id, post.facebookDeletionRequested ? 'facebook' : 'hub');
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 transition-colors border-t border-slate-50 dark:border-slate-800"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancel Request
                                </button>
                              )}
                            </div>
                          ) : canDelete && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmModal({ isOpen: true, type: 'fb', post });
                                  setOpenMenuId(null);
                                }}
                                disabled={isDeleting}
                                className="w-full px-4 py-2 text-left text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                {governanceSettings?.requireFacebookDeletionApproval && userRole !== 'marketing_supervisor' ? 'Request FB Removal' : 'Delete from Facebook'}
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setConfirmModal({ isOpen: true, type: 'hub', post });
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors border-t border-slate-50 dark:border-slate-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {governanceSettings?.requireDeletionApproval && userRole !== 'marketing_supervisor' ? 'Request Removal' : 'Remove from Hub'}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{post.contentTitle}</h4>
                  <div className="relative group/caption">
                    <p className={`text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed transition-all ${openMenuId === `caption_${post.id}` ? '' : 'line-clamp-3'}`}>
                      {post.caption || "No caption provided for this post."}
                    </p>
                    {post.caption && post.caption.length > 120 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === `caption_${post.id}` ? null : `caption_${post.id}`);
                        }}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 mb-4 transition-colors"
                      >
                        {openMenuId === `caption_${post.id}` ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">
                      {post.fbStatus === 'posted' ? 'Published' : post.fbStatus === 'scheduled' ? 'Scheduled' : 'Planned Date'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {post.fbStatus === 'posted' && post.fbPublishedTime 
                        ? format(new Date(post.fbPublishedTime), 'MMM dd, HH:mm')
                        : post.fbStatus === 'scheduled' && post.fbScheduledTime
                          ? format(new Date(post.fbScheduledTime), 'MMM dd, HH:mm')
                          : format(new Date(post.date), 'MMM dd')}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleOpenFBModal(post)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      post.fbStatus === 'posted' 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' 
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    }`}
                  >
                    {post.fbStatus === 'posted' ? 'View Post' : 'Post Now'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">No {activeTab} content</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Planned contents will appear here once they are {activeTab === 'published' ? 'posted' : 'scheduled'}.</p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};
