-- Clean up existing tables (Warning: this deletes all existing data!)
DROP TABLE IF EXISTS public.evidence_records CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.witness_profiles CASCADE;
DROP TABLE IF EXISTS public.legal_exports CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;

-- Create Incidents Table (for WitnessChain backend)
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'Pending',
  centroid_lat double precision NOT NULL,
  centroid_lon double precision NOT NULL,
  witness_count integer NOT NULL DEFAULT 1 CHECK (witness_count > 0),
  first_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT incidents_status_check CHECK (status IN ('Pending', 'Confirmed', 'Flagged'))
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

CREATE TABLE IF NOT EXISTS public.witness_profiles (
  wallet text PRIMARY KEY,
  score integer NOT NULL DEFAULT 0,
  submission_count integer NOT NULL DEFAULT 0,
  confirmed_count integer NOT NULL DEFAULT 0,
  badge_bitfield bigint NOT NULL DEFAULT 0,
  badge_count integer NOT NULL DEFAULT 0,
  display_name text,
  city text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legal_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  exported_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  bundle_cid text
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_records_incident_wallet_idx
  ON public.evidence_records (incident_id, witness_wallet);
CREATE UNIQUE INDEX IF NOT EXISTS evidence_records_sha256_hash_idx
  ON public.evidence_records (sha256_hash);
CREATE INDEX IF NOT EXISTS incidents_status_first_seen_idx
  ON public.incidents (status, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS incidents_location_idx
  ON public.incidents (centroid_lat, centroid_lon);
CREATE INDEX IF NOT EXISTS witness_profiles_score_idx
  ON public.witness_profiles (score DESC);

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.witness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON public.incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON public.incidents FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all" ON public.evidence_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON public.evidence_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all" ON public.witness_profiles FOR SELECT USING (true);
CREATE POLICY "Enable upsert for all" ON public.witness_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.witness_profiles FOR UPDATE USING (true);

CREATE POLICY "Enable service exports" ON public.legal_exports FOR ALL USING (true) WITH CHECK (true);
