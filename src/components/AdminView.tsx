import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  X,
  FolderOpen,
  Info,
  Bell,
  Mail,
  Zap,
  History,
  ExternalLink,
  Download,
  ClipboardList,
  Facebook,
  Instagram,
  Linkedin,
  CheckCircle2,
  Clock,
  Check,
  Music2,
  Shield,
  Lock,
  MessageSquare,
  Send,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, RefreshCw, Users as UsersIcon, UserCog, Upload, Mail as MailIcon } from 'lucide-react';
import { RoleManager } from './RoleManager';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export const AdminView = ({ 
  notificationSettings,
  onUpdateNotificationSettings,
  exportSettings,
  onUpdateExportSettings,
  addNotification,
  quickLinks,
  onUpdateQuickLinks,
  socialLinks,
  onUpdateSocialLinks,
  onRestore,
  isSeeding,
  governanceSettings,
  onUpdateGovernanceSettings,
  profile,
  pendingConcernsCount
}: { 
  notificationSettings: any,
  onUpdateNotificationSettings: (settings: any) => void,
  governanceSettings: any,
  onUpdateGovernanceSettings: (settings: any) => void,
  exportSettings: any,
  onUpdateExportSettings: (settings: any) => void,
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void,
  quickLinks: {id: string, name: string, url: string}[],
  onUpdateQuickLinks: (links: {id: string, name: string, url: string}[]) => void,
  socialLinks: { facebook: string, instagram: string, linkedin: string, tiktok: string },
  onUpdateSocialLinks: (links: any) => void,
  onRestore: () => void,
  isSeeding: boolean,
  profile: any,
  pendingConcernsCount?: number
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'concerns' | 'links' | 'settings'>('users');
  const [localSettings, setLocalSettings] = useState(notificationSettings);
  const [localGovernanceSettings, setLocalGovernanceSettings] = useState(governanceSettings);
  const [localExportSettings, setLocalExportSettings] = useState(exportSettings);
  const [localQuickLinks, setLocalQuickLinks] = useState(quickLinks || []);
  const [localSocialLinks, setLocalSocialLinks] = useState(socialLinks);
  const [concerns, setConcerns] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedConcernId, setExpandedConcernId] = useState<string | null>(null);

  const [isUpdatingLinks, setIsUpdatingLinks] = useState(false);
  const [showLinksConfirm, setShowLinksConfirm] = useState(false);
  const [linksUpdateSuccess, setLinksUpdateSuccess] = useState(false);

  useEffect(() => {
    setLocalSettings(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    setLocalGovernanceSettings(governanceSettings);
  }, [governanceSettings]);

  useEffect(() => {
    setLocalExportSettings(exportSettings);
  }, [exportSettings]);

  useEffect(() => {
    if (quickLinks) setLocalQuickLinks(quickLinks);
  }, [quickLinks]);

  useEffect(() => {
    setLocalSocialLinks(socialLinks);
  }, [socialLinks]);

  useEffect(() => {
    const q = query(
      collection(db, 'concerns'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConcerns(entries);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateQuickLinks = async () => {
    setIsUpdatingLinks(true);
    try {
      await onUpdateQuickLinks(localQuickLinks);
      setLinksUpdateSuccess(true);
      addNotification('Links Updated', 'Quick links have been updated successfully.', 'success');
      setTimeout(() => setLinksUpdateSuccess(false), 3000);
      setShowLinksConfirm(false);
    } catch (error) {
      addNotification('Update Failed', 'There was an error updating the quick links.', 'warning');
    } finally {
      setIsUpdatingLinks(false);
    }
  };

  const handleSaveSettings = () => {
    onUpdateNotificationSettings(localSettings);
    addNotification('Settings Updated', 'Notification settings have been updated successfully.', 'success');
  };

  const handleSaveGovernanceSettings = () => {
    onUpdateGovernanceSettings(localGovernanceSettings);
    addNotification('Governance Updated', 'System governance settings have been updated.', 'success');
  };

  const handleSendReply = async (concernId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const newMessage = {
        text: replyText.trim(),
        senderId: profile?.uid || 'supervisor',
        senderName: profile?.displayName || profile?.email || 'Supervisor',
        role: 'supervisor',
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'concerns', concernId), {
        messages: arrayUnion(newMessage),
        status: 'reviewed'
      });
      toast.success("Reply sent successfully.");
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const tabs = [
    { id: 'users', label: 'User Operations', icon: <UserCog className="w-4 h-4" /> },
    { id: 'concerns', label: 'User Concerns', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'links', label: 'Quick Links', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'settings', label: 'System Settings', icon: <Zap className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="space-y-8">
      {/* Admin Tab Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-end">
          <div className="hidden md:flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors duration-300">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'concerns' && pendingConcernsCount !== undefined && pendingConcernsCount > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                    {pendingConcernsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="space-y-8"
        >
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden min-h-[600px] transition-colors duration-300">
                <RoleManager addNotification={addNotification} />
              </div>
            </motion.div>
          )}

          {activeTab === 'concerns' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm transition-colors duration-300 overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent User Concerns</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Messages submitted by users via the Help & Support tab.</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total: {concerns.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {concerns.length === 0 ? (
                    <div className="p-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MailIcon className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold">No concerns reported yet.</p>
                    </div>
                  ) : (
                    concerns.map(item => {
                      const userInitial = (item.userName || item.userEmail || 'U').charAt(0).toUpperCase();
                      const isExpanded = expandedConcernId === item.id;
                      const hasMessages = item.messages && item.messages.length > 0;
                      const lastMessagePreview = hasMessages 
                        ? item.messages[item.messages.length - 1].text 
                        : (item.message || 'No messages yet');

                      return (
                        <div 
                          key={item.id} 
                          className={`border-b last:border-0 border-slate-100 dark:border-slate-800 transition-all ${
                            isExpanded ? 'bg-slate-50/50 dark:bg-slate-800/40 shadow-inner' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20'
                          }`}
                        >
                          {/* Minimized Header / Toggle */}
                          <div 
                            onClick={() => setExpandedConcernId(isExpanded ? null : item.id)}
                            className="p-6 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg shadow-sm shrink-0">
                                {userInitial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                                    {item.userName || item.userEmail}
                                  </h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                    item.status === 'resolved' 
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-md">
                                    {item.subject ? <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2 italic">{item.subject}:</span> : ''}
                                    {lastMessagePreview}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 self-end lg:self-center">
                              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Now'}
                              </div>
                              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                <Plus className={`w-4 h-4 transition-transform ${isExpanded ? 'active:rotate-45' : ''}`} />
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-8 pb-8 pl-[72px]">
                                  <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {/* Action Buttons Hub */}
                                    <div className="flex items-center justify-between gap-4 py-2">
                                       <div className="flex items-center gap-3">
                                          {item.status !== 'resolved' && (
                                            <button 
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                  await updateDoc(doc(db, 'concerns', item.id), { status: 'resolved' });
                                                  toast.success("Concern marked as resolved.");
                                                } catch (err) {
                                                  toast.error("Failed to update status.");
                                                }
                                              }}
                                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                                            >
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              Mark Resolved
                                            </button>
                                          )}
                                       </div>
                                       
                                       <div className="flex items-center gap-2">
                                          {isDeleting === item.id ? (
                                            <div className="flex items-center gap-1 p-1 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
                                              <button 
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  try {
                                                    await deleteDoc(doc(db, 'concerns', item.id));
                                                    toast.success("Record deleted.");
                                                    setIsDeleting(null);
                                                  } catch (err) {
                                                    toast.error("Failed to delete.");
                                                  }
                                                }}
                                                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setIsDeleting(null);
                                                }}
                                                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIsDeleting(item.id);
                                              }}
                                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                                              title="Delete Thread"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          )}
                                       </div>
                                    </div>

                                    {/* Message History */}
                                    <div className="space-y-4">
                                      {item.subject && (
                                        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                                          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 italic">Subject</p>
                                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.subject}</p>
                                        </div>
                                      )}
                                      
                                      {!item.messages && item.message && (
                                        <div className="flex justify-start">
                                          <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative">
                                            <div className="absolute -left-1.5 top-4 w-3 h-3 bg-slate-100 dark:bg-slate-800 rotate-45" />
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Initial Request</span>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed">{item.message}</p>
                                          </div>
                                        </div>
                                      )}
                                      {(item.messages || []).map((msg: any, idx: number) => (
                                        <div key={idx} className={`flex ${msg.role === 'supervisor' ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 relative ${
                                            msg.role === 'supervisor' 
                                              ? 'bg-indigo-600 text-white shadow-md' 
                                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700'
                                          }`}>
                                            {msg.role === 'supervisor' ? (
                                              <div className="absolute -right-1.5 top-4 w-3 h-3 bg-indigo-600 rotate-45" />
                                            ) : (
                                              <div className="absolute -left-1.5 top-4 w-3 h-3 bg-white dark:bg-slate-800 border-l border-t border-slate-100 dark:border-slate-700 rotate-45" />
                                            )}
                                            <div className="flex items-center gap-4 mb-2">
                                              <span className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'supervisor' ? 'text-white/70' : 'text-slate-400'}`}>
                                                {msg.role === 'supervisor' ? 'You (Supervisor)' : (msg.senderName || item.userName || 'User')}
                                              </span>
                                              <span className={`text-[9px] ml-auto ${msg.role === 'supervisor' ? 'text-white/50' : 'text-slate-400/50'}`}>
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                              </span>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed tracking-tight break-words">{msg.text}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Reply Area */}
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                      {item.status !== 'resolved' ? (
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-indigo-500/10 p-4 shadow-sm space-y-4">
                                          <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder={`Message ${item.userName || 'user'}...`}
                                            className="w-full h-24 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm outline-none transition-all resize-none font-medium text-slate-900 dark:text-slate-100"
                                          />
                                          <div className="flex justify-end">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReply(item.id);
                                              }}
                                              disabled={isSubmittingReply || !replyText.trim()}
                                              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                            >
                                              {isSubmittingReply ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                              Send Message
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thread Resolved</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Notification Settings Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <Bell className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Notification Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
                  {/* System Events */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Events</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'onExportCSV', label: 'Export CSV', desc: 'Notify when CSV export is completed' },
                        { key: 'onNewTask', label: 'New Task Created', desc: 'Notify when a new content task is added' },
                        { key: 'onTaskDeleted', label: 'Task Deleted', desc: 'Notify when a task is permanently removed' },
                        { key: 'onNewConcern', label: 'Support Concerns', desc: 'Notify when a new user concern is submitted' },
                        { key: 'onNewSupportMessage', label: 'Support Chats', desc: 'Notify on new messages in support threads' },
                        { key: 'onDeletionRequest', label: 'Deletion Requests', desc: 'Notify when users request to delete Hub or Facebook posts' },
                        { key: 'onApprovalRequired', label: 'Approvals Required', desc: 'Notify when posts or AI content need supervisor approval' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                          </div>
                          <button 
                            onClick={() => setLocalSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localSettings?.[item.key] ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localSettings?.[item.key] ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Updates */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status Updates</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'onStatusScheduled', label: 'Scheduled', desc: 'Notify when content is marked as Scheduled' },
                        { key: 'onStatusReadyForReview', label: 'Ready for Review', desc: 'Notify when content is ready for approval' },
                        { key: 'onAICaption', label: 'AI Generation', desc: 'Notify when AI caption generation is finished' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.label}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                          </div>
                          <button 
                            onClick={() => setLocalSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localSettings?.[item.key] ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localSettings?.[item.key] ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleSaveSettings}
                  className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark dark:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Save Notification Settings
                </button>
              </div>

              {/* System Governance Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <Shield className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">System Governance</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between group">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Supervisor Deletion Only
                        <Lock className="w-3.5 h-3.5 text-rose-500" />
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">When active, only users with 'Marketing Supervisor' role can delete content tasks or posts from the hub</p>
                    </div>
                    <button 
                      onClick={() => setLocalGovernanceSettings(prev => ({ ...prev, restrictDeletionToSupervisor: !prev.restrictDeletionToSupervisor }))}
                      className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localGovernanceSettings?.restrictDeletionToSupervisor ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localGovernanceSettings?.restrictDeletionToSupervisor ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between group pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Approval Required for Deletion
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Regular users can request deletion, but a Supervisor must approve it before removal.</p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold italic mt-1 leading-tight">Note: Supervisors are exempt and delete directly.</p>
                    </div>
                    <button 
                      onClick={() => setLocalGovernanceSettings(prev => ({ ...prev, requireDeletionApproval: !prev.requireDeletionApproval }))}
                      className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localGovernanceSettings?.requireDeletionApproval ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localGovernanceSettings?.requireDeletionApproval ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between group pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Approval Required for Facebook Deletion
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Regular users must request permission from a Supervisor to delete posts from Facebook.</p>
                    </div>
                    <button 
                      onClick={() => setLocalGovernanceSettings(prev => ({ ...prev, requireFacebookDeletionApproval: !prev.requireFacebookDeletionApproval }))}
                      className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localGovernanceSettings?.requireFacebookDeletionApproval ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localGovernanceSettings?.requireFacebookDeletionApproval ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <button 
                    onClick={handleSaveGovernanceSettings}
                    className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    Save Governance Settings
                  </button>
                </div>
              </div>

              {/* CSV Export Settings Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">CSV Export Configuration</h3>
                </div>

                <div className="mb-8">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
                    Select which columns should be included in the CSV export and import template:
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { key: 'date', label: 'Date' },
                      { key: 'contentTitle', label: 'Title' },
                      { key: 'contentType', label: 'Type' },
                      { key: 'topicTheme', label: 'Theme' },
                      { key: 'subtopic', label: 'Subtopic' },
                      { key: 'caption', label: 'Caption' },
                      { key: 'format', label: 'Format' },
                      { key: 'status', label: 'Status' },
                      { key: 'funnelStatus', label: 'Funnel' },
                      { key: 'visualIdeas', label: 'Visual Ideas' },
                      { key: 'notes', label: 'Notes' },
                      { key: 'approvalStatus', label: 'Approval' }
                    ].map(item => (
                      <label 
                        key={item.key} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          localExportSettings?.[item.key] 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100' 
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                          localExportSettings?.[item.key] ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {localExportSettings?.[item.key] && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={localExportSettings?.[item.key] || false}
                          onChange={() => setLocalExportSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        />
                        <span className="text-sm font-bold">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    onUpdateExportSettings(localExportSettings);
                    addNotification('Export Settings Updated', 'CSV export configuration has been saved.', 'success');
                  }}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Save Export Configuration
                </button>
              </div>

              {/* Social Redirection Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <ExternalLink className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Social Media Redirection Links</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Facebook className="w-3 h-3 text-[#1877F2]" />
                      Facebook URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.facebook}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Instagram className="w-3 h-3 text-[#E4405F]" />
                      Instagram URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.instagram}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                      LinkedIn URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.linkedin}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Music2 className="w-3 h-3 text-slate-900 dark:text-slate-100" />
                      TikTok URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.tiktok || ''}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, tiktok: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => onUpdateSocialLinks(localSocialLinks)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Save Social Links
                </button>
              </div>

              {/* Restore Database Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Restore Old Database</h3>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl text-sm">
                  Permanently deletes all marketing requests, comments, activity logs, and notifications. 
                  User accounts and login credentials are not affected. Uploaded files are hosted in Cloudinary, not Firestore.
                </p>

                <button 
                  onClick={onRestore}
                  disabled={isSeeding}
                  className="px-8 py-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/30 rounded-xl text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSeeding ? 'Restoring...' : 'Restore Data'}
                </button>
              </div>

              {/* App Info Block */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <Info className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">App Info</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Application Name</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Marketing Operations Portal</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Firebase Project ID</p>
                      <p className="text-sm font-mono text-slate-600 dark:text-slate-400">gen-lang-client-0116256991</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs italic text-slate-400 dark:text-slate-500">Settings are only accessible to Marketing Supervisors.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <ExternalLink className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Quick Links Management</h3>
              </div>
              
              <div className="space-y-4">
                {localQuickLinks.map((link, index) => (
                  <div key={link.id} className="flex flex-col md:flex-row gap-4 items-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Link Name</label>
                      <input 
                        type="text" 
                        value={link.name}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].name = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="e.g. Brand Guidelines"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex-[2] w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">URL</label>
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].url = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <button 
                      onClick={() => setLocalQuickLinks(prev => prev.filter((_, i) => i !== index))}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Remove Link"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => setLocalQuickLinks(prev => [...prev, { id: Date.now().toString(), name: '', url: '#' }])}
                  className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold tracking-tight">Add New Link</span>
                </button>
              </div>
              
              <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
                {!showLinksConfirm ? (
                  <button 
                    onClick={() => setShowLinksConfirm(true)}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark dark:text-slate-900 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                  >
                    {linksUpdateSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Links Updated
                      </>
                    ) : (
                      'Update Quick Links'
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors duration-300">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-4">Confirm changes?</span>
                    <button 
                      onClick={handleUpdateQuickLinks}
                      disabled={isUpdatingLinks}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isUpdatingLinks ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Yes, Save
                    </button>
                    <button 
                      onClick={() => setShowLinksConfirm(false)}
                      className="px-6 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 rounded-lg text-sm font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                
                {linksUpdateSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-600 font-bold text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    Successfully updated!
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
