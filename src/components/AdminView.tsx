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
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
  Music2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, RefreshCw, Users as UsersIcon, UserCog, Upload } from 'lucide-react';
import { RoleManager } from './RoleManager';

export const AdminView = ({ 
  notificationSettings,
  onUpdateNotificationSettings,
  addNotification,
  quickLinks,
  onUpdateQuickLinks,
  socialLinks,
  onUpdateSocialLinks,
  onRestore,
  isSeeding
}: { 
  notificationSettings: any,
  onUpdateNotificationSettings: (settings: any) => void,
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void,
  quickLinks: {id: string, name: string, url: string}[],
  onUpdateQuickLinks: (links: {id: string, name: string, url: string}[]) => void,
  socialLinks: { facebook: string, instagram: string, linkedin: string, tiktok: string },
  onUpdateSocialLinks: (links: any) => void,
  onRestore: () => void,
  isSeeding: boolean
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'links'>('users');
  const [localSettings, setLocalSettings] = useState(notificationSettings);
  const [localQuickLinks, setLocalQuickLinks] = useState(quickLinks || []);
  const [localSocialLinks, setLocalSocialLinks] = useState(socialLinks);

  useEffect(() => {
    setLocalSettings(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    if (quickLinks) setLocalQuickLinks(quickLinks);
  }, [quickLinks]);

  useEffect(() => {
    setLocalSocialLinks(socialLinks);
  }, [socialLinks]);

  const handleSaveSettings = () => {
    onUpdateNotificationSettings(localSettings);
    addNotification('Settings Updated', 'Notification settings have been updated successfully.', 'success');
  };

  const tabs = [
    { id: 'users', label: 'User Operations', icon: <UserCog className="w-4 h-4" /> },
    { id: 'links', label: 'Quick Links', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'settings', label: 'System Settings', icon: <Zap className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="space-y-8">
      {/* Admin Tab Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Center</h2>
            <p className="text-slate-500 font-medium">Control the portal experience and manage user access.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                {tab.label}
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
              <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden min-h-[600px]">
                <RoleManager addNotification={addNotification} />
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Notification Settings Block */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <Bell className="w-6 h-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Notification Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
                  {/* System Events */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Events</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'onExportCSV', label: 'Export CSV', desc: 'Notify when CSV export is completed' },
                        { key: 'onNewTask', label: 'New Task Created', desc: 'Notify when a new content task is added' },
                        { key: 'onTaskDeleted', label: 'Task Deleted', desc: 'Notify when a task is permanently removed' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                            <p className="text-[10px] text-slate-500">{item.desc}</p>
                          </div>
                          <button 
                            onClick={() => setLocalSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localSettings?.[item.key] ? 'bg-amber-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${localSettings?.[item.key] ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Updates */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Updates</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'onStatusScheduled', label: 'Scheduled', desc: 'Notify when content is marked as Scheduled' },
                        { key: 'onStatusReadyForReview', label: 'Ready for Review', desc: 'Notify when content is ready for approval' },
                        { key: 'onAICaption', label: 'AI Generation', desc: 'Notify when AI caption generation is finished' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between group">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                            <p className="text-[10px] text-slate-500">{item.desc}</p>
                          </div>
                          <button 
                            onClick={() => setLocalSettings((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))}
                            className={`shrink-0 w-10 h-5 rounded-full relative transition-all duration-300 ${localSettings?.[item.key] ? 'bg-amber-500' : 'bg-slate-200'}`}
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
                  className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  Save Notification Settings
                </button>
              </div>

              {/* Social Redirection Block */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <ExternalLink className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Social Media Redirection Links</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Facebook className="w-3 h-3 text-[#1877F2]" />
                      Facebook URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.facebook}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Instagram className="w-3 h-3 text-[#E4405F]" />
                      Instagram URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.instagram}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                      LinkedIn URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.linkedin}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Music2 className="w-3 h-3 text-slate-900" />
                      TikTok URL
                    </label>
                    <input 
                      type="url" 
                      value={localSocialLinks.tiktok || ''}
                      onChange={(e) => setLocalSocialLinks(prev => ({ ...prev, tiktok: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
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
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-rose-50 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Restore Old Database</h3>
                </div>
                
                <p className="text-slate-600 mb-8 leading-relaxed max-w-2xl text-sm">
                  Permanently deletes all marketing requests, comments, activity logs, and notifications. 
                  User accounts and login credentials are not affected. Uploaded files are hosted in Cloudinary, not Firestore.
                </p>

                <button 
                  onClick={onRestore}
                  disabled={isSeeding}
                  className="px-8 py-3 bg-white border border-rose-200 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSeeding ? 'Restoring...' : 'Restore Data'}
                </button>
              </div>

              {/* App Info Block */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <Info className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">App Info</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Application Name</p>
                      <p className="text-sm font-bold text-slate-900">Marketing Operations Portal</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Firebase Project ID</p>
                      <p className="text-sm font-mono text-slate-600">gen-lang-client-0116256991</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs italic text-slate-400">Admin Center is only accessible to Marketing Supervisors.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <ExternalLink className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Quick Links Management</h3>
              </div>
              
              <div className="space-y-4">
                {localQuickLinks.map((link, index) => (
                  <div key={link.id} className="flex flex-col md:flex-row gap-4 items-end p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link Name</label>
                      <input 
                        type="text" 
                        value={link.name}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].name = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="e.g. Brand Guidelines"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div className="flex-[2] w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL</label>
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].url = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setLocalQuickLinks(prev => prev.filter((_, i) => i !== index))}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Link"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => setLocalQuickLinks(prev => [...prev, { id: Date.now().toString(), name: '', url: '#' }])}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold tracking-tight">Add New Link</span>
                </button>
              </div>
              
              <button 
                onClick={() => onUpdateQuickLinks(localQuickLinks)}
                className="mt-8 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Update Quick Links
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
