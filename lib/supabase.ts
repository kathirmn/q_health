import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// Create a single supabase client for interacting with your database
// We check if keys exist to prevent crashing in the preview environment if they are missing.
export const supabase = (supabaseUrl && supabasePublishableKey) 
  ? createClient<Database>(supabaseUrl, supabasePublishableKey) 
  : null;
