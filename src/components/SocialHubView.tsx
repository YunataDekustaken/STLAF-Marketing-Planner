import React, { useState, useEffect } from 'react';
import { Post, SocialHistoryEntry } from '../types';
import { 
  Facebook, 
  Instagram, 
  Linkedin, 
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFacebookPost } from '../hooks/useFacebookPost';

interface SocialHubViewProps {
  posts: Post[];
  handleOpenFBModal: (post: Post) => void;
  handleCreateForDate: (date: Date) => void;
  handleDeletePost: (id: string) => Promise<void>;
}

export const SocialHubView: React.FC<SocialHubViewProps> = ({ 
  posts, 
  handleOpenFBModal,
  handleCreateForDate,
  handleDeletePost
}) => {
  const publishedPosts = posts.filter(p => p.status === 'Published').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const scheduledPosts = posts.filter(p => p.status === 'Scheduled').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [activeTab, setActiveTab] = useState<'overview' | 'published' | 'scheduled' | 'history'>('overview');
  const [historyEntries, setHistoryEntries] = useState<SocialHistoryEntry[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { deleteFacebookPost, isLoading: isDeleting, error: fbError } = useFacebookPost();

  useEffect(() => {
    if (fbError) {
      alert(fbError);
    }
  }, [fbError]);

  const handleDeleteFromFBDirect = async (e: React.MouseEvent, post: Post) => {
    e.stopPropagation();
    console.log("handleDeleteFromFBDirect caught for post:", post.id, "fbPostId:", post.fbPostId);
    if (!post.fbPostId) {
      alert("This post does not have a linked Facebook ID.");
      return;
    }
    
    const confirmed = window.confirm("Are you sure you want to delete this post from Facebook? This action cannot be undone.");
    if (!confirmed) return;

    console.log("Calling deleteFacebookPost hook...");
    const result = await deleteFacebookPost(post.fbPostId);
    console.log("deleteFacebookPost result:", result);
    
    if (result) {
      try {
        console.log("Updating Firestore doc to remove FB link...");
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
      } catch (err) {
        console.error("Error updating post after deletion:", err);
        alert("Facebook post was deleted, but failed to update local record.");
      }
    }
    setOpenMenuId(null);
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header section */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Social Media Hub</h2>
          <p className="text-slate-500 font-medium text-sm sm:text-base">Manage your direct postings and track published content.</p>
        </div>
        <button 
          onClick={() => handleCreateForDate(new Date())}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-200 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Create Direct Post
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {['overview', 'scheduled', 'published', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Quick Stats */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-white to-blue-50/30 p-6 rounded-[2rem] border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl">
                    <Send className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-2xl font-black text-slate-900">{publishedPosts.length}</span>
                </div>
                <h4 className="font-bold text-slate-800">Total Published</h4>
                <p className="text-sm text-slate-500">Live across all platforms</p>
              </div>
              <div className="bg-gradient-to-br from-white to-amber-50/30 p-6 rounded-[2rem] border border-amber-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="text-2xl font-black text-slate-900">{scheduledPosts.length}</span>
                </div>
                <h4 className="font-bold text-slate-800">Scheduled</h4>
                <p className="text-sm text-slate-500">Awaiting automation</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Recent Audit Trail</h3>
                <button onClick={() => setActiveTab('history')} className="text-xs font-bold text-amber-600 hover:underline">View All</button>
              </div>
              <div className="divide-y divide-slate-50">
                {historyEntries.length > 0 ? (
                  historyEntries.slice(0, 5).map(entry => (
                    <div key={entry.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {entry.platform === 'facebook' && <Facebook className="w-3 h-3 text-[#1877F2]" />}
                          {entry.platform === 'system' && <Activity className="w-3 h-3 text-slate-400" />}
                          <h4 className="font-bold text-slate-900 truncate text-sm">{entry.contentTitle}</h4>
                          <span className={`static px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getActionStyles(entry.action)}`}>
                            {getActionLabel(entry.action)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          by <span className="font-bold text-slate-600">{entry.userName}</span> • {entry.timestamp ? format(entry.timestamp.toDate(), 'MMM dd, HH:mm') : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">No history events yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Social Platform Status */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Platform Health
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'Facebook Business', icon: Facebook, color: 'text-[#1877F2]' },
                  { name: 'Instagram Professional', icon: Instagram, color: 'text-pink-500' },
                  { name: 'LinkedIn Company', icon: Linkedin, color: 'text-[#0A66C2]' }
                ].map(platform => (
                  <div key={platform.name} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <platform.icon className={`w-5 h-5 ${platform.color}`} />
                      <span className="text-sm font-semibold">{platform.name}</span>
                    </div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-relaxed">
                  Your accounts are securely synced with the Social Hub. Posting directly from here will update your Monthly Table status automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
            <History className="w-6 h-6 text-slate-800" />
            <h3 className="font-bold text-slate-900">Full Audit History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Content</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">User</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyEntries.length > 0 ? (
                  historyEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-500">
                          {entry.timestamp ? format(entry.timestamp.toDate(), 'MMM dd, yyyy HH:mm') : 'Just now'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {entry.platform === 'facebook' && <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />}
                          {entry.platform === 'system' && <Activity className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-sm font-bold text-slate-800 line-clamp-1">{entry.contentTitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionStyles(entry.action)}`}>
                          {getActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">{entry.userName}</span>
                          <span className="text-[10px] text-slate-400">{entry.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 font-medium">{entry.details || '-'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'published' ? publishedPosts : scheduledPosts).length > 0 ? (
            (activeTab === 'published' ? publishedPosts : scheduledPosts).map(post => (
              <div key={post.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <Facebook className="w-4 h-4 text-[#1877F2]" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{post.contentType}</span>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === post.id ? null : post.id);
                      }}
                      className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {openMenuId === post.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-[100] overflow-hidden py-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFBModal(post);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Details
                        </button>
                        <button 
                          onClick={(e) => {
                            handleDeleteFromFBDirect(e, post);
                          }}
                          disabled={isDeleting}
                          className="w-full px-4 py-2 text-left text-[10px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete from Facebook
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            console.log("Remove from Hub clicked for post:", post.id);
                            if (window.confirm("Remove this post from the hub? This will NOT delete it from Facebook.")) {
                              try {
                                console.log("Calling handleDeletePost prop...");
                                await handleDeletePost(post.id);
                                console.log("handleDeletePost call finished.");
                                setOpenMenuId(null);
                              } catch (err) {
                                console.error("Error removing post:", err);
                                alert("Failed to remove post from hub.");
                              }
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-[10px] font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2 transition-colors border-t border-slate-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove from Hub
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h4 className="font-bold text-slate-900 mb-2 line-clamp-1">{post.contentTitle}</h4>
                <p className="text-sm text-slate-500 mb-6 line-clamp-3 leading-relaxed h-[63px]">
                  {post.caption || "No caption provided for this post."}
                </p>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Date</span>
                    <span className="text-xs font-bold text-slate-700">{format(new Date(post.date), 'MMM dd')}</span>
                  </div>
                  <button 
                    onClick={() => handleOpenFBModal(post)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      post.status === 'Published' 
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {post.status === 'Published' ? 'View Post' : 'Post Now'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
              <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900">No {activeTab} content</h3>
              <p className="text-sm text-slate-500">Planned contents will appear here once they are {activeTab === 'published' ? 'posted' : 'scheduled'}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
