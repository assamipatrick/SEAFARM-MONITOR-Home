
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://dldqfwpmztqbuyrmiixn.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZHFmd3BtenRxYnV5cm1paXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3ODU0NzAsImV4cCI6MjA4MDM2MTQ3MH0.jRfztTlk5qG4Q1la3bY-Z5edlw521lb81IHyhA5LA30';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Database features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
