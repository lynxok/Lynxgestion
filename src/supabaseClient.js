import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wkyuxgxfxwpukgnlqsfd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreXV4Z3hmeHdwdWtnbmxxc2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NTE3ODEsImV4cCI6MjEwNjMyNzc4MX0.dol7k7iHvQeBMvSyRq47M7-7Ki6IxK3wgA2lMq1hDAQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
