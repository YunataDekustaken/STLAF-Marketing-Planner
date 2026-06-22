<!--
File: DOCUMENTATION.md
Author: Raphael Mendoza
Date: 2026-06-22
Purpose: Web application setup, transfer, usage, and maintenance documentation.
-->

# Web Application Comprehensive Reference & Guide
**Author:** Raphael Mendoza  
**Date:** June 22, 2026  
**Version:** 1.0.0  

---

## Table of Contents
1. [Overview](#1-overview)
2. [Setup Instructions](#2-setup-instructions)
   - [Local Development Setup](#local-development-setup)
   - [Environment Variables Configuration](#environment-variables-configuration)
   - [Firebase Real-Time Database & Auth Configuration](#firebase-real-time-database--auth-configuration)
   - [Meta & Facebook Publishing Integration](#meta--facebook-publishing-integration)
3. [Transferring the Application](#3-transferring-the-application)
   - [Moving to a New Repository](#moving-to-a-new-repository)
   - [Deploying to a Clean Cloud / Hosting Instance](#deploying-to-a-clean-cloud--hosting-instance)
4. [Using the Application](#4-using-the-application)
   - [Campaign & Newsletter Hub](#campaign--newsletter-hub)
   - [Mailing Distribution Simulator](#mailing-distribution-simulator)
   - [Multi-Platform Social Publishing](#multi-platform-social-publishing)
   - [Administrative Controls & Member Roles](#administrative-controls--member-roles)
5. [Maintenance & Reliability Guide](#5-maintenance--reliability-guide)
   - [Coding Standards (Headers, Annotations)](#coding-standards-headers-annotations)
   - [Error Handling & Stability Hierarchy](#error-handling--stability-hierarchy)
   - [Structured Logging Guidelines](#structured-logging-guidelines)
   - [Dependency Management](#dependency-management)

---

## 1. Overview
This full-stack newsletter distribution and multi-platform social media orchestration center provides marketing managers with a unified workspace. It allows compiling and broadcasting automated newsletter distribution campaigns, managing subscriber delivery streams, scheduling direct integration pipelines with Meta's Graph API, and maintaining role-based admin workflows.

The frontend is built using **React (v19)** with **Vite** and **Tailwind CSS (v4)** for fluid interactions and elegant micro-animations. The backend is managed with an **Express.js** proxy server and a durable cloud database backed by **Firebase Firestore** and **Firebase Authentication**.

---

## 2. Setup Instructions

Before running the application, make sure you have the following prerequisites installed:
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher recommended)

### Local Development Setup

1. **Clone & Extract Codebase:**
   Clone the repository or extract the zip package into your local working directory.

2. **Install Dependencies:**
   Run npm install to populate the `node_modules` directory:
   ```bash
   npm install
   ```

3. **Launch the Local Dev Server:**
   Launch the development server via tsx:
   ```bash
   npm run dev
   ```
   The application dev server binds inside port `3000`. You can visit your local interface directly at `http://localhost:3000`.

### Environment Variables Configuration

Duplicate the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```

Ensure your `.env` contains the following active fields (substituting actual keys and credentials):
```env
# Server Port (fixed internally on port 3000)
PORT=3000

# Firebase Database Credentials
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Gemini Generative AI Key (kept strictly on the server for security)
GEMINI_API_KEY=your-google-gemini-key

# Meta Integration Keys
FACEBOOK_PAGE_ID=your-facebook-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=your-facebook-app-access-token
```

### Firebase Real-Time Database & Auth Configuration

1. **Create the Project:**
   Navigate to the [Firebase Console](https://console.firebase.google.com/) and create a new project.

2. **Enable Firebase Authentication:**
   Enable the **Email/Password** and/or **Google Auth** sign-in providers under **Authentication > Sign-in Method**.

3. **Enable Cloud Firestore:**
   - Create a Cloud Firestore database.
   - Choose a suitable server location.
   - Set up rules using the `./firestore.rules` file in the root. Secure rules forbid unauthenticated reading/writing and enforce proper document schemas.

4. **Deploy Rules:**
   Use the firebase CLI to deploy security rules if running standalone:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Meta & Facebook Publishing Integration

To post images or captions directly to connected Facebook Pages and Instagram Business Accounts, set up a Meta App:

1. **Register a App in Meta Developer Portal:**
   Navigate to [Meta for Developers](https://developers.facebook.com/) and select **My Apps > Create App**. Use the "Business" type for Graph API permissions.

2. **Add Products:**
   Add the **Facebook Login** product and configure the Redirect URIs.

3. **Acquire Access Tokens:**
   - Use the **Graph API Explorer** tool to obtain a User Access Token.
   - Request the following permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, and `instagram_content_publish`.
   - Exchange the temporary User Token for a Long-Lived Page Access Token under **My App Settings**. Place this key into your environment parameters securely.

4. **Meta Error Codes Guide:**
   - **Subcode 465**: Duplicate post detection or mismatched developer account ownership. If clicked in the modal / admin error panel, a quick button connects you to Detailed Resolution Steps in Help tabs.
   - **Subcode 460**: Expired login token session. Re-validate tokens by visiting the Help & Support setup documentation panel.

---

## 3. Transferring the Application

When migrating this application to a separate server, client, or hosting project:

### Moving to a New Repository
1. Initialize a clean repository:
   ```bash
   git init
   git remote add origin <new-url>
   ```
2. Commit and push the existing source directory including all code files, avoiding transient folder tracking by preserving standard filters in `.gitignore`.
3. Keep dependency version locks intact inside `package-lock.json` to avoid unexpected code breaks during automated continuous integration cycles.

### Deploying to a Clean Cloud / Hosting Instance
- **Backend Environment Setup:**
  Provide server environments with matching parameters from your local `.env`. Ensure that secret API keys (e.g. `GEMINI_API_KEY` and `FACEBOOK_PAGE_ACCESS_TOKEN`) are configured server-side.
- **Client Deployment:**
  During production builds (`npm run build`), Vite compiles static assets in `/dist`. For Express-managed deployment pipelines, the server handles routing of these compiled objects dynamically.

---

## 4. Using the Application

### Campaign & Newsletter Hub
- Create and organize your drafts from the dashboard sidebar.
- Use built-in AI generators powered by Google Gemini to suggest high-impact headings or translate campaign lines instantly.
- Upload CSV or JSON formatted subscriber databases directly. If campaigns match existing templates, use the interactive **Merge Conflict Resolution Panel** to unify database structures.

### Mailing Distribution Simulator
- Review broadcasting outboxes and schedule launch queues.
- Monitor execution indicators to verify live delivery states and handle server transmission errors elegantly.

### Multi-Platform Social Publishing
- Click **Create Social Post** from the main view of the dashboard.
- Craft your caption and upload creative components. If publishing fails, inspect the integrated error matching layout. The application links failed status responses to detailed, clickable walkthrough guides within your system.

### Administrative Controls & Member Roles
- Manage permission hierarchies (Owner, Admin, Moderator, Collaborator).
- Set rules regarding publishing permissions and deletion safeguards inside the Admin System tab structure.

---

## 5. Maintenance & Reliability Guide

### Coding Standards (Headers, Annotations)
As mandated by project-wide guidelines, every source file must begin with a standardized header block outlining the file name, author, date, and purpose.

```typescript
//
// File: <filename_here>
// Author: Raphael Mendoza
// Date: 2026-06-22
// Purpose: <brief_scope_of_file>
//
```
Add detailed comments to tricky algorithms (such as file-parsing streams, real-time Firestore listeners, or asynchronous publishing handlers).

### Error Handling & Stability Hierarchy
- **Optional Chaining:** Never assume state layouts are populated. Always use strict optional selection (`?.`) and fallback default values (`??`) to avoid screen crashes.
- **Database Interoperability:** Guard database query transactions inside robust `try/catch` wrappers. Graceful UI warnings must be shown to users when servers are unreachable.
- **Input Validation:** Restrict form targets statically prior to submission (e.g., matching character parameters, trimming whitespace, and sanitizing payloads).

### Structured Logging Guidelines
All server and client lifecycle events should write to structured collectors using clear tags:
- `[INFO]`: System initializations, successful database reads, and navigation actions.
- `[WARN]`: API warnings, minor validation faults, or non-fatal connection failures.
- `[ERROR]`: Fatal exceptions, file parser faults, or rejected social transmissions.

### Dependency Management
To assure steady builds, never alter dependency scripts manually. Run package acquisitions via npm command tools. Regular verification audits can be confirmed locally:
```bash
# Verify type completeness and static syntax
npm run lint

# Build full production pipeline components
npm run build
```
