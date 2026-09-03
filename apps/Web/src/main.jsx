import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { supabase } from './lib/supabaseClient';
import './index.css';

// Initialize error tracking (must be done before React renders)
import('./services/errorTrackingService').then(({ ErrorTrackingService }) => {
  ErrorTrackingService.initialize().catch((err) => {
    console.error('Failed to initialize error tracking:', err);
  });
}).catch(() => {
  // Error tracking service not available - that's okay
});

// Expose supabase globally for debugging
window.supabase = supabase;

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);