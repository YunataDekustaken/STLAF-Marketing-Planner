import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  Send, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  Facebook,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  History,
  Clock,
  User,
  Shield,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface HelpViewProps {
  userEmail: string | null;
  displayName: string | null;
  userId: string | null;
}

export const HelpView: React.FC<HelpViewProps> = ({ userEmail, displayName, userId }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'contact' | 'history'>('guide');
  const [subject, setSubject] = useState('');
  const [concern, setConcern] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myConcerns, setMyConcerns] = useState<any[]>([]);
  const [userReplyText, setUserReplyText] = useState<{ [key: string]: string }>({});
  const [isReplying, setIsReplying] = useState<{ [key: string]: boolean }>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'concerns'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setMyConcerns(entries);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concern.trim()) return;

    setIsSubmitting(true);
    try {
      const initialMessage = {
        text: concern,
        senderId: userId,
        senderName: displayName || userEmail,
        role: 'user',
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'concerns'), {
        userId: userId,
        userEmail: userEmail,
        userName: displayName || userEmail,
        subject: subject.trim() || 'No Subject',
        messages: [initialMessage],
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      toast.success("Concern submitted. A supervisor will review it shortly.");
      setConcern('');
      setSubject('');
      setActiveTab('history');
    } catch (error) {
      console.error("Error submitting concern:", error);
      toast.error("Failed to submit concern. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserReply = async (concernId: string) => {
    const text = userReplyText[concernId];
    if (!text?.trim()) return;

    setIsReplying(prev => ({ ...prev, [concernId]: true }));
    try {
      const newMessage = {
        text: text.trim(),
        senderId: userId,
        senderName: displayName || userEmail,
        role: 'user',
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'concerns', concernId), {
        messages: arrayUnion(newMessage),
        status: 'pending' // Reset to pending when user replies
      });
      
      setUserReplyText(prev => ({ ...prev, [concernId]: '' }));
      toast.success("Reply sent.");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply.");
    } finally {
      setIsReplying(prev => ({ ...prev, [concernId]: false }));
    }
  };

  const guideSections = [
    {
      title: "Content Planning",
      icon: <Calendar className="w-5 h-5 text-indigo-500" />,
      content: "Use the Calendar and Social Hub to plan your content. You can drag and drop (if supported) or click any date to create a new task. Tasks can be tracked through stages from 'Not Started' to 'Published'.",
      color: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      title: "AI Generation",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      content: "When editing a post, use the 'AI Magic' sidebar to generate catchy captions. You can provide a topic and select the desired tone (e.g., Professional, Playful, Urgent) to get AI-powered results.",
      color: "bg-amber-50 dark:bg-amber-900/20"
    },
    {
      title: "Facebook Integration",
      icon: <Facebook className="w-5 h-5 text-blue-500" />,
      content: "Connect your Facebook Page through the Meta Settings in the Dashboard. Once connected, you can publish or schedule posts directly to your Page from the Planner.",
      color: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Governance & Approvals",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      content: "Depending on your role, you may need supervisor approval to delete content or finalize schedules. If governance toggles are active, system restrictions keep the workflow safe and professional.",
      color: "bg-emerald-50 dark:bg-emerald-900/20"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
            <HelpCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            Support Center
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Resources and direct lines to your marketing supervisors.</p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('guide')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'guide' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            User Guide
          </button>
          <button 
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'contact' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Contact Supervisor
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            My Concerns
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'guide' ? (
          <motion.div 
            key="guide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {guideSections.map((section, idx) => (
              <div 
                key={idx}
                className="group p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 ${section.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  {section.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{section.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
                  {section.content}
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}

            <div className="md:col-span-2 p-8 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-4">Master Your Workflow</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {['Create', 'Generate', 'Connect'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                        {i + 1}
                      </div>
                      <span className="font-bold">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <HelpCircle className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
            </div>
          </motion.div>
        ) : activeTab === 'contact' ? (
          <motion.div 
            key="contact"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-10 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Direct Concern Box</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your message will be sent directly to the Marketing Supervisors.</p>
                </div>
              </div>

              <form onSubmit={handleSubmitConcern} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Topic / Subject</label>
                  <input 
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief title for your concern..."
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white focus:outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Your Message / Concern</label>
                  <textarea 
                    value={concern}
                    onChange={(e) => setConcern(e.target.value)}
                    required
                    placeholder="Describe your concern or question here..."
                    className="w-full h-40 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white focus:outline-none transition-all resize-none font-medium"
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    Messages are private. We aim to respond within 24-48 business hours. For technical errors, please include context or error messages.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || !concern.trim()}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <Sparkles className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Send to Supervisors
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-4xl mx-auto"
          >
            <div className="space-y-8">
              {/* Active Concerns Section */}
              <section>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  Active Support Requests
                </h3>
                <div className="space-y-4">
                  {myConcerns.filter(c => c.status !== 'resolved').length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-slate-400 font-bold italic">No active concerns.</p>
                    </div>
                  ) : (
                    myConcerns.filter(c => c.status !== 'resolved').map(item => (
                      <div key={item.id} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                              item.status === 'reviewed' 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            }`}>
                              {item.status}
                            </span>
                            {item.status !== 'resolved' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'concerns', item.id), { status: 'resolved' });
                                    toast.success("Marked as resolved.");
                                  } catch (err) {
                                    toast.error("Failed to update status.");
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-bold italic">
                            {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-800 pb-2">{item.subject}</h4>
                        
                        <div className="space-y-4 mb-8">
                          {!item.messages && item.message && (
                            <div className="flex justify-end">
                              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">You</span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed">{item.message}</p>
                              </div>
                            </div>
                          )}
                          {(item.messages || []).map((msg: any, idx: number) => (
                            <div key={idx} className={`flex ${msg.role === 'supervisor' ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                msg.role === 'supervisor' 
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-slate-900 dark:text-slate-100 border border-indigo-100 dark:border-indigo-800' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  {msg.role === 'supervisor' ? <Shield className="w-3 h-3 text-indigo-500" /> : <User className="w-3 h-3 text-slate-400" />}
                                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                    {msg.role === 'supervisor' ? 'Supervisor' : 'You'}
                                  </span>
                                  <span className="text-[10px] opacity-40 ml-auto">
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* User Reply Input */}
                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                          <div className="relative group">
                            <input 
                              type="text"
                              value={userReplyText[item.id] || ''}
                              onChange={(e) => setUserReplyText(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleUserReply(item.id)}
                              placeholder="Type your reply..."
                              className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 text-sm font-medium outline-none transition-all pr-16"
                            />
                            <button 
                              onClick={() => handleUserReply(item.id)}
                              disabled={isReplying[item.id] || !(userReplyText[item.id] || '').trim()}
                              className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all flex items-center justify-center"
                            >
                              {isReplying[item.id] ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Resolved Concerns Section */}
              <section className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Past Concerns
                </h3>
                <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                  {myConcerns.filter(c => c.status === 'resolved').length === 0 ? (
                    <p className="text-xs text-slate-400 italic">History is clear.</p>
                  ) : (
                    myConcerns.filter(c => c.status === 'resolved').map(item => (
                      <div key={item.id} className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl grayscale hover:grayscale-0 transition-all flex items-start justify-between gap-4 group">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.subject}</h4>
                             <span className="text-[10px] text-slate-400 font-bold">{item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString() : ''}</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 italic">
                            "{item.messages && item.messages.length > 0 ? item.messages[0].text : (item.message || 'No content')}"
                          </p>
                        </div>
                        
                        {isDeleting === item.id ? (
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={async () => {
                                 try {
                                   await deleteDoc(doc(db, 'concerns', item.id));
                                   toast.success("Record deleted.");
                                   setIsDeleting(null);
                                 } catch (err) {
                                   toast.error("Failed to delete.");
                                 }
                               }}
                               className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black"
                             >
                               OK
                             </button>
                             <button onClick={() => setIsDeleting(null)} className="text-[10px] text-slate-400">Esc</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsDeleting(item.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
