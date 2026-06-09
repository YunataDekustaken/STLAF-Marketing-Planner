//
// File: NewsletterHubView.tsx
// Author: Raphael Mendoza
// Date: 2026-06-09
// Purpose: Main dashboard layout for the Newsletter outbox, queue management, and subscriber deep-links.
//

import React, { useState } from 'react';
import { Post, SocialLinks } from '../types';
import { 
  Mail, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  SlidersHorizontal, 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Eye, 
  Power,
  RefreshCw,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface NewsletterHubViewProps {
  posts: Post[];
  socialLinks: SocialLinks;
  userRole?: string;
}

export const NewsletterHubView: React.FC<NewsletterHubViewProps> = ({ 
  posts, 
  socialLinks, 
  userRole 
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'scheduled' | 'sent' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPostForPreview, setSelectedPostForPreview] = useState<Post | null>(null);

  // Scheduling state for individual item custom popup in lists
  const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // 1. Target URL verification
  const targetUrl = socialLinks?.mailingAppUrl;

  // 2. Filter posts based on search query & mailing statuses
  const filteredPosts = posts.filter(post => {
    // Search filter
    const matchesSearch = !searchQuery || 
      post.contentTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.topicTheme?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Tab filter
    const mailStatus = (post as any).mailStatus || 'idle';
    if (activeTab === 'pending') {
      return mailStatus === 'pending_authorization';
    } else if (activeTab === 'scheduled') {
      return mailStatus === 'scheduled';
    } else if (activeTab === 'sent') {
      return mailStatus === 'authorized' || mailStatus === 'sent';
    } else {
      // Show any that have a designated mail status (or all to allow initial handoff!)
      return true;
    }
  });

  // KPI calculations
  const pendingCount = posts.filter(p => (p as any).mailStatus === 'pending_authorization').length;
  const scheduledCount = posts.filter(p => (p as any).mailStatus === 'scheduled').length;
  const sentCount = posts.filter(p => (p as any).mailStatus === 'authorized' || (p as any).mailStatus === 'sent').length;
  const cancelledCount = posts.filter(p => (p as any).mailStatus === 'cancelled').length;

  // Direct Hand-off Functions
  const handleLaunchNewsletterApp = (postId?: string) => {
    if (!targetUrl) {
      toast.error("Please configure 'Subscriber Mailing App' URL in Admin Settings -> Quick Links first.");
      return;
    }
    const separator = targetUrl.includes('?') ? '&' : '?';
    const finalUrl = postId ? `${targetUrl}${separator}postId=${postId}` : targetUrl;
    window.open(finalUrl, '_blank');
  };

  const handleAuthorizeNow = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'authorized',
        mailSentTime: serverTimestamp(),
        mailScheduledTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success("Broadcast authorized! Delivery queued now via Gmail.");
    } catch (err) {
      console.error(err);
      toast.error("Error authorizing campaign delivery.");
    }
  };

  const handleAuthorizeScheduled = async (post: Post) => {
    if (!scheduledDateTime) {
      toast.error("Please provide a valid schedule date and time.");
      return;
    }
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'scheduled',
        mailScheduledTime: scheduledDateTime,
        mailSentTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success(`Mail scheduled successfully for ${new Date(scheduledDateTime).toLocaleString()}!`);
      setSchedulingItemId(null);
      setScheduledDateTime('');
    } catch (err) {
      console.error(err);
      toast.error("Error scheduling delivery.");
    }
  };

  const handleCancelMailing = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'cancelled',
        mailScheduledTime: null,
        mailSentTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success("Subscriber Mailing canceled.");
    } catch (err) {
      console.error(err);
      toast.error("Error cancelling mailing outbox.");
    }
  };

  const handlePushToMailingStatus = async (post: Post) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'pending_authorization',
        updatedAt: serverTimestamp()
      });
      toast.success("Successfully marked as Pending Authorization! Ready to process outreach.");
    } catch (err) {
      console.error(err);
      toast.error("Error setting status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Integration Alert Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 md:max-w-2xl">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Connected Subscriber Mailing App
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Outreach & Newsletter Integration Gateway</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Quickly queue content cards for mailing. Authorized campaigns transfer variables natively into your Newsletter application, letting you broadcast instantly to subscriber lists or edit campaigns further before dispatch.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3">
          {targetUrl ? (
            <button 
              onClick={() => handleLaunchNewsletterApp()}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 font-extrabold text-xs uppercase tracking-wider text-slate-950 rounded-xl shadow-md transition-all flex items-center gap-2 group cursor-pointer"
            >
              Launch Newsletter App
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <div className="text-right">
              <span className="text-xs text-slate-500 block mb-1">Subscriber App Link Missing</span>
              <p className="text-[11px] text-amber-500/90 font-medium">Configure the "Subscriber Mailing App" URL in Settings to activate direct launch.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-xs dark:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Pending Review</span>
            <span className="block text-2xl font-black text-indigo-600 dark:text-indigo-400">{pendingCount}</span>
          </div>
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-xs dark:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Scheduled Broadcasts</span>
            <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">{scheduledCount}</span>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-xs dark:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Authorized Outbox</span>
            <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">{sentCount}</span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-xs dark:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">History & Cancelled</span>
            <span className="block text-2xl font-black text-rose-600 dark:text-rose-400">{cancelledCount}</span>
          </div>
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Action Filters & List Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs dark:shadow-sm">
        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 gap-4">
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 w-full sm:w-fit overflow-x-auto whitespace-nowrap scrollbar-none gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'pending' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'scheduled' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'sent' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Sent ({sentCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'all' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              All Campaigns
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search campaign topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 pl-9 pr-4 py-2 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Content Table / Card view */}
        <div className="p-1 sm:p-0">
          <AnimatePresence mode="wait">
            {filteredPosts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Mail className="w-8 h-8 text-slate-500 dark:text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">No campaigns found</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    There are no planning items filtered under this status tab. Toggle to the "All Campaigns" outbox page to initialize outreach tracks manually.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-slate-200 dark:divide-slate-800"
              >
                {filteredPosts.map((post) => {
                  const mailStatus = (post as any).mailStatus || 'idle';
                  const hasGraphics = post.creatives && post.creatives.length > 0;

                  return (
                    <div key={post.id} className="p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      
                      {/* Left Block: Info & Metadata */}
                      <div className="space-y-2 w-full xl:flex-1 min-w-[280px] sm:min-w-[340px] md:min-w-[420px] max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                            {post.format || "Post"}
                          </span>
                          <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                            {post.contentType || "N/A"}
                          </span>

                          {/* Quick Badge */}
                          {mailStatus === 'pending_authorization' && (
                            <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                              Pending Review
                            </span>
                          )}
                          {mailStatus === 'scheduled' && (
                            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                              Scheduled Outbox
                            </span>
                          )}
                          {(mailStatus === 'authorized' || mailStatus === 'sent') && (
                            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                              {mailStatus === 'sent' ? 'Sent (Newsletter App)' : 'Authorized / Sent'}
                            </span>
                          )}
                          {mailStatus === 'cancelled' && (
                            <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                              Cancelled
                            </span>
                          )}
                          {mailStatus === 'idle' && (
                            <span className="px-2.5 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 rounded text-[9px] font-black uppercase tracking-wider">
                              Inactive Outreach
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug break-words">{post.contentTitle || "Untitled Campaign"}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-lg leading-normal break-words">
                          {post.caption || <span className="text-slate-400 dark:text-slate-600 italic">No description copy provided for this campaign.</span>}
                        </p>

                        <div className="flex flex-wrap text-[10px] text-slate-500 dark:text-slate-400 gap-x-4 gap-y-1 pt-1 font-semibold break-words">
                          {post.topicTheme && <span className="break-words">Theme: <strong className="text-slate-700 dark:text-slate-300">{post.topicTheme}</strong></span>}
                          {post.date && <span>Date Scheduled: <strong className="text-slate-700 dark:text-slate-300">{post.date}</strong></span>}
                          {hasGraphics ? (
                            <span className="text-emerald-600 dark:text-emerald-400/90 font-black">✓ Campaign Graphics Loaded ({post.creatives?.length})</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">No graphics linked</span>
                          )}
                        </div>

                        {/* Extra scheduled info */}
                        {mailStatus === 'scheduled' && post.mailScheduledTime && (
                          <div className="mt-1 text-xs text-amber-600 dark:text-amber-400/90 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Scheduled delivery: {new Date(post.mailScheduledTime).toLocaleString()}
                          </div>
                        )}
                        {/* Extra sent / authorized info */}
                        {(mailStatus === 'authorized' || mailStatus === 'sent') && (
                          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400/90 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {mailStatus === 'sent' ? 'Successfully sent and broadcasted to subscriber list from Newsletter App.' : 'Transferred to outreach list delivery queue.'}
                          </div>
                        )}
                      </div>

                      {/* Right Block: Context Operators */}
                      <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto xl:justify-end shrink-0">
                        {/* Eye Preview button */}
                        <button 
                          onClick={() => setSelectedPostForPreview(post)}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                          title="Preview Assets & Caption Copy"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>

                        {/* If inactive outreach, trigger pending_authorization */}
                        {(mailStatus === 'idle' || mailStatus === 'cancelled') && (
                          <button 
                            onClick={() => handlePushToMailingStatus(post)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white font-bold text-xs rounded-lg transition-colors border border-slate-200 dark:border-slate-700/50 cursor-pointer"
                          >
                            Handoff to Outbox
                          </button>
                        )}

                        {/* Operational controls for pending/scheduled */}
                        {mailStatus === 'pending_authorization' && (
                          <>
                            <button 
                              onClick={() => handleAuthorizeNow(post)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black tracking-wider uppercase text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm shadow-emerald-500/5 cursor-pointer"
                            >
                              Authorize Broadcast
                            </button>
                            <button 
                              onClick={() => {
                                setSchedulingItemId(post.id);
                                setScheduledDateTime('');
                              }}
                              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                              Schedule
                            </button>
                          </>
                        )}

                        {/* Open in external newsletter app button (option B decision block) */}
                        {targetUrl && (
                          <button 
                            onClick={() => handleLaunchNewsletterApp(post.id)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Edit directly in newsletter compose application"
                          >
                            <span>Edit in Newsletter App</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Operations to Cancel a Pending/Scheduled delivery */}
                        {['pending_authorization', 'scheduled'].includes(mailStatus) && (
                          <button 
                            onClick={() => handleCancelMailing(post)}
                            className="p-2 hover:bg-rose-500/5 text-rose-500 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                            title="Cancel outreach dispatch"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Custom Scheduling Dropdown / Floating element */}
                      {schedulingItemId === post.id && (
                        <div className="w-full md:w-80 p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl mt-3 space-y-3 ml-auto animate-fadeIn col-span-2">
                          <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">Choose Delivery Slot</span>
                          <input 
                            type="datetime-local" 
                            value={scheduledDateTime}
                            onChange={(e) => setScheduledDateTime(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white uppercase"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSchedulingItemId(null)}
                              className="flex-grow py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleAuthorizeScheduled(post)}
                              className="flex-grow py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded cursor-pointer"
                            >
                              Schedule Post
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Details / Preview Drawer Modal */}
      <AnimatePresence>
        {selectedPostForPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop slide-lock */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPostForPreview(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Campaign Preview Board</span>
                </div>
                <button 
                  onClick={() => setSelectedPostForPreview(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Cover Creative Graphic */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-bold">Linked Campaign Graphic</label>
                {selectedPostForPreview.creatives && selectedPostForPreview.creatives.length > 0 ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 relative group">
                    <img 
                      src={selectedPostForPreview.creatives[0]} 
                      alt="Campaign artwork" 
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1.5">
                    <FileText className="w-8 h-8" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Graphics Uploaded</span>
                  </div>
                )}
              </div>

              {/* Title & Stats inside drawer */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block">Campaign Subject / Title</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedPostForPreview.contentTitle || "Untitled"}</p>
                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-0.5">Content Planner Slot</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{selectedPostForPreview.date || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[9px] font-black uppercase tracking-wider mb-0.5">Mailing Status</span>
                    <span className="font-extrabold uppercase text-indigo-500 dark:text-indigo-400">{(selectedPostForPreview as any).mailStatus || "Inactive"}</span>
                  </div>
                </div>
              </div>

              {/* Description Copy Sheet text-area copy wrapper */}
              <div className="space-y-2 flex-grow">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Outreach Caption / Copysheet Template</label>
                <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[140px] whitespace-pre-wrap leading-relaxed select-all selection:bg-indigo-500 selection:text-white">
                  {selectedPostForPreview.caption || <span className="text-slate-400 dark:text-slate-600 italic">No description copy provided for this campaign.</span>}
                </div>
              </div>

              {/* Big launch CTA inside Drawer */}
              {targetUrl && (
                <button 
                  onClick={() => {
                    handleLaunchNewsletterApp(selectedPostForPreview.id);
                    setSelectedPostForPreview(null);
                  }}
                  className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg cursor-pointer"
                >
                  <span>Open in Subscriber Newsletter Application</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
