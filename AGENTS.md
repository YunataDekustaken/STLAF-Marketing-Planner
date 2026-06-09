# Application Creation & Maintenance Guidelines

This file outlines the standard architectural, logging, error handling, and coding guidelines that all developers and AI agents must follow when creating, maintaining, and testing pages or features in this workspace.

---

## Coder’s Notes

Every file must start with a comment block detailing the file name, author, date, and purpose. 

### Format Example:
```
//
File: user_auth.ts
Author: AI Coding Agent (or Developer Name)
Date: 2026-06-09
Purpose: Handles user login and session management
//
```

Additionally, developers MUST add explanatory inline comments for any complex or critical logic blocks.

---

## Project Structure

All source files are organized cleanly. To maintain consistency, keep your files within their appropriate subdirectories inside the root `src/` folder:

*   **`src/models/`**: Data models, schemas, and types.
*   **`src/controllers/`**: Logic layer and state orchestrators.
*   **`src/components/`** or **`src/views/`**: React functional components, views, layouts, and style-sheet templates.
*   **`src/utils/`**: Shared helper utilities, formatting functions, and mathematical models.
*   **`src/services/`**: Handlers, wrappers, and clients for external APIs, integrations (Gmail, CRM, Meta etc.), or Cloud utilities.
*   **`tests/`**: Unit, regression, and system integration tests.
*   **`docs/`**: Feature definitions, architectural plans, and system documentation.
*   **`config/`**: Dev and prod build configurations or environment layouts.
*   **`assets/`**: Images, vector art, customized logos, fonts, and other static media.

---

## Error Handling & Reliability Registry

We enforce zero unhandled exceptions. Below is the registry of possible issues the web application might encounter and their prescribed resolutions:

### 1. Null / Undefined Values
*   **Scenario**: Subfields, missing profile data, or unselected posts cause crashes during component rendering.
*   **prescribed Resolution**: Use strict Optional Chaining (`?.`), Nullish Coalescing Operators (`??`), and early guard exits or default values for all state attributes.

### 2. Database Connection Failures
*   **Scenario**: Firestore query timeouts, client offline states, or Firebase permission blocks.
*   **prescribed Resolution**: Implement catch blocks on all data fetching/writing calls. Display clear user-facing error state elements in the UI and allow retrying safely. Never expose raw backend StackTraces to the end user.

### 3. Invalid User Input
*   **Scenario**: Malformed social media captions (e.g., exceeds character limits), empty text fields, or illegal characters.
*   **prescribed Resolution**: Add real-time form validation inside client forms, enforce local limits (such as truncation or counter indicators), and disable submit buttons until inputs are sanitary.

### 4. Missing Files or Credentials
*   **Scenario**: App expects `.env` secrets or connected endpoints that are not configured yet (e.g. `FACEBOOK_PAGE_ACCESS_TOKEN` is blank or `Subscriber Mailing App URL` is unset).
*   **prescribed Resolution**: Detect missing fields elegantly, disable dependent workflows gracefully, and redirect users to the correct configuration view (e.g., Admin Settings / Setup tabs) with clear warning cards.

### 5. API Request Failures
*   **Scenario**: Graph API / Meta API returns rate-limits, Subcode 465, or 401 Unauthorized errors.
*   **prescribed Resolution**: Intercept returning error subcodes cleanly, provide helpful diagnostic guides (like clicking the interactive Help & Support view), and allow admins to easily reset credentials.

### 6. Logging
*   **Requirement**: Never leave unhandled exceptions. Always log errors and warnings cleanly in a structured log format using level tags:
    *   `[INFO]`: User behavior logs, successful initialization events, or status synchronizations.
    *   `[WARN]`: Retriable/non-fatal exceptions, missing secondary settings, or deprecated setups.
    *   `[ERROR]`: Fatal exceptions, failed writes, failed API posts, or network disconnects.
