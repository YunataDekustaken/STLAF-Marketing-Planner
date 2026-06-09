//
// File: main.tsx
// Author: Raphael Mendoza
// Date: 2026-06-09
// Purpose: Main client React entry point, mounting StrictMode App context into the DOM.
//

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
