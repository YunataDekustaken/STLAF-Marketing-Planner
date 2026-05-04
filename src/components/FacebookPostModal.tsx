import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Facebook, 
  Send, 
  Calendar, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useFacebookPost } from '../hooks/useFacebookPost';

import { Post } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface FacebookPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onSuccess?: (postId: string, fbStatus: 'posted' | 'scheduled') => void;
}

const FB_CHAR_LIMIT = 63206;

export function FacebookPostModal({ isOpen, onClose, post, onSuccess }: FacebookPostModalProps) {
  const [caption, setCaption] = useState(post?.caption || '');
  const [creatives, setCreatives] = useState<string[]>(post?.creatives || []);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const { postToFacebook, isLoading, error, success, postId, resetStatus } = useFacebookPost();

  useEffect(() => {
    if (isOpen && post) {
      setCaption(post.caption || '');
      setCreatives(post.creatives || []);
      resetStatus();
      setValidationError(null);
      setShowScheduler(false);
      setScheduleDate('');
      setScheduleTime('');
    }
  }, [isOpen, post]);

  const updatePostStatus = async (fbPostId: string, fbStatus: 'posted' | 'scheduled', timeStr?: string) => {
    if (!post) return;
    try {
      const postRef = doc(db, 'posts', post.id);
      const updateData: any = {
        fbStatus,
        fbPostId,
        status: fbStatus === 'scheduled' ? 'Scheduled' : 'Published',
        updatedAt: serverTimestamp()
      };

      if (fbStatus === 'scheduled') {
        updateData.fbScheduledTime = timeStr || null;
      } else {
        updateData.fbPublishedTime = new Date().toISOString();
      }

      await updateDoc(postRef, updateData);
    } catch (err) {
      console.error("Error updating post status in Firestore:", err);
    }
  };

  const handlePostNow = async () => {
    setValidationError(null);
    await postToFacebook({
      message: caption,
      mediaUrls: creatives
    });
  };

  const handleSchedule = async () => {
    setValidationError(null);
    if (!scheduleDate || !scheduleTime) {
      setValidationError("Please select both date and time for scheduling.");
      return;
    }
    
    const dateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const unixTimestamp = Math.floor(dateTime.getTime() / 1000);
    
    // Facebook requires scheduled time to be between 10 minutes and 75 days in the future
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const minTime = nowTimestamp + 600; // 10 mins
    
    if (unixTimestamp < minTime) {
      setValidationError("Scheduled time must be at least 10 minutes in the future.");
      return;
    }

    await postToFacebook({
      message: caption,
      mediaUrls: creatives,
      scheduleTime: unixTimestamp
    });
  };

  useEffect(() => {
    if (success && postId && post) {
      const fbStatus = showScheduler ? 'scheduled' : 'posted';
      const fbScheduledTime = showScheduler ? `${scheduleDate}T${scheduleTime}` : undefined;
      updatePostStatus(postId, fbStatus, fbScheduledTime);
      if (onSuccess) {
        onSuccess(postId, fbStatus);
      }
    }
  }, [success, postId]);

  const removeCreative = (index: number) => {
    setCreatives(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center text-white shadow-sm ring-4 ring-[#1877F2]/10">
                <Facebook className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 tracking-tight">Post to Facebook</h3>
                <p className="text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Facebook Page Integration</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-black text-slate-800">Successfully Posted!</h4>
                <p className="text-slate-500 max-w-xs">Your content has been {showScheduler ? 'scheduled' : 'published'} to your Facebook Page.</p>
                
                {postId && (
                  <a 
                    href={`https://facebook.com/${postId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-[#1877F2] text-white rounded-xl font-bold text-sm hover:bg-[#0e63d1] transition-all shadow-lg shadow-blue-200 mt-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Facebook
                  </a>
                )}
                
                <button 
                  onClick={onClose}
                  className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Caption Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Caption / Message</label>
                    <span className={`text-[10px] font-bold ${caption.length > FB_CHAR_LIMIT ? 'text-red-500' : 'text-slate-400'}`}>
                      {caption.length.toLocaleString()} / {FB_CHAR_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full min-h-[160px] p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-[#1877F2] transition-all outline-none text-slate-700 resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Media Preview */}
                {creatives && creatives.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Attached Media ({creatives.length})</label>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar p-1">
                      {creatives.map((url, idx) => (
                        <div key={idx} className="relative group overflow-hidden rounded-xl border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
                          <img 
                            src={url} 
                            alt={`Post media ${idx}`} 
                            className="w-full h-full object-cover"
                          />
                          <button 
                            onClick={() => removeCreative(idx)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {(error || validationError) && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-800">
                        {validationError ? 'Validation Error' : 'Posting Error'}
                      </p>
                      <p className="text-xs text-rose-600/80 font-medium leading-relaxed">
                        {validationError || error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Scheduling */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setShowScheduler(!showScheduler)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showScheduler ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Clock className="w-4 h-4" />
                      {showScheduler ? 'Change to Post Now' : 'Schedule for later'}
                    </button>
                  </div>

                  {showScheduler && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pl-1">Date</label>
                          <input 
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest pl-1">Time</label>
                          <input 
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>
                      <div className="px-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Detected Timezone: <span className="font-bold text-slate-500 uppercase">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                        </div>
                        <p>Times are scheduled based on your local time.</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!success && (
            <div className="px-6 py-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              
              {showScheduler ? (
                <button 
                  onClick={handleSchedule}
                  disabled={isLoading || !caption || caption.length > FB_CHAR_LIMIT || !scheduleDate || !scheduleTime}
                  className="flex-[2] py-3.5 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-2xl font-bold text-sm transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Schedule Post
                    </>
                  )}
                </button>
              ) : (
                <button 
                  onClick={handlePostNow}
                  disabled={isLoading || !caption || caption.length > FB_CHAR_LIMIT}
                  className="flex-[2] py-3.5 bg-[#1877F2] hover:bg-[#0e63d1] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Post Now
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
