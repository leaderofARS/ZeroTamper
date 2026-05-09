-- Create Todos Table (from your example)
CREATE TABLE IF NOT EXISTS public.todos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  is_complete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Incidents Table (for WitnessChain backend)
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Evidence Records Table (for WitnessChain backend)
CREATE TABLE IF NOT EXISTS public.evidence_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sha256_hash text NOT NULL,
  ipfs_cid text NOT NULL,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  witness_wallet text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  media_type text NOT NULL,
  device_id_hash text NOT NULL,
  solana_signature text,
  is_first_witness boolean DEFAULT false,
  is_corroborator boolean DEFAULT false,
  deepfake_confidence double precision DEFAULT 0.0,
  is_flagged_deepfake boolean DEFAULT false,
  p_hash text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allowing anon and authenticated read/insert for hackathon simplicity)
-- Warning: In a real production app, restrict INSERT/UPDATE to authenticated users.
DROP POLICY IF EXISTS "Enable read access for all" ON public.todos;
CREATE POLICY "Enable read access for all" ON public.todos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all" ON public.todos;
CREATE POLICY "Enable insert access for all" ON public.todos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all" ON public.incidents;
CREATE POLICY "Enable read access for all" ON public.incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all" ON public.incidents;
CREATE POLICY "Enable insert access for all" ON public.incidents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all" ON public.incidents;
CREATE POLICY "Enable update access for all" ON public.incidents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all" ON public.evidence_records;
CREATE POLICY "Enable read access for all" ON public.evidence_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all" ON public.evidence_records;
CREATE POLICY "Enable insert access for all" ON public.evidence_records FOR INSERT WITH CHECK (true);

-- Create Witness Profiles Table
CREATE TABLE IF NOT EXISTS public.witness_profiles (
  wallet text PRIMARY KEY,
  submission_count integer DEFAULT 0,
  confirmed_count integer DEFAULT 0,
  score integer DEFAULT 0,
  badge_bitfield integer DEFAULT 0,
  badge_count integer DEFAULT 0,
  display_name text,
  city text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.witness_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.witness_profiles;
CREATE POLICY "Enable read access for all" ON public.witness_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable update for all" ON public.witness_profiles;
CREATE POLICY "Enable update for all" ON public.witness_profiles FOR UPDATE USING (true);

-- Create Legal Exports Table
CREATE TABLE IF NOT EXISTS public.legal_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  exported_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  bundle_cid text
);

ALTER TABLE public.legal_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.legal_exports;
CREATE POLICY "Enable read access for all" ON public.legal_exports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all" ON public.legal_exports;
CREATE POLICY "Enable insert for all" ON public.legal_exports FOR INSERT WITH CHECK (true);
