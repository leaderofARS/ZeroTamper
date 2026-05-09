import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // During build time, these might be missing.
    // Return a dummy object or handle it gracefully.
    return {} as any;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
