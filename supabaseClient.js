// Supabase client for AGORA — shared across pages.
// The publishable key is safe to ship in the browser as long as
// Row Level Security (RLS) is enabled on every table (see schema.sql).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://coohrbdmzfysnenoclbs.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_nJoq76v_sMb1h5KH_B-TVw_A3kWYSox';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
