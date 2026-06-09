//
// File: vite-env.d.ts
// Author: Raphael Mendoza
// Date: 2026-06-09
// Purpose: Declares global atmosphere typed variables for Vite such as Environment configurations.
//

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
