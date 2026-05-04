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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, RefreshCw, Users as UsersIcon, UserCog, Upload } from 'lucide-react';
import { RoleManager } from './RoleManager';

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
  onUpdateGovernanceSettings
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
  isSeeding: boolean
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'links'>('users');
  const [localSettings, setLocalSettings] = useState(notificationSettings);
  const [localGovernanceSettings, setLocalGovernanceSettings] = useState(governanceSettings);
  const [localExportSettings, setLocalExportSettings] = useState(exportSettings);
  const [localQuickLinks, setLocalQuickLinks] = useState(quickLinks || []);
  const [localSocialLinks, setLocalSocialLinks] = useState(socialLinks);

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

  const tabs = [
    { id: 'users', label: 'User Operations', icon: <UserCog className="w-4 h-4" /> },
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
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700 /50'
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
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-black/5 dark:border-white/5 shadow-sm overflow-hidden min-h-[600px] transition-colors duration-300">
                <RoleManager addNotification={addNotification} />
              </div>
            </motion.div>
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
                        { key: 'onTaskDeleted', label: 'Task Deleted', desc: 'Notify when a task is permanently removed' }
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
