import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://hekjabrlgdpbffzidshz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhla2phYnJsZ2RwYmZmemlkc2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Njk3ODAsImV4cCI6MjA3MTI0NTc4MH0.omgtL7BDdTNBEj1bQYY9-ipj3KWc_onkGLdDTUBD81E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
  },
});
