import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => {},
        signInWithOtp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables are missing in Vercel settings.") }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables are missing.") }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase environment variables are missing.") }),
      }
    } as any;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
