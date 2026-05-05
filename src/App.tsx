/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent, Dispatch, SetStateAction } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Send,
  Edit2, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  FileText,
  Layout,
  X,
  Loader2,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Upload,
  Eye,
  LayoutList,
  Columns,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  GripVertical,
  Lock,
  Unlock,
  Bell,
  Home,
  ClipboardList,
  BarChart3,
  Settings,
  User as UserIcon,
  Download,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Share2,
  Facebook,
  Instagram,
  Linkedin,
  Share,
  Music2,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { format, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Toaster, toast } from 'react-hot-toast';
import { Post, PostStatus, ViewMode, INITIAL_POSTS, UserProfile } from './types';
import { generateCaption } from './services/geminiService';
import { CONTENT_TITLES, CONTENT_TYPES, FORMATS, FUNNEL_STATUSES } from './constants';
import { auth, db, storage } from './firebase';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthScreen from './components/AuthScreen';
import { AdminView } from './components/AdminView';
import { SocialHubView } from './components/SocialHubView';
import { ProfileView } from './components/ProfileView';
import { FacebookPostModal } from './components/FacebookPostModal';
import { HelpView } from './components/HelpView';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  updateDoc,
  getDocFromServer,
  limit,
  addDoc,
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

type ColumnId = keyof Post | 'ai';

interface TableColumn {
  id: ColumnId;
  label: string;
  width: string;
  visible: boolean;
}

const STATUS_COLORS: Record<PostStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-600 border-slate-200',
  'In Progress': 'bg-blue-50 text-blue-600 border-blue-100',
  'Ready for Review': 'bg-amber-50 text-amber-600 border-amber-100',
  'Scheduled': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  'Published': 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

const STATUS_ICONS: Record<PostStatus, any> = {
  'Not Started': AlertCircle,
  'In Progress': Clock,
  'Ready for Review': Edit2,
  'Scheduled': CheckCircle2,
  'Published': Check,
};

