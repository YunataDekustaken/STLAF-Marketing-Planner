//
// File: MailingDistributionScreen.tsx
// Author: Raphael Mendoza
// Date: 2026-06-09
// Purpose: Subscription mailing dispatcher simulator for newsletter broadcast reviews and authorization.
//

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';
import { 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  FileText,
  MousePointerClick,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MailingDistributionScreenProps {
  postId: string;
  onBack: () => void;
}

export const MailingDistributionScreen: React.FC<MailingDistributionScreenProps> = ({ postId, onBack }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState<string | null>(null);
  const [currentCreativeIdx, setCurrentCreativeIdx] = useState(0);

  // States for Scheduling
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // 1. Listen to Firestore post
  useEffect(() => {
    if (!postId) {
      setErrorStr("No Post ID provided in URL.");
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'posts', postId), (snapshot) => {
      setLoading(false);
      if (snapshot.exists()) {
        setPost({ id: snapshot.id, ...snapshot.data() } as Post);
        setErrorStr(null);
      } else {
        setErrorStr(`Document not found (ID: ${postId})`);
      }
    }, (err) => {
      console.error(err);
      setErrorStr("Failed to retrieve document from shared database.");
      setLoading(false);
    });

    return () => unsub();
  }, [postId]);

  // Actions
  const handleAuthorizeNow = async () => {
    if (!post) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'authorized',
        mailSentTime: serverTimestamp(),
        mailScheduledTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success("Broadcast successfully Authorized! Queueing for instant delivery via Gmail...", { duration: 5000 });
    } catch (err) {
      console.error(err);
      toast.error("Error authorizing broadcast.");
    }
  };

  const handleAuthorizeScheduled = async () => {
    if (!post || !scheduledDateTime) {
      toast.error("Please supply a valid date and time.");
      return;
    }
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'scheduled',
        mailScheduledTime: scheduledDateTime,
        mailSentTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success(`Broadcast successfully Scheduled for ${new Date(scheduledDateTime).toLocaleString()}!`, { duration: 5000 });
      setShowScheduler(false);
    } catch (err) {
      console.error(err);
      toast.error("Error scheduling broadcast.");
    }
  };

  const handleCancelMailing = async () => {
    if (!post) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        mailStatus: 'cancelled',
        mailScheduledTime: null,
        mailSentTime: null,
        updatedAt: serverTimestamp()
      });
      toast.success("Subscriber Mailing Transaction cancelled.", { duration: 4000 });
    } catch (err) {
      console.error(err);
      toast.error("Error updating status.");
    }
  };

  // Render Helpers
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
          <Mail className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Loading Distribution Gateway...</p>
      </div>
    );
  }

  if (errorStr || !post) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6 text-red-400 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">Failed to Access Shared Assets</h3>
        <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
          {errorStr || "The document ID might be invalid or has been purged from the database."}
        </p>
        <button 
          onClick={onBack}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-widest text-slate-200 rounded-xl transition-all"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  const creatives = post.creatives || [];
  const activeCreative = creatives[currentCreativeIdx];
  const mailStatus = (post as any).mailStatus || 'pending_authorization';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Top Sticky Header */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Portal
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-black uppercase tracking-widest">Mailing Confirmation System</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(mailStatus === 'authorized' || mailStatus === 'sent') && (
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] uppercase tracking-widest font-black text-emerald-400 flex items-center gap-1.5 animate-pulse">
              <Check className="w-3 h-3" /> {mailStatus === 'sent' ? 'Broadcast Sent Successfully' : 'Authorized for Broadcast'}
            </span>
          )}
          {mailStatus === 'scheduled' && (
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[10px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Scheduled Broadcoast
            </span>
          )}
          {mailStatus === 'cancelled' && (
            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full text-[10px] uppercase tracking-widest font-black text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3 h-3" /> Cancelled
            </span>
          )}
          {mailStatus === 'pending_authorization' && (
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-[10px] uppercase tracking-widest font-black text-indigo-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Pending Authorization
            </span>
          )}
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Hand: Creatives / Assets Showcase */}
        <section className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Campaign Creative Preview
            </h3>

            {/* Creative Box */}
            {creatives.length > 0 ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
                <img 
                  src={activeCreative} 
                  alt="Campaign Creative" 
                  className="max-h-full max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay text in bottom */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">Image {currentCreativeIdx + 1} of {creatives.length}</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setCurrentCreativeIdx(prev => (prev > 0 ? prev - 1 : creatives.length - 1))}
                      className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentCreativeIdx(prev => (prev < creatives.length - 1 ? prev + 1 : 0))}
                      className="p-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-2">
                <FileText className="w-10 h-10 text-slate-600" />
                <span className="text-xs font-semibold uppercase tracking-wider">No Graphics Uploaded</span>
              </div>
            )}

            {/* Technical Parameters */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl">
                <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Title Label</span>
                <span className="text-sm font-bold text-white">{post.contentTitle || "Untitled"}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl">
                <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Format Template</span>
                <span className="text-sm font-bold text-white">{post.format || "N/A"}</span>
              </div>
            </div>

            {/* Copysheet Caption Editor / View */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Broadcast Caption / Description</label>
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-medium text-slate-300 min-h-[120px] whitespace-pre-wrap leading-relaxed select-all selection:bg-indigo-500 selection:text-white">
                {post.caption || <span className="text-slate-600 italic">No broadcast caption configured for this campaign block.</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Right Hand: Action & Hand-off Panel */}
        <section className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" /> Authorization Gateway
            </h3>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white tracking-tight">Supervisor Verification Check</h2>
              <p className="text-xs font-medium leading-relaxed text-slate-400">
                This transaction marks the transfer of ownership of this campaign to the subscriber outreach system. After authorization, contents will be distributed via Google/Gmail services.
              </p>
            </div>

            {/* Current Broadcast Detail Info */}
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mailing Status:</span>
                <span className="font-extrabold uppercase text-indigo-400 tracking-wider">
                  {mailStatus.replace('_', ' ')}
                </span>
              </div>
              {post.mailScheduledTime && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Scheduled Outgoing:</span>
                  <span className="font-bold text-amber-400">{new Date(post.mailScheduledTime).toLocaleString()}</span>
                </div>
              )}
              {post.mailSentTime && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Authorization Timestamp:</span>
                  <span className="font-bold text-emerald-400">
                    {post.mailSentTime.toDate ? post.mailSentTime.toDate().toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons list */}
            <div className="space-y-3 pt-4">
              {/* Button: Authorize Now */}
              <button 
                onClick={handleAuthorizeNow}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-black tracking-widest uppercase text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Authorize & Broadcast Now
              </button>

              {/* Button & Panel: Schedule */}
              {!showScheduler ? (
                <button 
                  onClick={() => setShowScheduler(true)}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black tracking-widest uppercase text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700/50"
                >
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Schedule Specific Time
                </button>
              ) : (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Choose Delivery Time</span>
                  <input 
                    type="datetime-local" 
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowScheduler(false)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAuthorizeScheduled}
                      className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Save Schedule
                    </button>
                  </div>
                </div>
              )}

              {/* Button: Cancel Mailing */}
              <button 
                onClick={handleCancelMailing}
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-rose-400 hover:text-rose-500 hover:bg-rose-500/5 font-black tracking-widest uppercase text-xs rounded-xl border border-slate-800 hover:border-rose-500/30 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancel Distribution
              </button>
            </div>

            {/* Tiny Footer Notice */}
            <p className="text-[10px] text-center text-slate-500 leading-normal">
              Any action successfully updates the content planner index to maintain record keeping across endpoints. Click "Portal" in the header to return to the monthly planner timeline.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
};
