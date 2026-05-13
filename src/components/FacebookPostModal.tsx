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
  Clock,
  Trash2,
  PencilLine,
  Save
} from 'lucide-react';
import { useFacebookPost } from '../hooks/useFacebookPost';

import { useInstagramPost } from '../hooks/useInstagramPost';
import { Post } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { auth } from '../firebase';
import { ConfirmationModal } from './ConfirmationModal';
import { NotificationToast } from './NotificationToast';

interface FacebookPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  onSuccess?: (postId: string, fbStatus: 'posted' | 'scheduled') => void;
  handleDeleteFromFB?: (post: Post) => Promise<'deleted' | 'requested' | 'denied' | 'error'>;
  handleCancelDeletionRequest?: (id: string, type: 'hub' | 'facebook') => Promise<void>;
  userRole?: string;
  governanceSettings?: {
    requireFacebookDeletionApproval: boolean;
  };
}

const FB_CHAR_LIMIT = 63206;

export function FacebookPostModal({ isOpen, onClose, post, onSuccess, handleDeleteFromFB, handleCancelDeletionRequest, userRole, governanceSettings }: FacebookPostModalProps) {
  const [caption, setCaption] = useState(post?.caption || '');
  const [creatives, setCreatives] = useState<string[]>(post?.creatives || []);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [postToFB, setPostToFB] = useState(true);
  const [postToIG, setPostToIG] = useState(false);

  const isAlreadyPublished = post?.fbStatus === 'posted' && post?.fbPostId;
  const isAlreadyScheduled = post?.fbStatus === 'scheduled' && post?.fbPostId;
  
  const { postToFacebook, deleteFacebookPost, updateFacebookPost, isLoading: isFBLoading, error: fbError, success: fbSuccess, postId: fbPostIdRes, resetStatus: resetFBStatus } = useFacebookPost();
  const { postToInstagram, isLoading: isIGLoading, error: igError, success: igSuccess, postId: igPostIdRes, resetStatus: resetIGStatus } = useInstagramPost();

  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  const isLoading = isFBLoading || isIGLoading;
  const error = fbError || igError;
  const success = (postToFB ? fbSuccess : true) && (postToIG ? igSuccess : true) && (postToFB || postToIG);
  const postId = fbPostIdRes || igPostIdRes; // Just for UI linking, preferring FB if both

  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    if (isOpen && post) {
      setCaption(post.caption || '');
      setCreatives(post.creatives || []);
      resetFBStatus();
      resetIGStatus();
      setValidationError(null);
      setShowScheduler(false);
      setScheduleDate('');
      setScheduleTime('');
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
      setIsEditingCaption(false);
      setEditedCaption(post.caption || '');
      setPostToFB(!post.fbPostId); // Default true if not already posted
      setPostToIG(false); // Default false initially
    }
  }, [isOpen, post]);

  const updatePostStatus = async (fbPostId: string | null, igPostId: string | null, fbStatus: 'posted' | 'scheduled', timeStr?: string) => {
    if (!post) return;
    try {
      const postRef = doc(db, 'posts', post.id);
      const updateData: any = {
        fbStatus,
        caption,
        creatives,
        status: fbStatus === 'scheduled' ? 'Scheduled' : 'Published',
        updatedAt: serverTimestamp()
      };

      if (fbPostId) updateData.fbPostId = fbPostId;
      if (igPostId) updateData.igPostId = igPostId;

      if (fbStatus === 'scheduled') {
        updateData.fbScheduledTime = timeStr || null;
      } else {
        updateData.fbPublishedTime = new Date().toISOString();
      }

      await updateDoc(postRef, updateData);

      // Log to history
      await addDoc(collection(db, 'history'), {
        postId: post.id,
        contentTitle: post.topicTheme || post.contentTitle,
        action: fbStatus === 'scheduled' ? 'schedule' : 'manual_publish',
        platform: postToFB && postToIG ? 'meta' : (postToFB ? 'facebook' : 'instagram'),
        timestamp: serverTimestamp(),
        userEmail: auth.currentUser?.email || 'unknown',
        userName: auth.currentUser?.displayName || 'Unknown User',
        details: fbStatus === 'scheduled' ? `Scheduled for ${timeStr}` : 'Posted immediately'
      });
    } catch (err) {
      console.error("Error updating post status in Firestore:", err);
    }
  };

  const handlePostNow = async () => {
    setValidationError(null);
    if (!postToFB && !postToIG) {
      setValidationError("Please select at least one platform to post to.");
      return;
    }
    if (postToIG && creatives.length === 0) {
      setValidationError("Instagram requires at least one image or video.");
      return;
    }

    if (postToFB) {
      await postToFacebook({
        message: caption,
        mediaUrls: creatives
      });
    }

    if (postToIG) {
      await postToInstagram({
        message: caption,
        mediaUrls: creatives
      });
    }
  };

  const handleDeleteFromFacebook = async () => {
    if (!post?.fbPostId) return;
    
    // Check governance if handler provided
    if (handleDeleteFromFB) {
      const result = await handleDeleteFromFB(post);
      
      if (result === 'requested') {
        setNotification({
          isOpen: true,
          title: 'Request Submitted',
          message: 'Your deletion request has been sent for supervisor approval.',
          type: 'success'
        });
        setTimeout(onClose, 1500);
        return;
      }
      
      if (result === 'denied' || result === 'error') {
        setIsConfirmDeleteOpen(false);
        return;
      }
    }

    setIsDeleting(true);
    const result = await deleteFacebookPost(post.fbPostId);
    
    if (result) {
      try {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
          fbPostId: null,
          fbStatus: null,
          fbPublishedTime: null,
          fbScheduledTime: null,
          status: 'Not Started', // Revert status
          updatedAt: serverTimestamp()
        });

        // Log to history
        await addDoc(collection(db, 'history'), {
          postId: post.id,
          contentTitle: post.topicTheme || post.contentTitle,
          action: 'delete',
          platform: 'facebook',
          timestamp: serverTimestamp(),
          userEmail: auth.currentUser?.email || 'unknown',
          userName: auth.currentUser?.displayName || 'Unknown User',
          details: 'Deleted post from Facebook Page'
        });

        setNotification({
          isOpen: true,
          title: 'Deleted',
          message: 'Post successfully deleted from Facebook.',
          type: 'success'
        });
        
        setTimeout(() => {
          resetFBStatus();
          onClose();
        }, 1500);
      } catch (err) {
        console.error("Error updating post after deletion:", err);
      }
    } else {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete post from Facebook.',
        type: 'error'
      });
    }
    setIsDeleting(false);
    setIsConfirmDeleteOpen(false);
  };
  
  const handleUpdateCaption = async () => {
    if (!post?.fbPostId) return;
    
    const result = await updateFacebookPost(post.fbPostId, editedCaption);
    
    if (result) {
      try {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, {
          caption: editedCaption,
          updatedAt: serverTimestamp()
        });

        // Log to history
        await addDoc(collection(db, 'history'), {
          postId: post.id,
          contentTitle: post.topicTheme || post.contentTitle,
          action: 'update_caption',
          platform: 'facebook',
          timestamp: serverTimestamp(),
          userEmail: auth.currentUser?.email || 'unknown',
          userName: auth.currentUser?.displayName || 'Unknown User',
          details: 'Updated post caption on Facebook'
        });

        setNotification({
          isOpen: true,
          title: 'Updated',
          message: 'Post caption successfully updated on Facebook.',
          type: 'success'
        });
        
        setCaption(editedCaption);
        setIsEditingCaption(false);
      } catch (err) {
        console.error("Error updating post caption in Firestore:", err);
      }
    } else {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update caption on Facebook.',
        type: 'error'
      });
    }
  };
  
  const handleSchedule = async () => {
    setValidationError(null);
    if (!postToFB && !postToIG) {
      setValidationError("Please select at least one platform to post to.");
      return;
    }
    if (postToIG && creatives.length === 0) {
      setValidationError("Instagram requires at least one image or video.");
      return;
    }
    if (postToIG) {
      setValidationError("Sorry, scheduling for Instagram is not currently supported via this Graph API workflow. Please post now, or schedule only for Facebook.");
      return;
    }
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

    if (postToFB) {
      await postToFacebook({
        message: caption,
        mediaUrls: creatives,
        scheduleTime: unixTimestamp
      });
    }
  };

  useEffect(() => {
    if (success && (fbPostIdRes || igPostIdRes) && post) {
      const fbStatus = showScheduler ? 'scheduled' : 'posted';
      const fbScheduledTime = showScheduler ? `${scheduleDate}T${scheduleTime}` : undefined;
      updatePostStatus(fbPostIdRes, igPostIdRes, fbStatus, fbScheduledTime);
      if (onSuccess) {
        onSuccess(postId || '', fbStatus); // Hack: only returning one postId, but good enough for UI refresh
      }
    }
  }, [success, fbPostIdRes, igPostIdRes]);

  const removeCreative = (index: number) => {
    setCreatives(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        {/* Deletion Confirmation */}
        <ConfirmationModal
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleDeleteFromFacebook}
          title={governanceSettings?.requireFacebookDeletionApproval && userRole !== 'marketing_supervisor' ? "Request FB Removal?" : "Delete from Facebook?"}
          message={governanceSettings?.requireFacebookDeletionApproval && userRole !== 'marketing_supervisor' 
            ? "Your request to remove this post from Facebook will be sent to a Marketing Supervisor for approval." 
            : "Are you sure you want to delete this post from your Facebook page? This action is permanent and cannot be undone."}
          confirmText={governanceSettings?.requireFacebookDeletionApproval && userRole !== 'marketing_supervisor' ? "Send Request" : "Delete Now"}
          isLoading={isDeleting}
        />

        {/* Notifications */}
        <NotificationToast
          isOpen={notification.isOpen}
          onClose={() => setNotification({ ...notification, isOpen: false })}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center text-white shadow-sm ring-4 ring-[#1877F2]/10 transition-all">
                <Facebook className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white tracking-tight">
                  {(isAlreadyPublished || isAlreadyScheduled || success) ? 'Post Details' : 'Post to Facebook'}
                </h3>
                <p className="text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Facebook Page Integration</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {(success || isAlreadyPublished || isAlreadyScheduled) ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-inner ${isAlreadyPublished ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-500'}`}>
                  {isAlreadyPublished ? <CheckCircle2 className="w-12 h-12" /> : <Clock className="w-12 h-12" />}
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-800 dark:text-white">
                    {isAlreadyPublished ? 'Post is Live!' : isAlreadyScheduled ? 'Post is Scheduled' : 'Successfully Posted!'}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {isAlreadyPublished 
                      ? `This content was published to your Facebook Page on ${post?.fbPublishedTime ? new Date(post.fbPublishedTime).toLocaleString() : 'an unknown date'}.` 
                      : isAlreadyScheduled 
                        ? `This post is scheduled for ${post?.fbScheduledTime ? new Date(post.fbScheduledTime).toLocaleString() : 'the future'}.`
                        : `Your content has been ${showScheduler ? 'scheduled' : 'published'} successfully.`
                    }
                  </p>
                </div>
                
                {/* Simplified Post Preview in View Mode */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-left transition-colors duration-300 text-slate-900 dark:text-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caption</span>
                    {!isEditingCaption && (
                      <button 
                        onClick={() => setIsEditingCaption(true)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-[#1877F2] transition-all"
                        title="Edit Caption"
                      >
                        <PencilLine className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isEditingCaption ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className="w-full min-h-[120px] p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-[#1877F2] transition-all outline-none text-sm text-slate-700 dark:text-slate-100 resize-none font-medium leading-relaxed"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleUpdateCaption}
                          disabled={isLoading || editedCaption === caption}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1877F2] text-white rounded-lg text-xs font-bold hover:bg-[#0e63d1] transition-all disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save Changes
                        </button>
                        <button 
                          onClick={() => {
                            setIsEditingCaption(false);
                            setEditedCaption(caption);
                          }}
                          disabled={isLoading}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 mb-3 leading-relaxed">{caption}</p>
                  )}

                  {creatives.length > 0 && !isEditingCaption && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {creatives.map((url, i) => (
                        <img key={i} src={url} className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0" alt="" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full">
                  {(postId || post?.fbPostId) && (
                    <a 
                      href={`https://facebook.com/${postId || post?.fbPostId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1877F2] text-white rounded-xl font-bold text-sm hover:bg-[#0e63d1] transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Facebook
                    </a>
                  )}

                  {(isAlreadyPublished || isAlreadyScheduled) && (
                    <div className="flex flex-col gap-2 w-full">
                      <button 
                        onClick={() => setIsConfirmDeleteOpen(true)}
                        disabled={isDeleting || (post?.facebookDeletionRequested && userRole !== 'marketing_supervisor')}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-200 dark:border-rose-800 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {governanceSettings?.requireFacebookDeletionApproval && userRole !== 'marketing_supervisor' 
                          ? (post?.facebookDeletionRequested ? 'Removal Pending Approval' : 'Request FB Removal') 
                          : 'Delete from Facebook'}
                      </button>
                      
                      {post?.facebookDeletionRequested && userRole !== 'marketing_supervisor' && (
                        <button 
                          onClick={() => handleCancelDeletionRequest?.(post.id, 'facebook')}
                          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                        >
                          <X className="w-4 h-4" />
                          Cancel Removal Request
                        </button>
                      )}
                    </div>
                  )}
                  
                  <button 
                    onClick={onClose}
                    className="px-6 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Platform Selection */}
                <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Publish To</label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${postToFB ? 'bg-[#1877F2] border-[#1877F2]' : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-[#1877F2]/50'}`}>
                        {postToFB && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={postToFB} onChange={(e) => setPostToFB(e.target.checked)} />
                      <div className="flex items-center gap-2">
                        <Facebook className="w-4 h-4 text-[#1877F2]" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Facebook Page</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${postToIG ? 'bg-pink-500 border-pink-500' : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-pink-500/50'}`}>
                        {postToIG && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={postToIG} onChange={(e) => setPostToIG(e.target.checked)} />
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white flex items-center justify-center font-serif font-black text-[10px] leading-none shrink-0" style={{fontFamily: 'Instagram Sans, sans-serif'}}>Ig</div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Instagram Business</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Caption Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Caption / Message</label>
                    <span className={`text-[10px] font-bold ${caption.length > FB_CHAR_LIMIT ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {caption.length.toLocaleString()} / {FB_CHAR_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full min-h-[160px] p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-[#1877F2] transition-all outline-none text-slate-700 dark:text-slate-100 resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Media Preview & Upload */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Attached Media ({creatives.length})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="direct-image-upload"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            Array.from(files).forEach((file: File) => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                setCreatives(prev => [...prev, base64]);
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                      />
                      <label 
                        htmlFor="direct-image-upload"
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-[#1877F2] rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer border border-blue-100 dark:border-blue-800"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Add Image
                      </label>
                    </div>
                  </div>

                  {creatives && creatives.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar p-1">
                      {creatives.map((url, idx) => (
                        <div key={idx} className="relative group overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 aspect-video flex items-center justify-center">
                          <img 
                            src={url} 
                            alt={`Post media ${idx}`} 
                            className="w-full h-full object-cover"
                          />
                          <button 
                            onClick={() => removeCreative(idx)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-lg flex items-center justify-center [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all backdrop-blur-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {(error || validationError) && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                        {validationError ? 'Validation Error' : 'Posting Error'}
                      </p>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400 font-medium leading-relaxed">
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${showScheduler ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
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
                      <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest pl-1">Date</label>
                          <input 
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-200 transition-colors duration-300"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest pl-1">Time</label>
                          <input 
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-200 transition-colors duration-300"
                          />
                        </div>
                      </div>
                      <div className="px-2 flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Detected Timezone: <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
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
          {!(success || isAlreadyPublished || isAlreadyScheduled) && (
            <div className="px-6 py-6 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-colors duration-300">
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              
              {showScheduler ? (
                <button 
                  onClick={handleSchedule}
                  disabled={isLoading || !caption || caption.length > FB_CHAR_LIMIT || !scheduleDate || !scheduleTime}
                  className="flex-[2] py-3.5 bg-amber-500 hover:bg-amber-600 text-primary-dark dark:text-slate-900 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
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
                  className="flex-[2] py-3.5 bg-[#1877F2] hover:bg-[#0e63d1] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
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
