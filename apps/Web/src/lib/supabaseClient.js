import { createClient } from '@supabase/supabase-js'

// Fallback Supabase client in case shared package fails
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hekjabrlgdpbffzidshz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhla2phYnJsZ2RwYmZmemlkc2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Njk3ODAsImV4cCI6MjA3MTI0NTc4MH0.omgtL7BDdTNBEj1bQYY9-ipj3KWc_onkGLdDTUBD81E'

// Debug environment variables
console.log('🔍 Supabase configuration:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  envUrl: import.meta.env.VITE_SUPABASE_URL,
  envKey: import.meta.env.VITE_SUPABASE_ANON_KEY
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
