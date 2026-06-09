//
// File: HelpView.tsx
// Author: Raphael Mendoza
// Date: 2026-06-09
// Purpose: Renders the Help & Support page with user guides, Facebook setup instructions, contact forms, and history tracking.
//

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
  Trash2,
  X,
  ChevronDown,
  Settings,
  Key,
  Sliders,
  AppWindow,
  Lock,
  RefreshCw,
  Info,
  Mail,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

const captionImg = '/img/CAPTION.png';
const editPoImg = '/img/EditPo.png';

interface HelpViewProps {
  userEmail: string | null;
  displayName: string | null;
  userId: string | null;
  initialTab?: 'guide' | 'setup' | 'contact' | 'history';
  initialGuideTitle?: string;
  initialTopicIndex?: number;
}

export const HelpView: React.FC<HelpViewProps> = ({ 
  userEmail, 
  displayName, 
  userId, 
  initialTab, 
  initialGuideTitle, 
  initialTopicIndex 
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'setup' | 'contact' | 'history'>('guide');
  const [openSetupStep, setOpenSetupStep] = useState<number | null>(0);
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
      toast.success("Concern submitted. The support team will review it shortly.");
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
      title: "Getting Started",
      icon: <CheckCircle2 className="w-5 h-5 text-sky-500" />,
      content: "Learn the foundational steps to navigate the platform, from your first login to configuring your workspace for success.",
      longContent: "Welcome to the Marketing Operations Portal. To get started, ensure you are logged in using your authorized organizational email. The navigation sidebar allows you to jump between the Content Planner (main hub), the Social Hub (history & metrics), and your Personal Profile. For administrators, the Admin Tab is the central place to configure API integrations and manage team roles.",
      topics: [
        {
          title: "Initial Login",
          content: "1. Access the portal via the provided URL.\n2. Log in using your registered Firebase Authentication credentials.\n3. Upon entry, you'll be directed to the 'Month' view of the Planner by default, showing the current month's campaign activities."
        },
        {
          title: "Navigation 101",
          content: "• Sidebar: Toggle between planning views and administrative tools.\n• Search Bar: Locate specific content titles or topics across the entire database.\n• Role Dashboard: In the top right, you can see your current role and sign out.\n• Theme Toggle: Switch between Light and Dark mode based on your preference."
        },
        {
          title: "Profile Setup",
          content: "Visit your User Settings to set your display name and check your permissions. If you are a supervisor, ensure you have configured the 'Governance' settings in the Admin tab to enable or disable deletion approvals."
        }
      ],
      color: "bg-sky-50 dark:bg-sky-900/20"
    },
    {
      title: "Content Planning",
      icon: <Calendar className="w-5 h-5 text-indigo-500" />,
      content: "Organize your social media strategy using multiple view modes. Track content from ideation to final publication.",
      longContent: "The Content Planner is where most of your work happens. It allows for high-level visualization and granular control over every piece of digital content being produced.",
      topics: [
        {
          title: "Switching View Modes",
          content: "Use the view switcher at the top of the Planner to alternate between:\n\n• Table View: Best for batch editing and viewing dense data (captions, links, notes).\n• Kanban Board: Visualizes the pipeline. Drag cards between 'Not Started', 'In Progress', 'For Review', 'Approved', 'Scheduled', and 'Published'.\n• Month View: A traditional calendar grid for checking campaign spacing and deadlines."
        },
        {
          title: "Creating a Post",
          content: "1. Click the 'Create New' button or click on a specific date in the Calendar/Table.\n2. Fill in the 'Content Title' (this is the internal identifier).\n3. Set the 'Topic/Theme' and choose from predefined 'Content Types' (e.g., Reel, Carousel, Photo).\n4. Assign a 'Format' and 'Objective' (Awareness, Conversion, etc.) to help with sorting and reporting."
        },
        {
          title: "Collaboration & Attachments",
          content: "Inside each post editor, you can upload 'Deliverables'. These are the actual media files (images/videos) that will be posted. Creative team members can upload files, and Supervisors can review them directly from the panel. You can also add 'Internal Notes' for team-only communication that won't be published."
        }
      ],
      color: "bg-indigo-50 dark:bg-indigo-900/20"
    },
    {
      title: "AI Generation",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      content: "When editing a post, use the 'AI Magic' sidebar to generate catchy captions. You can provide a topic and select the desired tone to get AI-powered results.",
      longContent: "Powered by Gemini, the AI Magic engine understands your campaign's context to generate multiple variations of social media captions based on your topic and chosen tone.",
      topics: [
        {
          title: "Overview",
          content: "The AI Magic engine, powered by Gemini, helps you brainstorm and generate high-quality captions tailored to your audience. It takes the heavy lifting out of copywriting by offering variations based on your chosen tone and topic."
        },
        {
          title: "How to use it?",
          content: "There are two ways to access the AI Magic tool from the Planner:\n\n1. From the Captions Column: Hover over the caption cell of any post and click the 'Sparkles' (✨) icon to instantly open the AI Generation sidebar.\n2. From the Actions Column: Click the 'Edit' (pencil) icon to open the post editor, then locate the 'AI Magic' section in the right sidebar.\n\nOnce open:\n3. Type your main topic or idea into the 'Topic' text field.\n4. Select a preferred 'Tone' (e.g., Professional, Playful, FOMO, Educational) to set the mood.\n5. Click the 'Click to generate' button.\n6. The AI will provide several caption options. You can easily click on one to insert it into your post's caption field.",
          images: [
            { url: captionImg, alt: "Accessing from the Captions Column", caption: "Accessing from the Captions Column" },
            { url: editPoImg, alt: "Accessing from the Actions Column", caption: "Accessing from the Actions Column" }
          ]
        },
        {
          title: "Usage Limits",
          content: "To ensure fair usage and maintain system performance, there is a global limit of 20 AI generations per day across the entire application. This limit automatically resets at midnight every day. If the application reaches this limit, you will need to wait until the next day to generate more captions."
        }
      ],
      color: "bg-amber-50 dark:bg-amber-900/20"
    },
    {
      title: "Facebook Integration",
      icon: <Facebook className="w-5 h-5 text-blue-500" />,
      content: "Connect your Facebook Page and Instagram Business account through the Meta Settings in the Dashboard. Once connected, you can publish or schedule posts directly to your social pages from the Planner.",
      longContent: `Direct Meta API integration allows you to sync your marketing efforts across Facebook and Instagram seamlessly.`,
      topics: [
        {
          title: "1. Overview",
          content: "### Direct Meta API Integration\n\nThis application connects directly with Meta's Graph API to publish and schedule social content automatically without manual copy-pasting. \n\nBy leveraging the Meta Graph API v19.0+ and server-side authentication, once your keys are set up, all authorized marketing users and supervisors can post updates, link campaigns, and schedule content directly from our planner in real-time.\n\n### Key Concepts:\n\n• **Page ID**: A unique numerical identifier for your Facebook Business Page.\n• **Page Access Token**: A special cryptographic key that authorizes this web application to act on behalf of your Facebook Page. To prevent repetitive logins, we use a **Never-Expiring Long-Lived Token**.\n• **Instagram Business Discovery**: To post to Instagram, your Instagram Professional account must be connected to your Facebook Page. The Meta API automatically detects this link, so you only need to manage a single Facebook token!"
        },
        {
          title: "2. Create Meta App",
          content: "### Part 1: How to Create your Custom Meta Developer App\n\nTo connect the Facebook Page, you need to register a Developer Application on the Meta App Portal. Follow these exact steps:\n\n1. Go to the [Meta developers portal](https://developers.facebook.com/) and click **Log In** in the top-right corner. Log in with your primary Facebook account associated with the target Facebook Page.\n2. Once logged in, click **My Apps** in the navigation bar.\n3. Click the green **Create App** button.\n4. Select **Other** as your app use-case, then click **Next**.\n5. Choose **Business** as your app type. (This is critical because it unlocks the permissions required to manage and publish page and Instagram posts). Click **Next**.\n6. Fill in your details:\n   • **App Display Name**: Enter a descriptive name (e.g., `Marketing Planner Integration`).\n   • **App Contact Email**: Use your primary developer email address.\n   • **Business Portfolio**: If you have a Meta Business Account (Business Manager), select it from the dropdown here. If not, you can leave it empty for now (though linking it later is required for production live-posting).\n7. Click **Create App** and enter your password if prompted."
        },
        {
          title: "3. Configure Permissions",
          content: "### Part 2: Adding Products & Authorizing Graph API\n\nNow that your Meta App is created, you must request permissions and generate your credentials:\n\n1. In your app's dashboard, look at the left sidebar menu. Locate the **Tools** cascading menu and click on **Graph API Explorer**.\n2. In the right side of the Graph API Explorer window:\n   • Under **Meta App**, make sure your newly created app is selected.\n   • Under **User or Page**, select **Get User Access Token** from the dropdown menu.\n3. Under the **Permissions** section, you will see default permissions. You must add the following specific permissions by searching or selecting them:\n   • `pages_show_list` (Allows the app to see your Facebook pages)\n   • `pages_read_engagement` (Allows reading page analytics and status)\n   • `pages_manage_posts` (Allows publishing/scheduling posts on your page)\n   • `instagram_basic` (Allows seeing connected Instagram account info)\n   • `instagram_content_publish` (Allows publishing stories, reels, and photos to Instagram)\n4. Click the blue **Generate Access Token** button.\n5. A Facebook login popup will appear. Follow the prompts:\n   • Select **Opt-in to all current and future business assets** (or hand-select the specific Facebook Pages and connected Instagram Business accounts you wish to manage).\n   • Confirm the permissions requested and click **Done** then **OK**."
        },
        {
          title: "4. Get Permanent Token",
          content: "### Part 3: Generating a Never-Expiring Page Access Token\n\nBy default, the Graph Explorer token expires in 1 to 2 hours. We need to convert it into a permanent token for this webapp:\n\n1. **Convert User Token to Long-Lived Token (60 days)**:\n   • In the Graph API Explorer, next to the generated access token string, click the small info **i** icon.\n   • Click **Open in Access Token Tool**.\n   • Scroll down and click **Extend Access Token** at the bottom. This will generate a 60-day Long-Lived User Access Token.\n   • Copy this extended access token.\n\n2. **Generate the Permanent Page Access Token**:\n   • Return to the **Graph API Explorer**.\n   • Paste your newly copied 60-day token into the Access Token input field.\n   • In the request path input field (which currently says `me?fields=id,name`), type:\n     `me/accounts`\n   • Click **Submit** on the far right.\n   • Scroll down to inspect the JSON response. You will see an array of your Facebook Pages. Look for the target page in the list.\n   • For your target page, you will see two crucial values:\n     • **`id`**: This is your Facebook Page ID.\n     • **`access_token`**: This is your **Never-Expiring Page Access Token**. Copy this token character-for-character. Save it safely!"
        },
        {
          title: "5. Link to Webapp",
          content: "### Part 4: Saving Credentials into the Portal\n\nOnce you have your Facebook Page ID and the Never-Expiring Page Access Token, save them into the application environment:\n\n1. Access the hosting configuration panel (Admin tab or project `.env` settings depending on your hosting service).\n2. Update the following environment variables:\n   • `FACEBOOK_PAGE_ID` = *[Your Facebook Page ID]*\n   • `FACEBOOK_PAGE_ACCESS_TOKEN` = *[Your Never-Expiring Page Access Token]*\n3. After setting these environment variables, restart the server.\n4. Go into the **Admin** dashboard tab of this application. Under **Integration Status**, locate the **Meta Integration** panel and click the **Sync/Refresh** icon.\n5. The system will make an automated health check call to verify your metadata and display **Connected** along with your Page's name.\n\n### Instagram Requirements:\nTo publish content to Instagram through this setup, ensure your Instagram Account is a **Professional Business Account** and is linked to the target Facebook page via Page Settings -> Connected Accounts."
        },
        {
          title: "6. Resolve Subcode 465",
          content: "### Troubleshooting: Meta Business Link Error (Subcode 465)\n\n#### What it means:\n\"The application does not belong to system user's business or its aggregators's business.\"\nThis occurs because Meta requires that any custom Developer App publishing posts on a Facebook Page owned by a Facebook Business Manager must be linked/associated with that same Business Manager.\n\n#### How to resolve step-by-step:\n1. Go to [Meta Business Settings](https://business.facebook.com/settings).\n2. Select your Business Manager from the dropdown menu in the top left.\n3. In the left navigation bar, expand **Accounts** and select **Apps**.\n4. Click the **Add** dropdown button, then choose **Connect an App ID**.\n5. Enter your Meta Developer App ID (which you can find in the header of developers.facebook.com) and click **Add App**.\n6. Next, click **Users** -> **System Users** in the left sidebar.\n7. Select the system user or manager who generated your token, click **Assign Assets**:\n   • Add your newly connected **App** and assign Full Control.\n   • Add your **Facebook Page** under Pages and assign Full Control.\n8. Regenerate the Page Access Token following **Tab 4 (Get Permanent Token)** to acquire a valid token."
        },
        {
          title: "7. Resolve Subcode 460",
          content: "### Troubleshooting: Session Invalidated Error (Subcode 460)\n\n#### What it means:\n\"The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons.\"\nMeta revokes all active and long-lived access tokens associated with a user profile if that user updates their password, turns on 2FA list modifications, or if Meta detects suspicious login activity on the account.\n\n#### How to resolve step-by-step:\n1. This requires generating a brand new access token. Your previous token is permanently dead.\n2. Access the [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer).\n3. Re-authorize your app by choosing **Get User Access Token** in the dropdown. Standard security scopes (`pages_manage_posts`, `instagram_content_publish`) must be checked.\n4. Follow the instructions starting at **Tab 4 (Get Permanent Token)**:\n   • Extend the User Token to 60-days using the Access Token Tool.\n   • Run `me/accounts` with the long-lived token.\n   • Copy the fresh, permanent `access_token` for your page.\n5. Paste the new token into your environment settings (replacing the old `FACEBOOK_PAGE_ACCESS_TOKEN`), restart the application server, and run a Sync check in the Admin tab."
        }
      ],
      color: "bg-blue-50 dark:bg-blue-900/20"
    },
    {
      title: "Governance & Approvals",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      content: "Depending on your role, you may need supervisor approval to delete content or finalize schedules. If governance toggles are active, system restrictions keep the workflow safe and professional.",
      longContent: "The platform implements a multi-tier authorization system. Regular Marketing users can create and edit drafts, but critical actions like 'Deleting a Published Post' or 'Bypassing Schedule Limits' may require a Marketing Supervisor's approval. Deletion requests appear in the Social Hub for supervisors to review. Status progression is also protected: once a post is 'Scheduled' for Facebook, its core content is locked to prevent accidental changes before deployment.",
      color: "bg-emerald-50 dark:bg-emerald-900/20"
    },
    {
      title: "Social Media Hub",
      icon: <History className="w-5 h-5 text-violet-500" />,
      content: "Track the performance and lifecycle of your published content. View historical data and real-time engagement metrics.",
      longContent: "The Social Hub acts as your command center for everything that has left the Planner and gone live on social media. It provides transparency into post status and historical records.",
      topics: [
        {
          title: "Monitoring Live Posts",
          content: "The Hub displays a stream of 'Linked Content'. Each card shows:\n\n• Live Status: Indicates if the post is still live or has been deleted from Meta.\n• Performance Insights: (If supported) Real-time counts for Reactions, Comments, and Shares.\n• External Links: Quick links to view the post directly on Facebook or Instagram."
        },
        {
          title: "Post History",
          content: "Use the 'History' tab within the Social Hub to see a timeline of all completed publishing actions. You can search this history to see who published what, and on which date. This is crucial for verifying campaign consistency."
        },
        {
          title: "Deletion Requests",
          content: "If governance is enabled, deleting a published post requires a request. These requests appear in the Social Hub. Supervisors can either approve the deletion (removing it from both Meta and the Portal) or reject it, keeping the content live."
        }
      ],
      color: "bg-violet-50 dark:bg-violet-900/20"
    },
    {
      title: "Newsletter Hub",
      icon: <Mail className="w-5 h-5 text-rose-500" />,
      content: "Review, queue, schedule, and authorize your audience email broadcasts directly from approved content planner campaigns.",
      longContent: "The Newsletter Hub is a specialized module that handshakes with your internal CRM or Subscriber Mailing system. It enables you to reuse your social media topics, imagery, or captions to trigger newsletter broadcasts directly to your subscribers & customers.",
      topics: [
        {
          title: "1. Overview & Connection",
          content: "### Unified Content-Newsletter Bridge\n\nThe Newsletter Hub automatically compiles campaign materials from your Planner so you can distribute them to your subscriber base without duplicating work.\n\nBy building an elegant pipeline between your media posts and subscription outreach tools, your creative team can convert approved social posts into high-impact direct newsletters with a single click."
        },
        {
          title: "2. How to Use the Outbox",
          content: "### Step-by-Step Campaign Broadcast Guide\n\n1. **Push to Outbox**:\n   From your main Planner (e.g. inside the edit panel or list view), select your post and choose the **Push to Mailing Outbox** action. This sets its `mailStatus` to 'Pending Authorization' and forwards it to the Newsletter pipeline.\n\n2. **Review Campaign**:\n   Open the **Newsletter Hub** tab. Locate your content under the **Pending** list. You can click the eye icon to preview the formatting, headers, images, and content.\n\n3. **Authorize Delivery**:\n   • **Authorize Now**: Click **Authorize Delivery** next to the item to prompt an immediate queue integration in the mailing system. This updates the status to 'Authorized' / 'Sent'.\n   • **Schedule Future Broadcast**: Click **Schedule Delivery**, input your target date and time in the calendar popover, and confirm. This transitions the post to the **Scheduled** tab."
        },
        {
          title: "3. Direct Mailing App Integration",
          content: "### Connecting Your Launchpad\n\nTo allow seamless deep-linking:\n1. Navigate to the **Admin Settings &gt; Quick Links** tab of this application.\n2. Locate the **Subscriber Mailing App URL** edit field.\n3. Paste the URL of your external email dispatcher or microservice database.\n4. Save changes.\n\nWhen administrators or support members click **Launch Mailing App** inside the Newsletter Hub, the platform handles deep-linking by automatically passing the selected post's parameter (`?postId=[ID]`) to prepare your newsletter draft automatically."
        },
        {
          title: "4. Troubleshooting",
          content: "### Troubleshooting & Diagnostics\n\n#### Error: \"Please configure Subscriber Mailing App URL first\"\n* **Cause**: You clicked a deep-link feature before registering the mailing endpoint.\n* **Fix**: Ask your Support Team or Workspace Administrator to complete the Link Setup in Admin Settings.\n\n#### Issue: Status says \"Authorized\" but emails are not arriving\n* **Cause**: Standard credential mismatch or background polling job interval delays.\n* **Fix**: Ensure your primary sender account has authorized your Workspace OAuth scopes. Check the active Gmail/SMTP relay status connected to your companion subscriber application.\n\n#### Issue: Cannot see any posts in the Newsletter Hub tabs\n* **Cause**: Your posts may not have been pushed to the mailing queue yet, or are filtered out.\n* **Fix**: Expand your filters to 'All', or go back to the Main Planner, select the desired campaign post, and mark its Mail Status as 'Pending Authorization' first to initialize the queue handshake."
        }
      ],
      color: "bg-rose-50 dark:bg-rose-900/20"
    },
    {
      title: "System Infrastructure",
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      content: "The app utilizes two projects: the 'Active Database' (marketing-43c62) for high-speed data and auth, and the 'Provisioned Runtime' for the AI Studio hosting environment and GenAI engine.",
      longContent: "This application's architecture is split for maximum reliability. The 'Active Database' (marketing-43c62) manages our real-time Firestore database and Firebase Authentication, ensuring your workspace is always synced and secure. The 'Provisioned Runtime' (gen-lang-client...) is our hosting environment within Google Cloud/AI Studio, handling the secure processing of LLM requests and the overall system runtime.",
      color: "bg-purple-50 dark:bg-purple-900/20"
    }
  ];

  const setupSteps = [
    {
      title: "Create a Meta Developer App",
      sub: "Register and setup your developer profile & business app type",
      icon: <AppWindow className="w-5 h-5 text-blue-500" />,
      color: "bg-blue-50 dark:bg-blue-900/20",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            To connect a Facebook Page, you must first register a custom application on the Meta Developer Portal. This creates a secure bridge for API queries.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1877F2]">Step-by-step instructions</span>
            <ul className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2 font-medium">
              <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">developers.facebook.com</a> and log in with your primary Facebook account.</li>
              <li>Click <strong className="text-slate-800 dark:text-slate-200">My Apps</strong> and select <strong className="text-slate-800 dark:text-slate-200">Create App</strong>.</li>
              <li>Select <strong className="text-slate-800 dark:text-slate-200">Other</strong>, then click <strong className="text-slate-800 dark:text-slate-200">Next</strong>.</li>
              <li>Choose <strong className="text-slate-800 dark:text-slate-200">Business</strong> as your app type (Required to access Facebook Page publishing APIs). Click <strong className="text-slate-800 dark:text-slate-200">Next</strong>.</li>
              <li>Provide an App Display Name (e.g. <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs text-rose-500">Marketing Operations Hub</code>) and App Contact Email.</li>
              <li>Click <strong className="text-slate-800 dark:text-slate-200">Create App</strong> and complete security verification.</li>
            </ul>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
              <strong>Keep in Mind:</strong> Your Meta App will run in "Development Mode" initially. This is perfect for initial testing and allows you as an administrator to post freely. To go public, you will subsequently undergo Meta App Review.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Configure App Permissions",
      sub: "Request scopes and authorize access via Graph API Explorer",
      icon: <Lock className="w-5 h-5 text-purple-500" />,
      color: "bg-purple-50 dark:bg-purple-900/20",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            Permissions ensure that our application has secure access to publish, schedule, or delete on your specific accounts without risking other access rights.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-purple-500">Permissions configuration</span>
            <ul className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2 font-medium">
              <li>In your App Dashboard left sidebar, find <strong className="text-slate-800 dark:text-slate-200">Tools</strong> and open <strong className="text-slate-800 dark:text-slate-200">Graph API Explorer</strong>.</li>
              <li>Ensure your newly registered App is chosen in the <strong className="text-slate-800 dark:text-slate-200">Meta App</strong> dropdown.</li>
              <li>Change the "User or Page" dropdown to <strong className="text-slate-800 dark:text-slate-200">Get User Access Token</strong>.</li>
              <li>In the "Permissions" search box, add these exact permissions:
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'].map(sc => (
                    <code key={sc} className="font-mono bg-slate-200 dark:bg-slate-800 text-[10px] text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">
                      {sc}
                    </code>
                  ))}
                </div>
              </li>
              <li className="mt-2.5">Click the blue <strong className="text-slate-800 dark:text-slate-200">Generate Access Token</strong> button.</li>
              <li>Follow the Facebook login prompts—be sure to select **Opt-in to all current and future business assets** so you register all relevant Facebook Pages and linked Instagram accounts.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Generate Long-Lived Token",
      sub: "Extend standard login session to 60 days via the developer tool",
      icon: <Key className="w-5 h-5 text-amber-500" />,
      color: "bg-amber-50 dark:bg-amber-900/20",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            Standard Graph Explorer tokens expire in 1-2 hours. We will extend this to 60 days so we can subsequently fetch permanent credentials.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-500">Token extension workflow</span>
            <ul className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2 font-medium">
              <li>In the Graph API Explorer, click the small info (<strong className="text-indigo-500 font-extrabold">i</strong>) button next to your generated token.</li>
              <li>Click the blue <strong className="text-slate-800 dark:text-slate-200">Open in Access Token Tool</strong> button at the bottom of the popup.</li>
              <li>Locate the white button labeled <strong className="text-indigo-600 dark:text-indigo-400">Extend Access Token</strong> and click it.</li>
              <li>Meta will produce a new, extremely long token that is valid for 60 days. <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Copy this newly generated 60-day token.</strong></li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Convert to Permanent Page Token",
      sub: "Retrieve an unlimited, never-expiring access token for the backend",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      color: "bg-emerald-50 dark:bg-emerald-900/20",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            To prevent your scheduled campaigns from disconnecting every 2 months, we convert the user session into a permanent, never-expiring Page Access Token.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Permanent extraction API call</span>
            <ul className="list-decimal pl-5 text-sm text-slate-600 dark:text-slate-400 space-y-2 font-medium">
              <li>Return to the <strong className="text-slate-800 dark:text-slate-200">Graph API Explorer</strong> tab.</li>
              <li>Paste your copied 60-day user token into the main <strong className="text-slate-800 dark:text-slate-200">Access Token</strong> field.</li>
              <li>Locate the query path input box (defaults to <code className="font-mono text-xs">me?fields=id,name</code>) and replace it entirely with:
                <code className="block mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded font-mono text-xs text-rose-500 border border-slate-200 dark:border-slate-800 text-center font-bold">
                  me/accounts
                </code>
              </li>
              <li>Click the blue <strong className="text-slate-850 dark:text-slate-200">Submit</strong> button.</li>
              <li>Analyze the JSON response. Scroll down through your pages and copy:
                <ul className="list-disc pl-5 mt-1 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <li><strong className="text-slate-700 dark:text-slate-300">`id`</strong>: The Facebook Page ID.</li>
                  <li><strong className="text-slate-700 dark:text-slate-300">`access_token`</strong>: The Never-Expiring Page Access token.</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Set Up the App Environment",
      sub: "Map credentials to environment variables to activate full-stack automation",
      icon: <RefreshCw className="w-5 h-5 text-indigo-500" />,
      color: "bg-indigo-50/50 dark:bg-indigo-900/10",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            To authorize secure background queries and posts, add these keys directly into our portal host system:
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Required environment configuration</span>
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                <span className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">FACEBOOK_PAGE_ID</span>
                <span className="text-xs text-slate-400 italic">e.g. 10243292419401</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">FACEBOOK_PAGE_ACCESS_TOKEN</span>
                <span className="text-xs text-slate-400 italic">EAA... (Never-expiring token string)</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium pt-2">
              Add these variables in your hosting settings (e.g. AI Studio environment or local <code className="font-mono text-[10px]">.env</code>), then restart the application. Finally, open the <strong className="text-indigo-500 font-bold">Admin</strong> tab of this portal and click the **Sync/Refresh** icon to verify the connection status!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Instagram Connection",
      sub: "Bridge photo & video campaigns to your professional Instagram presence",
      icon: <Sparkles className="w-5 h-5 text-pink-500" />,
      color: "bg-pink-50 dark:bg-pink-900/20",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
            To post directly to Instagram, the app uses Meta's automatic discovery protocol which maps connected Instagram accounts directly via your Facebook Page Access Token.
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-pink-500">Prerequisites Check</span>
            <ol className="list-decimal pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-2 font-medium">
              <li>Convert your Instagram account to a <strong className="text-slate-700 dark:text-slate-200">Professional/Business Account</strong> (available in Instagram App Settings &gt; Account Type).</li>
              <li>Go to your Facebook Page Settings &gt; Connected Accounts &gt; Instagram.</li>
              <li>Click <strong className="text-slate-800 dark:text-slate-200">Connect</strong> and input credentials to complete the handshake link.</li>
              <li>Once linked, our system discovers Instagram automatically on every Facebook posting event!</li>
            </ol>
          </div>
        </div>
      )
    }
  ];

  const [selectedGuide, setSelectedGuide] = useState<typeof guideSections[0] | null>(null);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (initialGuideTitle) {
      const g = guideSections.find(sec => sec.title.toLowerCase() === initialGuideTitle.toLowerCase());
      if (g) {
        setSelectedGuide(g);
        if (initialTopicIndex !== undefined) {
          setSelectedTopicIndex(initialTopicIndex);
        } else {
          setSelectedTopicIndex(0);
        }
      }
    } else if (initialTab) {
      setSelectedGuide(null);
    }
  }, [initialTab, initialGuideTitle, initialTopicIndex]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <AnimatePresence mode="wait">
        {selectedGuide ? (
          <motion.div 
            key="article-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setSelectedGuide(null)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs transition-all group"
              >
                <ChevronRight className="w-4 h-4 rotate-180 transition-transform group-hover:-translate-x-1" />
                Back to Support Center
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Article</span>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{selectedGuide.title}</span>
              </div>
            </div>

            {/* Article Content */}
            <div className={`p-12 rounded-[40px] ${selectedGuide.color} border border-white dark:border-slate-800 shadow-sm relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full -mr-32 -mt-32" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[32px] flex items-center justify-center shadow-xl shrink-0">
                  {React.cloneElement(selectedGuide.icon as React.ReactElement, { className: "w-10 h-10" })}
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 leading-tight">
                    {selectedGuide.title}
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-300 font-medium max-w-3xl leading-relaxed">
                    {selectedGuide.content}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <div className="w-6 h-1 rounded-full bg-indigo-500" />
                    In-depth Guide
                  </h4>
                  
                  {/* @ts-ignore */}
                  {selectedGuide.topics && selectedGuide.topics.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        {/* @ts-ignore */}
                        {selectedGuide.topics.map((topic, idx) => (
                           <button
                             key={idx}
                             onClick={() => setSelectedTopicIndex(idx)}
                             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                               selectedTopicIndex === idx 
                               ? 'bg-indigo-600 text-white shadow-md' 
                               : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                             }`}
                           >
                             {topic.title}
                           </button>
                        ))}
                      </div>
                      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                          {/* @ts-ignore */}
                          {selectedGuide.topics[selectedTopicIndex].content}
                        </p>
                        {/* @ts-ignore */}
                        {selectedGuide.topics[selectedTopicIndex].imageUrl && (
                          <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                            <img 
                              /* @ts-ignore */
                              src={selectedGuide.topics[selectedTopicIndex].imageUrl} 
                              /* @ts-ignore */
                              alt={selectedGuide.topics[selectedTopicIndex].title}
                              className="w-full object-cover" 
                            />
                          </div>
                        )}
                        {/* @ts-ignore */}
                        {selectedGuide.topics[selectedTopicIndex].images && (
                          <div className="mt-6 flex flex-col gap-6">
                            {/* @ts-ignore */}
                            {selectedGuide.topics[selectedTopicIndex].images.map((img, i) => (
                              <div key={i} className="flex flex-col gap-2">
                                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <img 
                                    src={img.url} 
                                    alt={img.alt}
                                    className="w-full object-cover" 
                                  />
                                </div>
                                {img.caption && (
                                  <p className="text-xs text-center text-slate-500 font-medium">{img.caption}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                        {selectedGuide.longContent}
                      </p>
                    </div>
                  )}

                  <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                    <h5 className="font-bold text-slate-900 dark:text-white mb-2">Need more help with this?</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">If this article didn't answer all your questions, feel free to reach out to our team.</p>
                    <button 
                      onClick={() => {
                        setSelectedGuide(null);
                        setActiveTab('contact');
                        setSubject(`Help with: ${selectedGuide.title}`);
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Related Topics</h4>
                  <div className="space-y-4">
                    {guideSections.filter(s => s.title !== selectedGuide.title).slice(0, 3).map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setSelectedGuide(item);
                          setSelectedTopicIndex(0);
                        }}
                        className="w-full text-left p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-2xl transition-all group/rel"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.color} group-hover/rel:scale-110 transition-transform`}>
                            {React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4" })}
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
                  <HelpCircle className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  Support Center
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Resources and direct lines to get support and assistance.</p>
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
                  onClick={() => setActiveTab('setup')}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'setup' 
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Platform Setup
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
                  Contact Support
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
                      <button 
                        onClick={() => {
                          setSelectedGuide(section);
                          setSelectedTopicIndex(0);
                        }}
                        className="mt-6 flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-700 dark:hover:text-indigo-300 transition-all group/btn"
                      >
                        Learn More 
                        <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
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
              ) : activeTab === 'setup' ? (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto space-y-6"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Sliders className="w-6 h-6 text-indigo-500" />
                      Platform API Connection Guide
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                      Follow this interactive, multi-step accordion guide to register your Meta Developer App, generate a permanent Page Access Token, and activate direct Facebook and Instagram publishing.
                    </p>

                    <div className="space-y-4">
                      {setupSteps.map((step, idx) => {
                        const isOpen = openSetupStep === idx;
                        return (
                          <div 
                            key={idx} 
                            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                              isOpen 
                                ? 'border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/10 dark:bg-indigo-950/5 shadow-md' 
                                : 'border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700/80'
                            }`}
                          >
                            <button
                              onClick={() => setOpenSetupStep(isOpen ? null : idx)}
                              className="w-full text-left p-6 flex items-center justify-between gap-4 select-none"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${step.color}`}>
                                  {step.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-indigo-500 tracking-widest uppercase">
                                      Step {idx + 1}
                                    </span>
                                    {isOpen && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                  </div>
                                  <h4 className="text-slate-900 dark:text-white font-bold text-base">
                                    {step.title}
                                  </h4>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                    {step.sub}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown 
                                className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${
                                  isOpen ? 'rotate-180 text-indigo-500' : ''
                                }`} 
                              />
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                >
                                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                                    {step.content}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-indigo-100 dark:shadow-none">
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold">Have everything configured?</h4>
                      <p className="text-sm text-indigo-100 font-medium max-w-xl">
                        Go to the system admin configuration hub to enter your Page Access ID and permanent page credentials, then click Sync to test your API health.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        toast.success("Ready! Navigate to the Admin settings tab to apply your secret credentials.");
                      }}
                      className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-50 transition-all shrink-0"
                    >
                      Configure Admin Tab
                    </button>
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
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your message will be sent directly to our Support team.</p>
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
                        Send Message
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
                                          {msg.role === 'supervisor' ? 'Support' : 'You'}
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
                                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all font-bold"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legal Footer */}
      <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
        <div className="flex items-center gap-6">
          <a 
            href="/privacy" 
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/privacy');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            Privacy Policy
          </a>
          <a 
            href="/terms" 
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/terms');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            Terms of Service
          </a>
          <a 
            href="/deletion" 
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, '', '/deletion');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            Data Deletion
          </a>
        </div>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">
          Marketing Operations Portal © 2026
        </p>
      </div>
    </div>
  );
};
