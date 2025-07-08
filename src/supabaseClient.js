import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gflxxqepdcvhkcgbfhfs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHh4cWVwZGN2aGtjZ2JmaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzg1NjksImV4cCI6MjA2NzUxNDU2OX0.lMEmb-uwCqg578S-ZKUSTuQPBbaGhXWzpktg0_Tcl88';

export const supabase = createClient(supabaseUrl, supabaseKey);