const FBStatusBadge: React.FC<{ post: Post }> = ({ post }) => {
  const [showDetails, setShowDetails] = useState(false);
  if (!post.fbStatus || post.fbStatus === 'idle') return null;
  
  const formatFullDate = (timeStr?: string) => {
    if (!timeStr) return 'Unknown';
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const timeInfo = post.fbStatus === 'scheduled' ? post.fbScheduledTime : post.fbPublishedTime;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div 
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm cursor-help select-none hover:brightness-110 transition-all ${
          post.fbStatus === 'posted' 
            ? 'bg-[#1877F2] text-white' 
            : 'bg-amber-400 text-white'
        }`}
      >
        <Facebook className="w-2.5 h-2.5" />
        {post.fbStatus === 'posted' ? 'FB Posted' : 'FB Scheduled'}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 mt-1 left-0 bg-slate-800 text-white text-[9px] px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap border border-slate-700"
          >
            <div className="font-bold flex items-center gap-1 mb-0.5">
              <Clock className="w-2.5 h-2.5 text-blue-300" />
              {post.fbStatus === 'posted' ? 'Published' : 'Scheduled'}
            </div>
            <div className="text-slate-300">
              {formatFullDate(timeInfo)}
            </div>
            <div className="mt-1 pt-1 border-t border-slate-700 font-mono text-[8px] text-slate-400">
              ID: {post.fbPostId?.substring(0, 12)}...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface KanbanViewProps {
  filteredPosts: Post[];
  setFormData: Dispatch<SetStateAction<Partial<Post>>>;
  handleOpenModal: (post?: Post) => void;
  handleOpenShareModal: (post: Post) => void;
  handleOpenFBModal: (post: Post) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ filteredPosts, setFormData, handleOpenModal, handleOpenShareModal, handleOpenFBModal }) => {
  const statuses: PostStatus[] = ['Not Started', 'In Progress', 'Ready for Review', 'Scheduled', 'Published'];
  
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px]">
      {statuses.map(status => {
        const statusPosts = filteredPosts.filter(p => p.status === status);
        const StatusIcon = STATUS_ICONS[status];
        
        return (
          <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={`p-1 rounded-md border ${STATUS_COLORS[status]}`}>
                  <StatusIcon className="w-4 h-4" />
                </span>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">{status}</h3>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {statusPosts.length}
                </span>
              </div>
              <button 
                onClick={() => {
                  setFormData(prev => ({ ...prev, status }));
                  handleOpenModal();
                }}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {statusPosts.map(post => (
                <motion.div 
                  layout
                  key={post.id}
                  onClick={() => handleOpenModal(post)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                        {post.contentTitle}
                      </span>
                      <FBStatusBadge post={post} />
                    </div>
                    <div className="flex items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFBModal(post);
                        }}
                        className="p-1 text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        title="Post to Facebook"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {format(new Date(post.date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">
                    {post.topicTheme || "Untitled Content"}
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {post.creatives?.slice(0, 3).map((c, i) => (
                        <div key={i} className="h-6 w-6 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800">
                          <img src={c} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {post.format}
                    </div>
                  </div>
                </motion.div>
              ))}
              {statusPosts.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center text-slate-300 text-xs italic">
                  No posts here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface CalendarViewProps {
  currentMonth: Date;
  posts: Post[];
  handleCreateForDate: (dateStr: string, isDirect?: boolean) => Promise<Post | null>;
  handleOpenModal: (post?: Post) => void;
  handleOpenShareModal: (post: Post) => void;
  handleOpenFBModal: (post: Post) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ currentMonth, posts, handleCreateForDate, handleOpenModal, handleOpenShareModal, handleOpenFBModal }) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        {weekDays.map(day => (
          <div key={day} className="px-2 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[120px]">
        {calendarDays.map((day, idx) => {
          const dayPosts = posts.filter(p => isSameDay(new Date(p.date), day));
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={idx} 
              className={`border-r border-b border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-950/20' : 'bg-white dark:bg-slate-900'} ${isToday ? 'bg-amber-50/60 dark:bg-amber-900/20 ring-1 ring-amber-200/50 dark:ring-amber-500/30 z-10' : ''} group`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-700' : isToday ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'} ${isToday ? 'bg-amber-200 dark:bg-amber-600 w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : ''}`}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  <button 
                    onClick={async () => {
                      const newPost = await handleCreateForDate(format(day, 'yyyy-MM-dd'));
                      if (newPost) handleOpenModal(newPost);
                    }}
                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-300 dark:text-slate-700 hover:text-amber-600 dark:hover:text-amber-500 transition-colors [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
                {dayPosts.map(post => (
                  <div 
                    key={post.id}
                    onClick={() => handleOpenModal(post)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer font-medium border ${STATUS_COLORS[post.status]} dark:border-slate-700 hover:brightness-95 transition-all flex flex-col gap-0.5 group/p shadow-sm hover:shadow-md`}
                    title={`${post.contentTitle}: ${post.topicTheme || "Untitled"}\nStatus: ${post.status}${
                      post.fbStatus === 'scheduled' ? `\nFacebook Scheduled: ${post.fbScheduledTime ? format(new Date(post.fbScheduledTime), 'PPP p') : 'Pending'}` : 
                      post.fbStatus === 'posted' ? `\nFacebook Published: ${post.fbPublishedTime ? format(new Date(post.fbPublishedTime), 'PPP p') : 'Completed'}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{post.contentTitle}: {post.topicTheme || "Untitled"}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFBModal(post);
                        }}
                        className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/p:opacity-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all p-0.5"
                      >
                        <Facebook className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    {post.fbStatus && post.fbStatus !== 'idle' && (
                      <div className="scale-75 origin-left -mt-1 -mb-1">
                        <FBStatusBadge post={post} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MonthlyTableViewProps {
  currentMonth: Date;
  tableColumns: TableColumn[];
  posts: Post[];
  handleUpdatePostInline: (id: string, field: keyof Post, value: any) => void;
  handleCreateForDate: (dateStr: string) => Promise<Post | null>;
  showColumnSettings: boolean;
  setShowColumnSettings: (show: boolean) => void;
  setTableColumns: Dispatch<SetStateAction<TableColumn[]>>;
  toggleColumnVisibility: (id: ColumnId) => void;
  addCustomColumn: () => void;
  sensors: any;
  handleDragEnd: (event: DragEndEvent) => void;
  isColumnsLocked: boolean;
  setIsColumnsLocked: (locked: boolean) => void;
  handleCopy: (text: string, id: string) => void;
  copiedId: string | null;
  setPreviewImageIndex: Dispatch<SetStateAction<{ post: Post, index: number } | null>>;
  handleOpenModal: (post?: Post) => void;
  handleOpenShareModal: (post: Post) => void;
  handleOpenFBModal: (post: Post) => void;
  handleDeletePost: (id: string) => void;
  searchQuery?: string;
  columnSettingsRef: React.RefObject<HTMLDivElement>;
  highlightedPostId: string | null;
  canDelete?: boolean;
  governanceSettings: {
    restrictDeletionToSupervisor: boolean;
    requireDeletionApproval: boolean;
  };
  profile: UserProfile | null;
  handleApproveDeletion?: (id: string) => Promise<void>;
  handleRejectDeletion?: (id: string) => Promise<void>;
  userRole?: string;
}

const MonthlyTableView: React.FC<MonthlyTableViewProps> = ({
  currentMonth,
  tableColumns,
  posts,
  handleUpdatePostInline,
  handleCreateForDate,
  showColumnSettings,
  setShowColumnSettings,
  setTableColumns,
  toggleColumnVisibility,
  addCustomColumn,
  sensors,
  handleDragEnd,
  isColumnsLocked,
  setIsColumnsLocked,
  handleCopy,
  copiedId,
  setPreviewImageIndex,
  handleOpenModal,
  handleOpenShareModal,
  handleOpenFBModal,
  handleDeletePost,
  searchQuery = '',
  columnSettingsRef,
  highlightedPostId,
  canDelete = true,
  governanceSettings,
  profile,
  handleApproveDeletion,
  handleRejectDeletion,
  userRole
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const visibleColumns = tableColumns.filter(c => c.visible);

  // If searching, only show days that have matching posts.
  // Otherwise show all days of the month.
  const days = searchQuery.trim() 
    ? allDays.filter(day => posts.some(p => p.date === format(day, 'yyyy-MM-dd')))
    : allDays;

  const renderCell = (post: Post, colId: ColumnId, day: Date, pIdx: number) => {
    const isToday = isSameDay(day, new Date());
    
    switch (colId) {
      case 'date':
        return pIdx === 0 ? (
          <div className={`text-xs font-bold ${isToday ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
            {format(day, 'EEE, MMM d')}
          </div>
        ) : null;
      case 'contentTitle':
        return (
          <div className="flex flex-col gap-1">
            <select 
              value={post.contentTitle}
              onChange={(e) => handleUpdatePostInline(post.id, 'contentTitle', e.target.value)}
              className="w-full bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {CONTENT_TITLES.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
            </select>
            {post.fbStatus && post.fbStatus !== 'idle' && (
              <div className="px-2">
                <FBStatusBadge post={post} />
              </div>
            )}
          </div>
        );
      case 'contentType':
        return (
          <select 
            value={post.contentType}
            onChange={(e) => handleUpdatePostInline(post.id, 'contentType', e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {CONTENT_TYPES.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
          </select>
        );
      case 'topicTheme':
        return (
          <textarea 
            value={post.topicTheme}
            placeholder="Enter theme..."
            onChange={(e) => handleUpdatePostInline(post.id, 'topicTheme', e.target.value)}
            rows={1}
            className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 resize-none overflow-hidden focus:min-h-[80px] transition-all"
          />
        );
      case 'subtopic':
        return (
          <input 
            type="text"
            value={post.subtopic || ''}
            placeholder="Enter subtopic..."
            onChange={(e) => handleUpdatePostInline(post.id, 'subtopic', e.target.value)}
            className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
          />
        );
      case 'caption':
        return (
          <div className="relative group/caption">
            <textarea 
              value={post.caption || ''}
              placeholder="No caption..."
              onChange={(e) => handleUpdatePostInline(post.id, 'caption', e.target.value)}
              rows={1}
              className="w-full bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 resize-none min-h-[32px] overflow-hidden line-clamp-2 focus:line-clamp-none focus:min-h-[80px]"
            />
            <div className="absolute top-1 right-1 flex gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/caption:opacity-100 transition-opacity">
              {post.caption && (
                <button 
                  onClick={() => handleCopy(post.caption!, post.id)}
                  className="p-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-slate-400"
                  title="Copy Caption"
                >
                  {copiedId === post.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
              <button 
                onClick={() => handleOpenFBModal(post)}
                className="p-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[#1877F2] transition-colors text-slate-400"
                title="Post to Facebook"
              >
                <Facebook className="w-3 h-3" />
              </button>
              <button 
                onClick={() => handleOpenModal(post)}
                className="p-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors text-slate-400"
                title="AI Generation"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      case 'creatives':
        const hasCreatives = post.creatives && post.creatives.length > 0;
        return hasCreatives ? (
          <div className="flex -space-x-3 overflow-hidden items-center group/images">
            {post.creatives!.slice(0, 3).map((img, idx) => (
              <div 
                key={idx}
                className="relative inline-block h-10 w-10 rounded border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer hover:scale-110 hover:z-10 transition-all shadow-sm"
                onClick={() => setPreviewImageIndex({ post, index: idx })}
              >
                <img 
                  src={img} 
                  alt="Creative" 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
            {post.creatives!.length > 3 && (
              <button 
                onClick={() => setPreviewImageIndex({ post, index: 3 })}
                className="flex items-center justify-center h-10 w-10 rounded border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 z-0 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                +{post.creatives!.length - 3}
              </button>
            )}
            <button 
              onClick={() => handleOpenModal(post)}
              className="ml-2 p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/images:opacity-100 transition-all"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => handleOpenModal(post)}
            className="w-10 h-10 rounded border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-bold"
          >
            <Plus className="w-5 h-5" />
          </button>
        );
      case 'format':
        return (
          <select 
            value={post.format}
            onChange={(e) => handleUpdatePostInline(post.id, 'format', e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {FORMATS.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
          </select>
        );
      case 'status':
        return (
          <select 
            value={post.status}
            onChange={(e) => handleUpdatePostInline(post.id, 'status', e.target.value as PostStatus)}
            className={`w-full bg-transparent border-none text-[10px] font-bold uppercase tracking-wider focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${STATUS_COLORS[post.status]}`}
          >
            <option value="Not Started" className="bg-white dark:bg-slate-900">Not Started</option>
            <option value="In Progress" className="bg-white dark:bg-slate-900">In Progress</option>
            <option value="Ready for Review" className="bg-white dark:bg-slate-900">Ready for Review</option>
            <option value="Scheduled" className="bg-white dark:bg-slate-900">Scheduled</option>
            <option value="Published" className="bg-white dark:bg-slate-900">Published</option>
          </select>
        );
      case 'approvalStatus':
        return (
          <select 
            value={post.approvalStatus || 'Pending'}
            onChange={(e) => handleUpdatePostInline(post.id, 'approvalStatus', e.target.value)}
            className={`w-full bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${
              post.approvalStatus === 'Approved' ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20' : 
              post.approvalStatus === 'For Revision' ? 'text-rose-500 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-900/20' : 
              'text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50'
            }`}
          >
            <option value="Pending" className="bg-white dark:bg-slate-900">Pending</option>
            <option value="Approved" className="bg-white dark:bg-slate-900">Approved</option>
            <option value="For Revision" className="bg-white dark:bg-slate-900">For Revision</option>
          </select>
        );
      case 'funnelStatus':
        return (
          <select 
            value={post.funnelStatus}
            onChange={(e) => handleUpdatePostInline(post.id, 'funnelStatus', e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {FUNNEL_STATUSES.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
          </select>
        );
      case 'visualIdeas':
        return (
          <input 
            type="text"
            value={post.visualIdeas || ''}
            placeholder="Visual ideas..."
            onChange={(e) => handleUpdatePostInline(post.id, 'visualIdeas', e.target.value)}
            className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
          />
        );
      default:
        if (colId.toString().startsWith('custom_') || colId.toString() === 'notes') {
          return (
            <input 
              type="text"
              value={(post as any)[colId] || ''}
              placeholder={`Enter ${colId.toString() === 'notes' ? 'notes' : 'text'}...`}
              onChange={(e) => handleUpdatePostInline(post.id, colId as any, e.target.value)}
              className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
            />
          );
        }
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300">
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly Table</span>
        </div>
        <div className="relative" ref={columnSettingsRef}>
          <button 
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Columns className="w-3.5 h-3.5" />
            Columns
          </button>
          
          <AnimatePresence>
            {showColumnSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2"
              >
                <div className="flex items-center justify-between p-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manage Columns</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setTableColumns([
                        { id: 'date', label: 'Date', width: 'w-32', visible: true },
                        { id: 'creatives', label: 'Creatives', width: 'w-32', visible: true },
                        { id: 'contentTitle', label: 'Content Title', width: 'w-40', visible: true },
                        { id: 'contentType', label: 'Type', width: 'w-40', visible: true },
                        { id: 'topicTheme', label: 'Topic / Theme', width: 'w-64', visible: true },
                        { id: 'subtopic', label: 'Subtopic', width: 'w-48', visible: false },
                        { id: 'caption', label: 'Caption', width: 'w-64', visible: true },
                        { id: 'format', label: 'Format', width: 'w-40', visible: true },
                        { id: 'status', label: 'Status', width: 'w-44', visible: true },
                        { id: 'approvalStatus', label: 'Approval', width: 'w-44', visible: true },
                        { id: 'funnelStatus', label: 'Funnel', width: 'w-40', visible: false },
                        { id: 'visualIdeas', label: 'Visual Ideas', width: 'w-64', visible: false },
                        { id: 'notes', label: 'Notes', width: 'w-64', visible: false },
                      ])}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Reset
                    </button>
                    <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsColumnsLocked(!isColumnsLocked)}
                      className={`p-1 rounded transition-colors ${isColumnsLocked ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      title={isColumnsLocked ? "Unlock Column Order" : "Lock Column Order"}
                    >
                      {isColumnsLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setShowColumnSettings(false)}><X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /></button>
                  </div>
                  </div>
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto no-scrollbar">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={tableColumns.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {tableColumns.map((col) => (
                        <SortableColumnItem 
                          key={col.id.toString()} 
                          col={col} 
                          toggleColumnVisibility={toggleColumnVisibility}
                          setTableColumns={setTableColumns}
                          isLocked={isColumnsLocked}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                <button 
                  onClick={addCustomColumn}
                  className="w-full mt-2 flex items-center justify-center gap-2 p-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors border border-dashed border-indigo-200 dark:border-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Column
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
              <thead className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <SortableContext 
                  items={visibleColumns.map(c => c.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <tr className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    {visibleColumns.map((col) => (
                      <SortableHeader key={col.id.toString()} col={col} isLocked={isColumnsLocked} />
                    ))}
                    <th className="w-40 px-4 py-3 sticky right-0 bg-slate-50/50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 backdrop-blur-sm z-[25]">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 text-center">Actions</div>
                    </th>
                  </tr>
                </SortableContext>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayPosts = posts.filter(p => p.date === dateStr);
                  const isToday = isSameDay(day, new Date());
 
                  if (dayPosts.length === 0) {
                    return (
                      <tr key={dateStr} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isToday ? 'bg-amber-50/40 dark:bg-amber-900/10 border-l-4 border-l-amber-400' : ''}`}>
                        {visibleColumns.map((col, idx) => (
                          <td key={col.id} className="px-4 py-3 align-top">
                            {col.id === 'date' ? (
                              <div className={`text-xs font-bold ${isToday ? 'text-amber-700 dark:text-amber-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                {format(day, 'EEE, MMM d')}
                              </div>
                            ) : idx === 1 ? (
                              <button 
                                onClick={() => handleCreateForDate(dateStr).then(p => p && handleOpenModal(p))}
                                className="text-xs text-slate-300 dark:text-slate-700 italic hover:text-amber-500 transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add content...
                              </button>
                            ) : null}
                          </td>
                        ))}
                        <td className="px-4 py-3 align-middle sticky right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/80 transition-colors border-l border-slate-100 dark:border-slate-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)] z-20 w-40"></td>
                      </tr>
                    );
                  }
 
                  return dayPosts.map((post, pIdx) => (
                    <tr 
                      key={post.id} 
                      id={`post-${post.id}`}
                      className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-500 ${isToday ? 'bg-amber-50/40 dark:bg-amber-900/10 border-l-4 border-l-amber-400' : ''} ${highlightedPostId === post.id ? 'bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500 ring-inset shadow-lg scale-[1.01] z-10' : ''}`}
                    >
                      {visibleColumns.map((col) => (
                        <td key={col.id} className="px-4 py-3 align-top">
                          {renderCell(post, col.id, day, pIdx)}
                        </td>
                      ))}
                      <td className="px-4 py-3 align-middle sticky right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/80 transition-colors border-l border-slate-100 dark:border-slate-800 shadow-[-10px_0_15px_rgba(0,0,0,0.02)] z-20 w-40">
                        <div className="flex items-center justify-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform [@media(hover:hover)]:translate-x-2 [@media(hover:hover)]:group-hover:translate-x-0">
                          <button 
                            onClick={() => handleOpenFBModal(post)}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-[#1877F2] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Post to Facebook"
                          >
                            <Facebook className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenModal(post)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            title="Edit Post"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenShareModal(post)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            title="Share Details"
                          >
                            <Share className="w-4 h-4" />
                          </button>
                          {post.deletionRequested ? (
                            <div className="flex items-center gap-1">
                              {userRole === 'marketing_supervisor' ? (
                                <>
                                  <button 
                                    onClick={() => handleApproveDeletion?.(post.id)}
                                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                    title="Approve Deletion"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRejectDeletion?.(post.id)}
                                    className="p-1.5 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                    title="Cancel Deletion Request"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <div className="px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-bold rounded-lg border border-rose-200 dark:border-rose-800 animate-pulse">
                                  Pending Deletion
                                </div>
                              )}
                            </div>
                          ) : canDelete && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
                              title={governanceSettings.requireDeletionApproval && profile?.role !== 'marketing_supervisor' ? "Request Deletion" : "Delete Post"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
      </DndContext>
    </div>
  );
};


const DetailItem = ({ label, value, fullWidth = false, isLink = false }: { label: string, value?: string, fullWidth?: boolean, isLink?: boolean }) => (
  <div className={`space-y-1 ${fullWidth ? 'col-span-2' : ''}`}>
    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
    {isLink && value ? (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all">
        {value} <ExternalLink className="w-3 h-3" />
      </a>
    ) : (
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
        {value || <span className="italic text-slate-300 dark:text-slate-600 font-normal">N/A</span>}
      </p>
    )}
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading: authLoading, login, logout, updateProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const isAuthReady = !authLoading;
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing Workspace');
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'All'>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<{ post: Post, index: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  
  const [activeConcernsCount, setActiveConcernsCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'concerns'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveConcernsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);
  
  // Facebook Post State
  const [isFBModalOpen, setIsFBModalOpen] = useState(false);
  const [selectedFBPost, setSelectedFBPost] = useState<Post | null>(null);
  const [isColumnsLocked, setIsColumnsLocked] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([
    { id: 'date', label: 'Date', width: 'w-32', visible: true },
    { id: 'creatives', label: 'Creatives', width: 'w-32', visible: true },
    { id: 'contentTitle', label: 'Content Title', width: 'w-40', visible: true },
    { id: 'contentType', label: 'Type', width: 'w-40', visible: true },
    { id: 'topicTheme', label: 'Topic / Theme', width: 'w-64', visible: true },
    { id: 'subtopic', label: 'Subtopic', width: 'w-48', visible: false },
    { id: 'caption', label: 'Caption', width: 'w-64', visible: true },
    { id: 'format', label: 'Format', width: 'w-40', visible: true },
    { id: 'status', label: 'Status', width: 'w-44', visible: true },
    { id: 'approvalStatus', label: 'Approval', width: 'w-44', visible: true },
    { id: 'funnelStatus', label: 'Funnel', width: 'w-40', visible: false },
    { id: 'visualIdeas', label: 'Visual Ideas', width: 'w-64', visible: false },
    { id: 'notes', label: 'Notes', width: 'w-64', visible: false },
  ]);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Post>>({
    date: new Date().toISOString().split('T')[0],
    status: 'Not Started',
    contentTitle: CONTENT_TITLES[0],
    contentType: CONTENT_TYPES[0],
    format: FORMATS[0],
    topicTheme: '',
    funnelStatus: FUNNEL_STATUSES[0],
    visualIdeas: '',
    caption: '',
    customPrompt: '',
    creatives: [],
  });

  // Undo/Redo state for caption
  const [captionHistory, setCaptionHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'full' | 'mini-hover' | 'mini-fixed'>('full');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // Derived helper for rendering logic
  const isSidebarExpanded = sidebarMode === 'full' || (sidebarMode === 'mini-hover' && isSidebarHovered);
  const isSidebarMini = !isSidebarExpanded;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    linkedin: '',
    tiktok: ''
  });

  const [notifSettings, setNotifSettings] = useState({
    onExportCSV: true,
    onNewTask: true,
    onTaskDeleted: true,
    onStatusScheduled: true,
    onStatusReadyForReview: true,
    onAICaption: true,
    onPostPublished: true,
    onPostApproved: true,
    onNewConcern: true,
    onNewSupportMessage: true,
    onDeletionRequest: true,
    onApprovalRequired: true,
  });
  const [governanceSettings, setGovernanceSettings] = useState({
    restrictDeletionToSupervisor: false,
    requireDeletionApproval: false,
    requireFacebookDeletionApproval: false,
  });
  const [exportSettings, setExportSettings] = useState({
    date: true,
    contentTitle: true,
    contentType: true,
    topicTheme: true,
    subtopic: true,
    caption: true,
    format: true,
    status: true,
    funnelStatus: true,
    visualIdeas: true,
    notes: true,
    approvalStatus: true,
  });
  const [quickLinks, setQuickLinks] = useState<{id: string, name: string, url: string}[]>([]);

  const addNotification = async (type: keyof typeof notifSettings, title: string, message: string, postId?: string) => {
    if (!notifSettings[type]) return;
    
    const targetUserId = user?.uid || 'guest_user';
    const newNotif = {
      title,
      message,
      createdAt: serverTimestamp(),
      read: false,
      postId: postId || null,
      userId: targetUserId,
      type
    };
    
    try {
      await addDoc(collection(db, 'notifications'), newNotif);
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">{title}</div>
          <div className="text-xs opacity-80">{message}</div>
        </div>,
        { duration: 4000 }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    }
  };

  const notifySupervisors = async (type: keyof typeof notifSettings, title: string, message: string, postId: string) => {
    if (!notifSettings[type]) return;
    try {
      const sQuery = query(
        collection(db, 'users'), 
        where('role', '==', 'marketing_supervisor'), 
        where('status', '==', 'active')
      );
      const sDocs = await getDocs(sQuery);
      const sPromises = sDocs.docs.map(sDoc => {
        if (sDoc.id === user?.uid) return Promise.resolve();
        return addDoc(collection(db, 'notifications'), {
          title,
          message: `${message} (Update by ${profile?.displayName || user?.email || 'User'})`,
          createdAt: serverTimestamp(),
          read: false,
          postId: postId || null,
          userId: sDoc.id,
          type
        });
      });
      await Promise.all(sPromises);
    } catch (err) {
      console.error("Error notifying supervisors:", err);
    }
  };

  const notifyAll = async (type: keyof typeof notifSettings, title: string, message: string, postId: string) => {
    if (!notifSettings[type]) return;
    try {
      const uQuery = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      const uDocs = await getDocs(uQuery);
      const uPromises = uDocs.docs.map(uDoc => {
        // If it's the current user, we already (optionally) show a toast via addNotification
        // but we still might want it in their notifications list.
        return addDoc(collection(db, 'notifications'), {
          title,
          message: `${message} (Update by ${profile?.displayName || user?.email || 'User'})`,
          createdAt: serverTimestamp(),
          read: false,
          postId: postId || null,
          userId: uDoc.id,
          type
        });
      });
      await Promise.all(uPromises);
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">{title}</div>
          <div className="text-xs opacity-80">📢 Notification sent to all users</div>
        </div>
      );
    } catch (err) {
      console.error("Error notifying all users:", err);
    }
  };

  // Automation for scheduled posts
  useEffect(() => {
    if (!posts.length || profile?.role !== 'marketing_supervisor') return;

    const checkScheduledPosts = async () => {
      const now = new Date();
      const updates = posts.filter(post => {
        if (post.status !== 'Scheduled') return false;
        const postDate = new Date(post.date);
        return postDate <= now;
      });

      if (updates.length === 0) return;

      for (const post of updates) {
        try {
          await updateDoc(doc(db, 'posts', post.id), { status: 'Published' });
          
          // Log to history
          await addDoc(collection(db, 'history'), {
            postId: post.id,
            contentTitle: post.contentTitle,
            action: 'auto_publish',
            platform: 'system',
            timestamp: serverTimestamp(),
            userEmail: 'system-automation@gemini.ai',
            userName: 'System Auto-Publish',
            details: `Scheduled date ${post.date} reached.`
          });
        } catch (err) {
          console.error(`Failed to auto-publish post ${post.id}:`, err);
        }
      }

      if (updates.length > 0) {
        addNotification('System Update', `${updates.length} scheduled posts have been automatically marked as Published.`, 'info');
      }
    };

    // Run once on load and then every 5 minutes
    checkScheduledPosts();
    const interval = setInterval(checkScheduledPosts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [posts.length, profile?.role]);

  // Persistence for settings
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const unsubscribeReady = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.notifSettings) {
          setNotifSettings(prev => ({ 
            ...prev, 
            ...data.notifSettings,
            onDeletionRequest: data.notifSettings.onDeletionRequest ?? true,
            onApprovalRequired: data.notifSettings.onApprovalRequired ?? true
          }));
        }
        if (data.exportSettings) setExportSettings(prev => ({ ...prev, ...data.exportSettings }));
        if (data.governanceSettings) setGovernanceSettings(prev => ({ 
          restrictDeletionToSupervisor: false,
          requireDeletionApproval: false,
          ...data.governanceSettings 
        }));
      }
    }, (err) => {
      console.error("Error listening to settings:", err);
    });

    return () => unsubscribeReady();
  }, [isAuthReady, user]);

  // Listener for new concerns to notify supervisors
  useEffect(() => {
    if (!user || profile?.role !== 'marketing_supervisor' || !notifSettings.onNewConcern) return;

    // We only want to notify about NEW concerns created AFTER the listener starts
    const startTime = new Date();
    
    const qConcerns = query(
      collection(db, 'concerns'),
      where('status', '==', 'pending')
    );

    const unsubscribeConcerns = onSnapshot(qConcerns, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docTime = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(0);
          
          if (docTime > startTime) {
            addNotificationSimple(
              'New Support Concern', 
              `A new concern has been submitted by ${data.userName || data.userEmail}: "${data.subject}"`,
              'info'
            );
          }
        }
      });
    });

    return () => unsubscribeConcerns();
  }, [user, profile?.role, notifSettings.onNewConcern]);

  // Combined listener for messages inside concerns
  useEffect(() => {
    if (!user || !notifSettings.onNewSupportMessage) return;

    const startTime = new Date();

    const qMessages = query(collection(db, 'concerns'));

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const messages = data.messages || [];
          if (messages.length === 0) return;

          const lastMessage = messages[messages.length - 1];
          const messageTime = new Date(lastMessage.timestamp);

          if (messageTime > startTime) {
            // If I am supervisor, notify me about user messages
            if (profile?.role === 'marketing_supervisor' && lastMessage.role === 'user') {
              addNotificationSimple(
                'New Message', 
                `New message from ${lastMessage.senderName}: "${lastMessage.text.substring(0, 50)}${lastMessage.text.length > 50 ? '...' : ''}"`,
                'info'
              );
            }
            // If I am a standard user, notify me about supervisor messages on MY concerns
            else if (profile?.role !== 'marketing_supervisor' && lastMessage.role === 'supervisor' && data.userId === user.uid) {
              addNotificationSimple(
                'Supervisor Replied', 
                `The supervisor replied to your concern: "${lastMessage.text.substring(0, 50)}${lastMessage.text.length > 50 ? '...' : ''}"`,
                'success'
              );
            }
          }
        }
      });
    });

    return () => unsubscribeMessages();
  }, [user, profile?.role, notifSettings.onNewSupportMessage]);

  // Listener for Deletion and Approval Requests for Supervisors
  useEffect(() => {
    if (!user || profile?.role !== 'marketing_supervisor') return;

    const startTime = new Date();

    const qRequests = query(
      collection(db, 'posts')
    );

    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const oldData = change.doc.data(); // Note: snapshot listener docChanges doesn't give 'before' easily without cache comparisons
          // But we can check if the current state is 'true' and was likely just set
          
          if (notifSettings.onDeletionRequest) {
            if (data.deletionRequested && !data.deletionRequestNotified) {
              addNotificationSimple(
                'Hub Deletion Request',
                `User ${data.createdBy || 'Member'} is requesting to remove a post from the Hub: "${data.title || 'Untitled'}"`,
                'warning'
              );
              // Mark as notified in background to prevent repeat triggers (optional but good practice)
              updateDoc(doc(db, 'posts', change.doc.id), { deletionRequestNotified: true });
            }
            if (data.facebookDeletionRequested && !data.fbDeletionRequestNotified) {
              addNotificationSimple(
                'Facebook Removal Request',
                `User ${data.createdBy || 'Member'} is requesting to delete a post from Facebook: "${data.title || 'Untitled'}"`,
                'warning'
              );
              updateDoc(doc(db, 'posts', change.doc.id), { fbDeletionRequestNotified: true });
            }
          }
          
          if (notifSettings.onApprovalRequired && data.status === 'pending_approval' && !data.approvalNotified) {
            addNotificationSimple(
              'Approval Required',
              `A new post/update requires your approval: "${data.title || 'Untitled'}"`,
              'info'
            );
            updateDoc(doc(db, 'posts', change.doc.id), { approvalNotified: true });
          }
        }
      });
    });

    return () => unsubscribeRequests();
  }, [user, profile?.role, notifSettings.onDeletionRequest, notifSettings.onApprovalRequired]);

  const addNotificationSimple = async (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const targetUserId = user?.uid || 'guest_user';
    const newNotif = {
      title,
      message,
      createdAt: serverTimestamp(),
      read: false,
      userId: targetUserId,
      type: 'system' // Custom types use system as base for global list
    };
    
    try {
      await addDoc(collection(db, 'notifications'), newNotif);
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">{title}</div>
          <div className="text-xs opacity-80">{message}</div>
        </div>
      );
    } catch (err) {
      console.error("Error adding notification:", err);
    }
  };

  const updateGlobalSettings = async (field: string, value: any) => {
    if (!user || profile?.role !== 'marketing_supervisor') return;
    try {
      await setDoc(doc(db, 'settings', 'global'), { [field]: value }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  };

  const handleUpdateNotifSettings = (newSettings: any) => {
    setNotifSettings(newSettings);
    updateGlobalSettings('notifSettings', newSettings);
  };

  const handleUpdateExportSettings = (newSettings: any) => {
    setExportSettings(newSettings);
    updateGlobalSettings('exportSettings', newSettings);
  };

  const handleUpdateGovernanceSettings = (newSettings: any) => {
    setGovernanceSettings(newSettings);
    updateGlobalSettings('governanceSettings', newSettings);
  };

  const handleNotificationClick = async (notif: any) => {
    // Mark as read in Firestore
    if (!notif.read) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${notif.id}`);
      }
    }
    
    if (notif.postId) {
      // Switch to list view if not already there
      if (viewMode !== 'list') {
        setViewMode('list');
      }
      
      // Clear search query to ensure the post is visible
      setSearchQuery('');
      
      // Highlight the post
      setHighlightedPostId(notif.postId);
      setShowNotifications(false);
      
      // Scroll to the post
      setTimeout(() => {
        const element = document.getElementById(`post-${notif.postId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedPostId(null);
      }, 3000);
    }
  };

  // Paste handler for creatives
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isModalOpen) return;
      
      // Don't process if user is typing in a text area or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // If it's an image, we still might want to process it, 
        // but usually paste in textarea is for text.
        // However, if there are files in the clipboard, we process them.
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isModalOpen]);

  const handleMarkAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    const batchPromises = unreadNotifs.map(n => 
      updateDoc(doc(db, 'notifications', n.id), { read: true })
    );
    try {
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications/batch');
    }
  };

  const handleClearAllNotifications = async () => {
    const batchPromises = notifications.map(n => 
      deleteDoc(doc(db, 'notifications', n.id))
    );
    try {
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications/batch');
    }
  };

  const handleClearNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const notificationRef = useRef<HTMLDivElement>(null);
  const columnSettingsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auth Listener removal
  useEffect(() => {
    // Simulated loading progress
    const messages = [
      'Initializing Workspace',
      'Connecting to Database',
      'Loading Content Assets',
      'Synchronizing Planner',
      'Finalizing Setup'
    ];
    
    let currentStep = 0;
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        
        const nextProgress = prev + Math.random() * 12;
        const step = Math.floor(nextProgress / 20);
        if (step > currentStep && step < messages.length) {
          currentStep = step;
          setLoadingMessage(messages[step]);
        }
        
        return nextProgress > 100 ? 100 : nextProgress;
      });
    }, 250);

    // Minimum splash duration for polished feel
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  // Notifications Listener
  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const targetUserId = user.uid;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', targetUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          time: data.createdAt?.toDate ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true }) : 'Just now'
        };
      })
      .sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .slice(0, 50);
      setNotifications(notifs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);


  // Social Links Listener
  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const unsubscribe = onSnapshot(doc(db, 'settings', 'social_links'), (snapshot) => {
      if (snapshot.exists()) {
        setSocialLinks(snapshot.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/social_links');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Quick Links Listener
  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const unsubscribe = onSnapshot(doc(db, 'settings', 'quick_links'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.links) {
          setQuickLinks(data.links);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/quick_links');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  const handleUpdateSocialLinks = async (links: typeof socialLinks) => {
    try {
      await setDoc(doc(db, 'settings', 'social_links'), links);
      addNotification('onNewTask', 'Settings Updated', 'Social media redirection links have been updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/social_links');
    }
  };

  const handleUpdateQuickLinks = async (links: typeof quickLinks) => {
    try {
      await setDoc(doc(db, 'settings', 'quick_links'), { links });
      addNotification('onNewTask', 'Links Updated', 'Quick links have been updated for all users.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/quick_links');
    }
  };

  // Firestore Data Fetching
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // If no user, we show all posts or guest posts. 
    const postsRef = collection(db, 'posts');
    const q = query(postsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Post[];
      setPosts(postsData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [isAuthReady, user, profile?.role]);

  const filteredPosts = posts.filter(post => {
    const postDate = new Date(post.date);
    const matchesMonth = isSameMonth(postDate, currentMonth);
    
    const matchesSearch = 
      post.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.topicTheme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'All' || post.status === statusFilter;
    
    return !post.isDirectPost && matchesMonth && matchesSearch && matchesStatus;
  });

  const handleUpdatePostInline = async (id: string, field: keyof Post, value: any) => {
    try {
      const postRef = doc(db, 'posts', id);
      await updateDoc(postRef, { [field]: value });

      if (field === 'status') {
        if (value === 'Scheduled') {
          addNotification('onStatusScheduled', 'Status Updated', 'A task has been marked as Scheduled.', id);
          notifySupervisors('onStatusScheduled', 'Task Scheduled', 'A task has been marked as Scheduled.', id);
        } else if (value === 'Ready for Review') {
          addNotification('onStatusReadyForReview', 'Ready for Review', 'A task is now ready for your approval.', id);
          notifySupervisors('onStatusReadyForReview', 'Ready for Review', 'A task is now ready for your approval.', id);
        } else if (value === 'Published') {
          addNotification('onPostPublished', 'Post Published', 'A post has been manually marked as Published.', id);
          notifyAll('onPostPublished', 'Post Published', 'A new post has been published!', id);
        }
      }

      if (field === 'approvalStatus') {
        if (value === 'Approved') {
          addNotification('onPostApproved', 'Post Approved', 'Your post has been approved.', id);
          notifyAll('onPostApproved', 'Post Approved', 'A post has been approved and is ready for the next step.', id);
        } else if (value === 'For Revision') {
          addNotification('onNewTask', 'Revision Required', 'A post requires revision.', id);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${id}`);
    }
  };

  const handleCreateForDate = async (dateStr: string, isDirect: boolean = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPost: Post = {
      id,
      date: dateStr,
      status: 'Not Started',
      contentTitle: CONTENT_TITLES[0],
      contentType: CONTENT_TYPES[0],
      format: FORMATS[0],
      topicTheme: '',
      funnelStatus: FUNNEL_STATUSES[0],
      visualIdeas: '',
      caption: '',
      customPrompt: '',
      creatives: [],
      userId: user?.uid || 'guest_user',
      isDirectPost: isDirect
    };
    
    try {
      await setDoc(doc(db, 'posts', id), newPost);
      return newPost;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `posts/${id}`);
      return null;
    }
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleColumnVisibility = (id: ColumnId) => {
    setTableColumns(prev => prev.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (isColumnsLocked) return;

    if (over && active.id !== over.id) {
      setTableColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addCustomColumn = () => {
    const name = prompt('Enter column name:');
    if (!name) return;
    const id = `custom_${Math.random().toString(36).substr(2, 5)}`;
    setTableColumns(prev => [
      ...prev.slice(0, -1), // Insert before AI column
      { id: id as any, label: name, width: 'w-48', visible: true },
      prev[prev.length - 1]
    ]);
  };

  const handleOpenFBModal = (post: Post) => {
    setSelectedFBPost(post);
    setIsFBModalOpen(true);
  };

  const handleOpenModal = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setFormData({ ...post, creatives: post.creatives || [], customPrompt: post.customPrompt || '' });
      setCaptionHistory([post.caption || '']);
      setHistoryIndex(0);
    } else {
      setEditingPost(null);
      const initialData = {
        date: new Date().toISOString().split('T')[0],
        status: 'Not Started',
        contentTitle: CONTENT_TITLES[0],
        contentType: CONTENT_TYPES[0],
        format: FORMATS[0],
        topicTheme: '',
        funnelStatus: FUNNEL_STATUSES[0],
        visualIdeas: '',
        caption: '',
        customPrompt: '',
        creatives: [],
      };
      setFormData(initialData);
      setCaptionHistory(['']);
      setHistoryIndex(0);
    }
    setIsModalOpen(true);
  };

  const handleOpenShareModal = (post: Post) => {
    setSharingPost(post);
    setIsShareModalOpen(true);
  };

  const handleSavePost = async () => {
    if (!formData.contentTitle || !formData.date) return;

    const id = editingPost ? editingPost.id : Math.random().toString(36).substr(2, 9);
    const oldStatus = editingPost?.status;
    const newStatus = formData.status;

    const postData = {
      ...formData,
      id,
      userId: user?.uid || 'guest_user',
    } as Post;

    // Check document size (approximate)
    const estimatedSize = JSON.stringify(postData).length;
    if (estimatedSize > 1000000) {
      alert("The post content is too large to save (exceeds 1MB limit). Please remove some images or reduce the amount of text.");
      return;
    }

    try {
      await setDoc(doc(db, 'posts', id), postData);
      
      if (!editingPost) {
        addNotification('onNewTask', 'New Task Created', `"${formData.topicTheme || 'Untitled'}" has been added to the plan.`, id);
      } else {
        // If it's an update, check for status changes
        if (newStatus !== oldStatus) {
          if (newStatus === 'Scheduled') {
            addNotification('onStatusScheduled', 'Status Updated', 'A task has been marked as Scheduled.', id);
            notifySupervisors('onStatusScheduled', 'Task Scheduled', 'A task has been marked as Scheduled.', id);
          } else if (newStatus === 'Ready for Review') {
            addNotification('onStatusReadyForReview', 'Ready for Review', 'A task is now ready for your approval.', id);
            notifySupervisors('onApprovalRequired', 'Approval Required', 'A task is now ready for your review and approval.', id);
          }
        }
      }
      
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `posts/${id}`);
    }
  };

  const handleDeletePost = async (id: string): Promise<'deleted' | 'requested' | 'denied' | 'error'> => {
    if (governanceSettings.restrictDeletionToSupervisor && profile?.role !== 'marketing_supervisor') {
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-bold">Access Denied</div>
          <div className="text-xs opacity-80">Deletion is restricted to Marketing Supervisors only.</div>
        </div>
      );
      return 'denied';
    }

    if (governanceSettings.requireDeletionApproval && profile?.role !== 'marketing_supervisor') {
      try {
        await updateDoc(doc(db, 'posts', id), {
          deletionRequested: true,
          requestedBy: profile?.displayName || profile?.email || 'Unknown User',
          requestDate: new Date().toISOString()
        });
        addNotification('onDeletionRequest', 'Deletion Requested', `A deletion request for task ${id} has been submitted.`);
        notifySupervisors('onDeletionRequest', 'New Deletion Request', `User ${profile?.displayName || profile?.email} requested to delete a task.`, id);
        toast.success("Deletion request submitted for supervisor approval.");
        if (editingPost?.id === id) setIsModalOpen(false);
        return 'requested';
      } catch (err) {
        console.error("Error requesting deletion:", err);
        toast.error("Failed to submit deletion request.");
        return 'error';
      }
    }

    try {
      await deleteDoc(doc(db, 'posts', id));
      addNotification('onTaskDeleted', 'Task Deleted', 'A content task has been permanently removed.');
      if (editingPost?.id === id) {
        setIsModalOpen(false);
      }
      toast.success("Content deleted successfully.");
      return 'deleted';
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${id}`);
      return 'error';
    }
  };

  const handleApproveDeletion = async (id: string) => {
    try {
      const postDoc = await getDoc(doc(db, 'posts', id));
      if (!postDoc.exists()) return;
      const post = { id: postDoc.id, ...postDoc.data() } as Post;

      if (post.facebookDeletionRequested && post.fbPostId) {
        // This part is tricky because we need to call the FB API.
        // Usually we'd use useFacebookPost hook, but this is a function in App.tsx.
        // We can either:
        // 1. Pass the delete function here
        // 2. Just clear the metadata and let the supervisor handle the actual FB deletion manually if needed?
        // Actually, the prompt implies "approval for delete from facebook".
        // Let's assume for now we clear the FB link as if it's "Approved to be removed from local tracking of FB" 
        // OR we should ideally call the API.
        
        // Since I don't have the hook here, I'll update the document to clear FB status
        // and tell the user they need to manually verify if it's not automated. 
        // BUT wait, I can call the server API directly with fetch.
        
        try {
          const response = await fetch('/api/facebook/delete-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: post.fbPostId })
          });
          
          if (!response.ok) throw new Error('Failed to delete from Facebook API');
          
          await updateDoc(doc(db, 'posts', id), {
            fbPostId: null,
            fbStatus: null,
            fbPublishedTime: null,
            fbScheduledTime: null,
            facebookDeletionRequested: false,
            status: 'Not Started',
            updatedAt: serverTimestamp()
          });
          
          addNotification('onTaskDeleted', 'FB Deletion Approved', 'Post has been removed from Facebook.');
          toast.success("Approved and deleted from Facebook.");
        } catch (apiErr) {
          console.error("FB API Error during approval:", apiErr);
          toast.error("Approved locally, but failed to delete from Facebook via API.");
          // Still clear the request but maybe keep the ID so they can try again?
          // No, better to keep the request pending if API fails.
        }
      } else {
        await deleteDoc(doc(db, 'posts', id));
        addNotification('onTaskDeleted', 'Deletion Approved', 'Content has been permanently removed by supervisor.');
        toast.success("Content deleted permanently.");
      }
      
      if (editingPost?.id === id) setIsModalOpen(false);
    } catch (err) {
      console.error("Error approving deletion:", err);
      toast.error("Failed to approve deletion.");
    }
  };

  const handleRejectDeletion = async (id: string) => {
    try {
      await updateDoc(doc(db, 'posts', id), {
        deletionRequested: false,
        facebookDeletionRequested: false,
        requestedBy: null,
        requestDate: null
      });
      toast.success("Deletion request rejected.");
    } catch (err) {
      console.error("Error rejecting deletion:", err);
      toast.error("Failed to reject deletion.");
    }
  };

  const handleDeletePostFromFB = async (post: Post): Promise<'deleted' | 'requested' | 'denied' | 'error'> => {
    if (governanceSettings.restrictDeletionToSupervisor && profile?.role !== 'marketing_supervisor') {
      toast.error("Deletion is restricted to Marketing Supervisors only.");
      return 'denied';
    }

    if (governanceSettings.requireFacebookDeletionApproval && profile?.role !== 'marketing_supervisor') {
      try {
        await updateDoc(doc(db, 'posts', post.id), {
          facebookDeletionRequested: true,
          requestedBy: profile?.email || 'unknown',
          requestDate: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
        
        notifySupervisors('onDeletionRequest', 'FB Deletion Requested', `User ${profile?.displayName || profile?.email} requested to delete a post from Facebook.`, post.id);
        toast.success("Facebook deletion request submitted for approval.");
        return 'requested';
      } catch (err) {
        console.error("Error requesting FB deletion:", err);
        toast.error("Failed to submit deletion request.");
        return 'error';
      }
    }

    return 'deleted'; 
  };

  const compressImage = (base64Str: string, maxWidth = 8192, maxHeight = 8192, quality = 0.95): Promise<string> => {
    return new Promise((resolve) => {
      // Don't compress small images (under 500KB)
      if (base64Str.length < 500000) {
        resolve(base64Str);
        return;
      }

      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;

    const processedImages = await Promise.all(images.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const compressed = await compressImage(reader.result as string);
          resolve(compressed);
        };
        reader.readAsDataURL(file);
      });
    }));

    setFormData(prev => ({
      ...prev,
      creatives: [...(prev.creatives || []), ...processedImages]
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeCreative = (index: number) => {
    setFormData(prev => ({
      ...prev,
      creatives: (prev.creatives || []).filter((_, i) => i !== index)
    }));
  };

  const updateCaption = (newCaption: string) => {
    setFormData(prev => ({ ...prev, caption: newCaption }));
    
    // Update history
    const newHistory = captionHistory.slice(0, historyIndex + 1);
    newHistory.push(newCaption);
    setCaptionHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setFormData(prev => ({ ...prev, caption: captionHistory[prevIndex] }));
    }
  };

  const handleRedo = () => {
    if (historyIndex < captionHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setFormData(prev => ({ ...prev, caption: captionHistory[nextIndex] }));
    }
  };

  const handleGenerateCaption = async () => {
    if (!formData.contentTitle || !formData.topicTheme) {
      alert('Please fill in the Content Title and Topic/Theme first.');
      return;
    }

    setIsGenerating(true);
    try {
      const caption = await generateCaption({
        contentTitle: formData.contentTitle || '',
        contentType: formData.contentType || '',
        format: formData.format || '',
        topicTheme: formData.topicTheme || '',
        funnelStatus: formData.funnelStatus || '',
        customPrompt: formData.customPrompt || '',
      });
      updateCaption(caption);
      addNotification('onAICaption', 'AI Generation Complete', 'Your content caption has been generated successfully.', formData.id);
    } catch (error) {
      alert('Failed to generate caption. Please check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = (templateOnly: boolean = false) => {
    if (!templateOnly && posts.length === 0) {
      alert('No data to export');
      return;
    }

    const sanitizeForCSV = (text: string): string => {
      if (!text) return '';
      
      // Replace common "smart" characters with plain equivalents
      let sanitized = text
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
        .replace(/\u2013/g, "-")         // En dash
        .replace(/\u2014/g, "--")        // Em dash
        .replace(/\u2026/g, "...");      // Ellipsis

      // Remove emojis and other non-standard symbols
      sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu, '');

      // Remove non-printable control characters
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

      // Escape double quotes for CSV
      return sanitized.replace(/"/g, '""');
    };

    const columnMap = [
      { key: 'date', label: 'Date', getValue: (p: Post) => p.date },
      { key: 'contentTitle', label: 'Title', getValue: (p: Post) => `"${sanitizeForCSV(p.contentTitle)}"` },
      { key: 'contentType', label: 'Type', getValue: (p: Post) => `"${sanitizeForCSV(p.contentType)}"` },
      { key: 'topicTheme', label: 'Theme', getValue: (p: Post) => `"${sanitizeForCSV(p.topicTheme)}"` },
      { key: 'subtopic', label: 'Subtopic', getValue: (p: Post) => `"${sanitizeForCSV(p.subtopic || '')}"` },
      { key: 'caption', label: 'Caption', getValue: (p: Post) => `"${sanitizeForCSV(p.caption || '')}"` },
      { key: 'format', label: 'Format', getValue: (p: Post) => `"${sanitizeForCSV(p.format)}"` },
      { key: 'status', label: 'Status', getValue: (p: Post) => `"${sanitizeForCSV(p.status)}"` },
      { key: 'funnelStatus', label: 'Funnel', getValue: (p: Post) => `"${sanitizeForCSV(p.funnelStatus || '')}"` },
      { key: 'visualIdeas', label: 'Visual Ideas', getValue: (p: Post) => `"${sanitizeForCSV(p.visualIdeas || '')}"` },
      { key: 'notes', label: 'Notes', getValue: (p: Post) => `"${sanitizeForCSV(p.notes || '')}"` },
      { key: 'approvalStatus', label: 'Approval', getValue: (p: Post) => `"${sanitizeForCSV(p.approvalStatus || '')}"` }
    ];

    const activeColumns = columnMap.filter(col => (exportSettings as any)[col.key]);
    const headers = activeColumns.map(col => col.label);
    
    let csvContent = '\uFEFF' + headers.join(',') + '\n';

    if (!templateOnly) {
      const rows = posts.map(post => activeColumns.map(col => col.getValue(post)));
      csvContent += rows.map(row => row.join(',')).join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const fileName = templateOnly 
      ? `content_planner_template.csv` 
      : `content_planner_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (!templateOnly) {
      addNotification('onExportCSV', 'Export Successful', `Your CSV export for ${format(currentMonth, 'MMMM yyyy')} is ready.`);
    } else {
      toast.success('Template Downloaded', { icon: '📄' });
    }
  };

  const handleImportCSV = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      const csv = target?.result as string;
      Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results;
          if (data.length === 0) {
            alert('CSV is empty');
            return;
          }

          setIsSeeding(true);
          try {
            const batch = writeBatch(db);
            const targetUserId = user?.uid || 'guest_user';

            data.forEach((row: any) => {
              const id = Math.random().toString(36).substr(2, 9);
              // Normalize data from CSV row
              const postData: Post = {
                id,
                date: row.Date || row.date || new Date().toISOString().split('T')[0],
                contentTitle: row.Title || row.contentTitle || CONTENT_TITLES[0],
                contentType: row.Type || row.contentType || CONTENT_TYPES[0],
                topicTheme: row.Theme || row.topicTheme || '',
                subtopic: row.Subtopic || row.subtopic || '',
                caption: row.Caption || row.caption || '',
                format: row.Format || row.format || FORMATS[0],
                status: (row.Status || row.status || 'Not Started') as PostStatus,
                funnelStatus: row.Funnel || row.funnelStatus || FUNNEL_STATUSES[0],
                visualIdeas: row['Visual Ideas'] || row.visualIdeas || '',
                notes: row.Notes || row.notes || '',
                userId: targetUserId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              batch.set(doc(db, 'posts', id), postData);
            });

            await batch.commit();
            addNotification('onNewTask', 'Import Successful', `${data.length} tasks have been imported.`);
            alert(`Successfully imported ${data.length} tasks.`);
          } catch (err) {
            console.error('Import Error:', err);
            alert('Error during import. Check if your CSV format is correct.');
          } finally {
            setIsSeeding(false);
            if (e.target) e.target.value = '';
          }
        }
      });
    };
    reader.readAsText(file);
  };

  const handleRestoreOldData = async () => {
    if (isSeeding) return;
    
    setIsSeeding(true);
    try {
      const targetUserId = user?.uid || 'guest_user';
      
      const collectionsToClear = ['posts', 'notifications', 'comments', 'activityLogs'];
      
      for (const colName of collectionsToClear) {
        const snapshot = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      // 3. Seed initial posts
      const seedBatch = writeBatch(db);
      INITIAL_POSTS.forEach((post) => {
        const postData = { 
          ...post, 
          userId: targetUserId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        seedBatch.set(doc(db, 'posts', post.id), postData);
      });

      await seedBatch.commit();

      addNotification('onNewTask', 'Data Restored', 'The portal has been reset to its initial state.');
      alert('Data restoration successful. The portal has been reset.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'data/restore');
      alert('Error restoring data. Please check logs.');
    } finally {
      setIsSeeding(false);
    }
  };

  if (!isAuthReady || showSplash) {
    // ... rest of splash code remains same ...
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 15,
              delay: 0.1 
            }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-2xl shadow-amber-500/20 flex items-center justify-center mb-8 relative"
          >
            <div className="absolute -right-2 -top-2 bg-white rounded-lg p-1.5 shadow-lg border border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-white font-black text-2xl tracking-tighter">STLAF</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
              Content <span className="text-amber-500">Planner</span>
            </h1>
            
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
                <div className="flex gap-1">
                  <motion.div 
                    animate={{ scaleY: [1, 1.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-0.5 h-3 bg-amber-500/60 rounded-full" 
                  />
                  <motion.div 
                    animate={{ scaleY: [1, 1.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-0.5 h-3 bg-amber-500/60 rounded-full" 
                  />
                  <motion.div 
                    animate={{ scaleY: [1, 1.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-0.5 h-3 bg-amber-500/60 rounded-full" 
                  />
                </div>
                {loadingMessage}
              </div>

              {/* Progress Bar */}
              <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                {Math.round(loadingProgress)}%
              </span>
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-12 text-slate-400 text-[10px] font-bold uppercase tracking-widest"
        >
          Powered by Gemini AI
        </motion.div>
      </div>
    );
  }

  if (!user && isAuthReady) {
    return <AuthScreen />;
  }

  if (profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Registration Pending</h2>
        <p className="text-slate-500 max-w-md">Your account is awaiting supervisor approval. Please check back later or contact your department lead.</p>
        <button onClick={logout} className="mt-8 text-sm font-bold text-amber-600 hover:text-amber-700">Sign Out</button>
      </div>
    );
  }

  if (profile?.status === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Revoked</h2>
        <p className="text-slate-500 max-w-md">Your account has been deactivated. If you believe this is an error, please contact IT support.</p>
        <button onClick={logout} className="mt-8 text-sm font-bold text-amber-600 hover:text-amber-700">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Toaster position="top-right" reverseOrder={false} />
      {/* Sidebar */}
      <aside 
        onMouseEnter={() => sidebarMode === 'mini-hover' && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`${isSidebarMini ? 'w-20' : 'w-64'} bg-primary-dark text-slate-300 flex flex-col shrink-0 transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] relative z-[100] shadow-2xl`}
      >
        <div 
          onClick={() => setViewMode('list')}
          className={`pt-[32px] pl-[24px] pr-[24px] pb-[19px] flex items-center cursor-pointer hover:bg-white/5 transition-colors group ${isSidebarMini ? 'justify-center' : 'gap-3'}`}
        >
          <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-tighter">
              STLAF
            </div>
            <div className="absolute -right-1.5 -top-1.5 bg-white rounded-lg p-1 shadow-sm border border-slate-100">
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
          </div>
          {isSidebarExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h2 className="text-sm font-bold text-white leading-tight group-hover:text-amber-500 transition-colors">Marketing Portal</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">MARKETING DEPT</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-hidden">
          <button 
            onClick={() => setViewMode('list')}
            className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'list' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
            title={isSidebarMini ? "Monthly Table" : ""}
          >
            <LayoutList className="w-5 h-5 shrink-0" />
            {isSidebarExpanded && <span className="whitespace-nowrap">Monthly Table</span>}
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'kanban' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
            title={isSidebarMini ? "Kanban Board" : ""}
          >
            <Columns className="w-5 h-5 shrink-0" />
            {isSidebarExpanded && <span className="whitespace-nowrap">Kanban Board</span>}
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'calendar' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
            title={isSidebarMini ? "Calendar View" : ""}
          >
            <CalendarIcon className="w-5 h-5 shrink-0" />
            {isSidebarExpanded && <span className="whitespace-nowrap">Calendar View</span>}
          </button>

          <button 
            onClick={() => setViewMode('social')}
            className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'social' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
            title={isSidebarMini ? "Social Hub" : ""}
          >
            <Share2 className="w-5 h-5 shrink-0" />
            {isSidebarExpanded && <span className="whitespace-nowrap">Social Hub</span>}
          </button>
          
          {profile?.role === 'marketing_supervisor' && (
            <div className="pt-4 mt-4 border-t border-slate-700/50">
              <button 
                onClick={() => setViewMode('admin')}
                className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out relative ${viewMode === 'admin' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
                title={isSidebarMini ? "Settings" : ""}
              >
                <Settings className="w-5 h-5 shrink-0" />
                {isSidebarExpanded && <span className="whitespace-nowrap">Settings</span>}
                {activeConcernsCount > 0 && (
                  <span className={`absolute ${isSidebarMini ? 'top-1 right-1' : 'right-4'} flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-lg`}>
                    {activeConcernsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className={`${profile?.role !== 'marketing_supervisor' ? 'pt-4 mt-4 border-t border-slate-700/50' : 'mt-1'}`}>
            <button 
              onClick={() => setViewMode('profile')}
              className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'profile' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
              title={isSidebarMini ? "My Profile" : ""}
            >
              <UserIcon className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">My Profile</span>}
            </button>

            <button 
              onClick={() => setViewMode('help')}
              className={`w-full flex items-center ${isSidebarMini ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out mt-1 ${viewMode === 'help' ? 'bg-slate-700/50 text-indigo-400 border-l-4 border-indigo-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
              title={isSidebarMini ? "Help & Guide" : ""}
            >
              <HelpCircle className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="whitespace-nowrap">Help & Support</span>}
            </button>
          </div>

          {/* Quick Links Section */}
          {isSidebarExpanded && quickLinks.length > 0 && (
            <div className="px-4 pt-8 pb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Quick Links</p>
              <div className="space-y-3">
                {quickLinks.map((link) => (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
                    <span className="text-sm font-medium truncate">{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

        </nav>

        <div className="mt-auto p-4 pt-2 border-t border-slate-700/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {user ? (
              <div className={`flex items-center ${isSidebarMini ? 'justify-center w-full' : 'gap-3'}`}>
                {user.photoURL && (
                  <button 
                    onClick={() => setViewMode('profile')}
                    className="hover:scale-105 transition-transform"
                  >
                    <img src={user.photoURL} className="w-10 h-10 rounded-full border border-slate-600 shrink-0" alt="Profile" referrerPolicy="no-referrer" />
                  </button>
                )}
                {isSidebarExpanded && (
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-bold text-white truncate leading-tight">{user.displayName}</p>
                    <button 
                      onClick={logout}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors block mt-0.5 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={login}
                className={`flex items-center justify-center ${isSidebarMini ? 'w-10 h-10 p-0' : 'gap-2 px-4 py-2'} bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all`}
                title={isSidebarMini ? "Sign In" : ""}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                {isSidebarExpanded && <span className="whitespace-nowrap">Sign In</span>}
              </button>
            )}

            {/* Theme Toggle Button */}
            {!isSidebarMini && (
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-300"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Theme Toggle Icon for Mini Sidebar */}
          {isSidebarMini && (
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center justify-center p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-300"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}
          
          {!isSidebarMini && (
            <div className="flex items-center justify-center gap-1.5 opacity-20 mt-1">
              <Sparkles className="w-2 h-2 text-amber-500" />
              {isSidebarExpanded && <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Powered by Gemini AI</span>}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pl-[15px] pr-[32px] flex items-center justify-between sticky top-0 z-[80] transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (sidebarMode === 'full') setSidebarMode('mini-hover');
                else if (sidebarMode === 'mini-hover') setSidebarMode('mini-fixed');
                else setSidebarMode('full');
              }}
              className="p-2 pt-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 ease-out group flex items-center justify-center"
              title={
                sidebarMode === 'full' ? "Switch to Auto-expand Mini" : 
                sidebarMode === 'mini-hover' ? "Switch to Full Mini View" : 
                "Switch to Large View"
              }
            >
              {sidebarMode === 'full' ? (
                <PanelLeftClose className="w-5 h-5 group-hover:scale-110 transition-transform" />
              ) : sidebarMode === 'mini-hover' ? (
                <div className="relative">
                  <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-500" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-white dark:border-slate-900" />
                </div>
              ) : (
                <PanelLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 pt-0 pl-0">
              {viewMode === 'social' ? 'Social Hub' : viewMode === 'help' ? 'Support Center' : viewMode === 'list' ? 'Monthly Table' : viewMode === 'kanban' ? 'Kanban Board' : viewMode === 'calendar' ? 'Calendar View' : viewMode === 'profile' ? 'My Profile' : 'Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full transition-all ${showNotifications ? 'bg-slate-100 dark:bg-slate-800 text-amber-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 uppercase tracking-wider"
                        >
                          Mark all read
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto no-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {notifications.map(n => (
                            <div 
                              key={n.id} 
                              className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-amber-50/30' : ''}`}
                              onClick={() => handleNotificationClick(n)}
                            >
                              {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-xs font-bold ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>{n.title}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-slate-400 font-medium">{n.time}</span>
                                  <button 
                                    onClick={(e) => handleClearNotification(e, n.id)}
                                    className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                    title="Clear notification"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{n.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-6 h-6 text-slate-300" />
                          </div>
                          <p className="text-xs text-slate-400 font-medium">No new notifications</p>
                        </div>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                        <button 
                          onClick={handleClearAllNotifications}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-wider transition-colors"
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Title & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">

              {viewMode !== 'admin' && viewMode !== 'profile' && viewMode !== 'social' && viewMode !== 'help' && (
                <div className="flex items-center gap-1.5 sm:gap-3 overflow-visible pb-1 lg:pb-0">
                  <div className="relative inline-block text-left">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm h-9 sm:h-10 shrink-0 overflow-hidden">
                      <button 
                        onClick={() => {
                          handleExportCSV(false);
                          setShowExportMenu(false);
                        }}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-full text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all border-r border-slate-200"
                        title="Export with Data"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExportMenu(!showExportMenu);
                        }}
                        className={`flex items-center justify-center w-8 sm:w-10 h-full transition-all ${showExportMenu ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        title="Export Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <AnimatePresence>
                      {showExportMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-[60]" 
                            onClick={() => setShowExportMenu(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[70] overflow-hidden"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportCSV(false);
                                setShowExportMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-slate-900">Export with Data</div>
                                <div className="text-[10px] text-slate-400 font-normal">Full content library to CSV</div>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportCSV(true);
                                setShowExportMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50"
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Layout className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-slate-900">Format Only (Template)</div>
                                <div className="text-[10px] text-slate-400 font-normal">Empty template for import</div>
                              </div>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {profile?.role === 'marketing_supervisor' && (
                    <>
                      <input 
                        type="file" 
                        id="csv-import" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={handleImportCSV}
                      />
                      <button 
                        onClick={() => document.getElementById('csv-import')?.click()}
                        disabled={isSeeding}
                        className="group relative flex items-center gap-1.5 sm:gap-2 bg-slate-900 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        title="Import CSV"
                      >
                        <Upload className="w-3.5 h-3.5 sm:w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline">{isSeeding ? 'Importing...' : 'Import'}</span>
                        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 sm:group-hover:opacity-0 transition-opacity whitespace-nowrap pointer-events-none z-50">
                          {isSeeding ? 'Importing...' : 'Import CSV'}
                        </span>
                      </button>
                    </>
                  )}

                  <button 
                    onClick={() => handleOpenModal()}
                    className="group relative flex items-center gap-1.5 sm:gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 p-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm shrink-0"
                    title="Create New Post"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Create Post</span>
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-amber-600 text-slate-900 text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 sm:group-hover:opacity-0 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      Create New Post
                    </span>
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'admin' ? (
              <AdminView 
                notificationSettings={notifSettings}
                onUpdateNotificationSettings={handleUpdateNotifSettings}
                governanceSettings={governanceSettings}
                onUpdateGovernanceSettings={handleUpdateGovernanceSettings}
                exportSettings={exportSettings}
                onUpdateExportSettings={handleUpdateExportSettings}
                addNotification={(title, message, type) => {
                  if (type === 'success') toast.success(message);
                  else if (type === 'warning') toast.error(message);
                  else toast(message); // toast does not have info by default in react-hot-toast
                }}
                quickLinks={quickLinks}
                onUpdateQuickLinks={handleUpdateQuickLinks}
                socialLinks={socialLinks}
                onUpdateSocialLinks={handleUpdateSocialLinks}
                onRestore={handleRestoreOldData}
                isSeeding={isSeeding}
                profile={profile}
                pendingConcernsCount={activeConcernsCount}
              />
            ) : viewMode === 'help' ? (
              <HelpView 
                userEmail={user.email} 
                displayName={profile?.displayName || user.email} 
                userId={user.uid}
              />
            ) : viewMode === 'profile' ? (
              <ProfileView 
                profile={profile}
                onLogout={logout}
                onUpdateProfile={updateProfile}
              />
            ) : (
              <>
                {/* Month Navigation & Filters */}
                {viewMode !== 'social' && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
                      <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4 sm:w-5 h-5" />
                      </button>
                      <div className="px-1 sm:px-3 font-bold text-slate-800 min-w-[100px] sm:min-w-[160px] text-center text-xs sm:text-sm">
                        {format(currentMonth, 'MMMM yyyy')}
                      </div>
                      <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors">
                        <ChevronRight className="w-4 h-4 sm:w-5 h-5" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={handleToday}
                      className="group relative text-xs sm:text-sm font-bold text-slate-600 hover:text-amber-600 p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-xl shadow-sm transition-all shrink-0"
                      title="Today"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 sm:hidden" />
                      <span className="hidden sm:inline">Today</span>
                    </button>

                    <div className="flex-1 min-w-[140px] sm:max-w-xs relative shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm text-xs sm:text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl shadow-sm shrink-0">
                        <button 
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                          title="List View"
                        >
                          <LayoutList className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setViewMode('kanban')}
                          className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-slate-100 text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                          title="Kanban View"
                        >
                          <Columns className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setViewMode('calendar')}
                          className={`p-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                          title="Calendar View"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                        <select 
                          className="flex-1 sm:flex-initial bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Ready for Review">Ready for Review</option>
                          <option value="Scheduled">Scheduled</option>
                        </select>
                      </div>
                    </div>
                )}

                {/* View Content */}
                <div className="min-h-[400px]">
                  {viewMode === 'list' && (
                    <MonthlyTableView 
                      currentMonth={currentMonth}
                      tableColumns={tableColumns}
                      posts={filteredPosts}
                      handleUpdatePostInline={handleUpdatePostInline}
                      handleCreateForDate={handleCreateForDate}
                      showColumnSettings={showColumnSettings}
                      setShowColumnSettings={setShowColumnSettings}
                      setTableColumns={setTableColumns}
                      toggleColumnVisibility={toggleColumnVisibility}
                      addCustomColumn={addCustomColumn}
                      sensors={sensors}
                      handleDragEnd={handleDragEnd}
                      isColumnsLocked={isColumnsLocked}
                      setIsColumnsLocked={setIsColumnsLocked}
                      handleCopy={handleCopy}
                      copiedId={copiedId}
                      setPreviewImageIndex={setPreviewImageIndex}
                      handleOpenModal={handleOpenModal}
                      handleOpenShareModal={handleOpenShareModal}
                      handleOpenFBModal={handleOpenFBModal}
                      handleDeletePost={handleDeletePost}
                      handleApproveDeletion={handleApproveDeletion}
                      handleRejectDeletion={handleRejectDeletion}
                      userRole={profile?.role}
                      searchQuery={searchQuery}
                      columnSettingsRef={columnSettingsRef}
                      highlightedPostId={highlightedPostId}
                      governanceSettings={governanceSettings}
                      profile={profile}
                      canDelete={!governanceSettings.restrictDeletionToSupervisor || profile?.role === 'marketing_supervisor'}
                    />
                  )}
                  {viewMode === 'social' && (
                    <SocialHubView
                      posts={posts}
                      handleOpenFBModal={handleOpenFBModal}
                      handleDeletePost={handleDeletePost}
                      handleDeletePostFromFB={handleDeletePostFromFB}
                      handleApproveDeletion={handleApproveDeletion}
                      handleRejectDeletion={handleRejectDeletion}
                      userRole={profile?.role}
                      governanceSettings={governanceSettings}
                      canDelete={!governanceSettings.restrictDeletionToSupervisor || profile?.role === 'marketing_supervisor'}
                      handleCreateForDate={(date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        handleCreateForDate(dateStr, true).then(p => {
                          if (p) {
                            handleOpenFBModal(p);
                          }
                        });
                      }}
                    />
                  )}
                  {viewMode === 'kanban' && (
                    <KanbanView 
                      filteredPosts={filteredPosts}
                      setFormData={setFormData}
                      handleOpenModal={handleOpenModal}
                      handleOpenShareModal={handleOpenShareModal}
                      handleOpenFBModal={handleOpenFBModal}
                    />
                  )}
                  {viewMode === 'calendar' && (
                    <CalendarView 
                      currentMonth={currentMonth}
                      posts={filteredPosts}
                      handleCreateForDate={handleCreateForDate}
                      handleOpenModal={handleOpenModal}
                      handleOpenShareModal={handleOpenShareModal}
                      handleOpenFBModal={handleOpenFBModal}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal / Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingPost ? 'Edit Post' : 'Create New Post'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as PostStatus }))}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Ready for Review">Ready for Review</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500 uppercase">Creatives</label>
                    <span className="text-[10px] text-slate-400 italic">Drag & drop or paste images here</span>
                  </div>
                  <div 
                    className={`flex flex-wrap gap-3 p-4 border-2 border-dashed rounded-xl transition-all ${
                      isDraggingOver 
                        ? 'border-amber-500 bg-amber-50/50 shadow-inner' 
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {formData.creatives?.map((creative, idx) => (
                      <div key={idx} className="relative group h-20 w-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                        <img 
                          src={creative} 
                          alt={`Creative ${idx}`} 
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => removeCreative(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-all"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[10px] font-medium">Upload</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Content Title</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.contentTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentTitle: e.target.value }))}
                    >
                      {CONTENT_TITLES.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Content Type</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.contentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
                    >
                      {CONTENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Format</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.format}
                      onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                    >
                      {FORMATS.map(format => (
                        <option key={format} value={format}>{format}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 uppercase">Funnel Status</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      value={formData.funnelStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, funnelStatus: e.target.value }))}
                    >
                      {FUNNEL_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase">Topic / Theme</label>
                  <input 
                    type="text" 
                    placeholder="What is this content about?"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    value={formData.topicTheme}
                    onChange={(e) => setFormData(prev => ({ ...prev, topicTheme: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase">Custom AI Instructions (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g., Make it sound more casual, mention a specific event, or use a particular tone."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none text-sm"
                    value={formData.customPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase">Visual Ideas (URL)</label>
                  <input 
                    type="url" 
                    placeholder="Link to Canva, Figma, etc."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    value={formData.visualIdeas}
                    onChange={(e) => setFormData(prev => ({ ...prev, visualIdeas: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-medium text-slate-500 uppercase">Caption</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="p-1 text-slate-400 hover:text-amber-600 disabled:text-slate-200 transition-colors"
                            title="Undo"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={handleRedo}
                            disabled={historyIndex >= captionHistory.length - 1}
                            className="p-1 text-slate-400 hover:text-amber-600 disabled:text-slate-200 transition-colors"
                            title="Redo"
                          >
                            <Redo2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {formData.caption && (
                          <button 
                            onClick={() => handleCopy(formData.caption!, 'modal')}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-amber-600 transition-colors px-2 py-0.5 bg-slate-100 rounded"
                          >
                            {copiedId === 'modal' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            {copiedId === 'modal' ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={handleGenerateCaption}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:text-slate-400 transition-colors"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Generate with AI
                    </button>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Write your caption here or use AI to generate one..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none text-sm"
                    value={formData.caption}
                    onChange={(e) => updateCaption(e.target.value)}
                  />
                  <div className="text-[10px] text-slate-400 text-right">
                    History: {historyIndex + 1} / {captionHistory.length}
                  </div>
                </div>

                {/* Social Media Redirection */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-xs font-medium text-slate-500 uppercase">Publish & Preview</label>
                  <div className="flex flex-wrap gap-3">
                    {socialLinks.facebook && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <a 
                            href={socialLinks.facebook} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#1877F2]/20"
                          >
                            <Facebook className="w-4 h-4" />
                            View Page
                          </a>
                          {editingPost && <FBStatusBadge post={editingPost} />}
                        </div>
                        <button 
                          onClick={() => {
                            if (editingPost) {
                              handleOpenFBModal({
                                ...editingPost,
                                caption: formData.caption || editingPost.caption,
                                creatives: formData.creatives || editingPost.creatives
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white hover:bg-[#0e63d1] rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Send className="w-4 h-4" />
                          Post/Schedule to FB
                        </button>
                      </div>
                    )}
                    {socialLinks.instagram && (
                      <a 
                        href={socialLinks.instagram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#E4405F]/20"
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                    )}
                    {socialLinks.linkedin && (
                      <a 
                        href={socialLinks.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#0A66C2]/20"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    )}
                    {!socialLinks.facebook && !socialLinks.instagram && !socialLinks.linkedin && (
                      <p className="text-[10px] text-slate-400 italic">No social links configured in Settings.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                {editingPost && (
                  editingPost.deletionRequested ? (
                    profile?.role === 'marketing_supervisor' ? (
                      <div className="flex items-center gap-2 mr-auto">
                        <button 
                          onClick={() => handleApproveDeletion(editingPost.id)}
                          className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectDeletion(editingPost.id)}
                          className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Deny
                        </button>
                      </div>
                    ) : (
                      <div className="mr-auto flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Deletion Pending Approval</span>
                      </div>
                    )
                  ) : (!governanceSettings.restrictDeletionToSupervisor || profile?.role === 'marketing_supervisor') && (
                    <button 
                      onClick={() => handleDeletePost(editingPost.id)}
                      className="px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mr-auto flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {governanceSettings.requireDeletionApproval && profile?.role !== 'marketing_supervisor' ? 'Request Deletion' : 'Delete Post'}
                    </button>
                  )
                )}
                <button 
                  onClick={handleSavePost}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                  Save Post
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Details Panel */}
      <AnimatePresence>
        {isShareModalOpen && sharingPost && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}>
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Share className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Post Details</h2>
                </div>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Social Links Section */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Social Media Redirection</h3>
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.facebook && (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center justify-between">
                          <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#1877F2]/10 text-[#1877F2] rounded-lg text-xs font-bold hover:bg-[#1877F2]/20 transition-colors">
                            <Facebook className="w-4 h-4" /> Facebook Page
                          </a>
                          {sharingPost && <FBStatusBadge post={sharingPost} />}
                        </div>
                      </div>
                    )}
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#E4405F]/10 text-[#E4405F] rounded-lg text-xs font-bold hover:bg-[#E4405F]/20 transition-colors">
                        <Instagram className="w-4 h-4" /> Instagram
                      </a>
                    )}
                    {socialLinks.linkedin && (
                      <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#0A66C2]/10 text-[#0A66C2] rounded-lg text-xs font-bold hover:bg-[#0A66C2]/20 transition-colors">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    )}
                    {socialLinks.tiktok && (
                      <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-black/10 text-black rounded-lg text-xs font-bold hover:bg-black/20 transition-colors">
                        <Music2 className="w-4 h-4" /> TikTok
                      </a>
                    )}
                    {!socialLinks.facebook && !socialLinks.instagram && !socialLinks.linkedin && !socialLinks.tiktok && (
                      <p className="text-[10px] text-slate-400 italic">No social links configured.</p>
                    )}
                  </div>
                </div>

                {/* Post Details Section */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Date" value={sharingPost.date} />
                    <DetailItem label="Status" value={sharingPost.status} />
                    <DetailItem label="Content Title" value={sharingPost.contentTitle} />
                    <DetailItem label="Content Type" value={sharingPost.contentType} />
                    <DetailItem label="Format" value={sharingPost.format} />
                    <DetailItem label="Funnel Status" value={sharingPost.funnelStatus} />
                  </div>
                  
                  <DetailItem label="Topic / Theme" value={sharingPost.topicTheme} fullWidth />
                  <DetailItem label="Subtopic" value={sharingPost.subtopic} fullWidth />
                  
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caption</p>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap relative group">
                      {sharingPost.caption || <span className="italic text-slate-400">No caption provided</span>}
                      {sharingPost.caption && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(sharingPost.caption || '');
                            setCopiedId('caption');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-md [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity hover:bg-slate-50"
                          title="Copy Caption"
                        >
                          {copiedId === 'caption' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {sharingPost.creatives && sharingPost.creatives.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creatives</p>
                      <div className="flex flex-wrap gap-2">
                        {sharingPost.creatives.map((url, idx) => (
                          <img 
                            key={idx} 
                            src={url} 
                            alt={`Creative ${idx}`} 
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImageIndex({ post: sharingPost, index: idx })}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <DetailItem label="Visual Ideas" value={sharingPost.visualIdeas} fullWidth isLink />
                  <DetailItem label="Notes" value={sharingPost.notes} fullWidth />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Lightbox */}
      <AnimatePresence>
        {previewImageIndex && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl"
            onClick={() => setPreviewImageIndex(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image with Navigation */}
              <div className="relative w-full flex-1 flex items-center justify-center">
                <img 
                  src={previewImageIndex.post.creatives![previewImageIndex.index]} 
                  alt="Preview" 
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/20"
                  referrerPolicy="no-referrer"
                />

                {previewImageIndex.post.creatives && previewImageIndex.post.creatives.length > 1 && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 sm:px-12 pointer-events-none">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageIndex(prev => {
                          if (!prev) return null;
                          const nextIdx = (prev.index - 1 + prev.post.creatives!.length) % prev.post.creatives!.length;
                          return { ...prev, index: nextIdx };
                        });
                      }}
                      className="p-4 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-md border border-white/20 pointer-events-auto"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageIndex(prev => {
                          if (!prev) return null;
                          const nextIdx = (prev.index + 1) % prev.post.creatives!.length;
                          return { ...prev, index: nextIdx };
                        });
                      }}
                      className="p-4 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-md border border-white/20 pointer-events-auto"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stats & Close */}
              <div className="flex items-center gap-4 text-white">
                <div className="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 font-bold text-sm">
                  {previewImageIndex.index + 1} / {previewImageIndex.post.creatives?.length}
                </div>
                <button 
                  onClick={() => setPreviewImageIndex(null)}
                  className="p-3 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Thumbnails list */}
              <div className="flex gap-2 p-2 bg-white/5 rounded-2xl backdrop-blur-md border border-white/5 max-w-full overflow-x-auto no-scrollbar">
                {previewImageIndex.post.creatives?.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setPreviewImageIndex({ ...previewImageIndex, index: idx })}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all ${previewImageIndex.index === idx ? 'ring-4 ring-indigo-500 scale-110 z-10' : 'opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FacebookPostModal 
        isOpen={isFBModalOpen} 
        onClose={() => setIsFBModalOpen(false)}
        post={selectedFBPost}
        handleDeleteFromFB={handleDeletePostFromFB}
        userRole={profile?.role}
        governanceSettings={governanceSettings}
        onSuccess={(fId, fStatus) => {
          if (selectedFBPost) {
            const title = fStatus === 'posted' ? 'Post Published' : 'Post Scheduled';
            const msg = fStatus === 'posted' ? 'A post has been published to Facebook!' : 'A post has been scheduled for Facebook.';
            addNotification('onPostPublished', title, msg, selectedFBPost.id);
            notifyAll('onPostPublished', title, msg, selectedFBPost.id);
          }
        }}
      />
    </div>
  );
}

interface SortableHeaderProps {
  col: TableColumn;
  isLocked: boolean;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ col, isLocked }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: col.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <th 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`${col.width} px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${isLocked ? '' : 'cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-slate-800'} transition-colors relative group`}
    >
      <div className="flex items-center gap-2">
        {!isLocked && <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-700 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity" />}
        {col.label}
      </div>
    </th>
  );
};

interface SortableColumnItemProps {
  col: TableColumn;
  toggleColumnVisibility: (id: ColumnId) => void;
  setTableColumns: Dispatch<SetStateAction<TableColumn[]>>;
  isLocked: boolean;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ 
  col, 
  toggleColumnVisibility, 
  setTableColumns,
  isLocked
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: col.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : undefined,
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group ${isDragging ? 'bg-white dark:bg-slate-800 shadow-lg ring-1 ring-indigo-200 dark:ring-indigo-900/40 opacity-80' : ''}`}
    >
      <div className="flex items-center gap-3">
        {!isLocked && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 dark:text-slate-600">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <input 
          type="checkbox" 
          checked={col.visible}
          onChange={() => toggleColumnVisibility(col.id)}
          className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500"
        />
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
      </div>
      <div className="flex items-center gap-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
        <select 
          value={col.width}
          onChange={(e) => setTableColumns(prev => prev.map(c => c.id === col.id ? { ...c, width: e.target.value } : c))}
          className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <option value="w-24" className="bg-white dark:bg-slate-900">XS</option>
          <option value="w-32" className="bg-white dark:bg-slate-900">S</option>
          <option value="w-40" className="bg-white dark:bg-slate-900">M</option>
          <option value="w-48" className="bg-white dark:bg-slate-900">L</option>
          <option value="w-64" className="bg-white dark:bg-slate-900">XL</option>
          <option value="w-80" className="bg-white dark:bg-slate-900">XXL</option>
        </select>
        <button 
          onClick={() => {
            const newName = prompt('Enter new column name:', col.label);
            if (newName) {
              setTableColumns(prev => prev.map(c => c.id === col.id ? { ...c, label: newName } : c));
            }
          }}
          className="p-1 hover:bg-indigo-100 text-indigo-500 rounded"
          title="Rename Column"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        {col.id.toString().startsWith('custom_') && (
          <button 
            onClick={() => setTableColumns(prev => prev.filter(c => c.id !== col.id))}
            className="p-1 hover:bg-rose-100 text-rose-500 rounded"
            title="Delete Column"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}



