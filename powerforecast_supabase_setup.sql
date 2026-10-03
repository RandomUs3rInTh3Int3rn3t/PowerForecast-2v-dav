-- ==============================================================================
-- POWERFORECAST REFINED - COMPLETE SUPABASE SETUP SCRIPT (v2.1.0)
-- Run this in your Supabase Project: SQL Editor -> New Query -> Run
-- Project: https://ezjzuggagfnkjmbcakta.supabase.co
--
-- This script is IDEMPOTENT — safe to re-run at any time without errors.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. ACCOUNTS TABLE (Auto-synced from auth.users on signup)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- ==============================================================================
-- 3. USER APPLIANCES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_appliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    control_no TEXT DEFAULT '',
    source TEXT DEFAULT 'manual_entry', -- 'pelp_db' | 'ai_vision' | 'manual_entry' | 'catalog'
    watts NUMERIC NOT NULL CHECK (watts > 0),
    voltage NUMERIC DEFAULT 230,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 1),
    hours_per_day NUMERIC NOT NULL DEFAULT 8 CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
    days_per_month INTEGER DEFAULT 30 CHECK (days_per_month >= 1 AND days_per_month <= 31),
    monthly_kwh NUMERIC NOT NULL DEFAULT 0,
    estimated_cost NUMERIC DEFAULT 0,
    energy_rating TEXT DEFAULT '',
    room_location TEXT DEFAULT 'Living Room',
    start_hour NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_currently_on BOOLEAN DEFAULT false,
    last_turned_on_at TIMESTAMP WITH TIME ZONE,
    is_inverter BOOLEAN DEFAULT false,
    ai_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- Idempotent column check for existing databases
ALTER TABLE public.user_appliances ADD COLUMN IF NOT EXISTS is_inverter BOOLEAN DEFAULT false;

-- ==============================================================================
-- 4. APPLIANCE USAGE SESSIONS & RUNTIME LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appliance_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes NUMERIC DEFAULT 0,
    kwh_consumed NUMERIC DEFAULT 0,
    is_peak_window BOOLEAN DEFAULT false,
    estimated_cost NUMERIC DEFAULT 0,
    source TEXT DEFAULT 'power_board_toggle',
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- ==============================================================================
-- 4.1 DAILY APPLIANCE USAGE ROLLUP TABLE (Actual Measured Data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_appliance_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE CASCADE NOT NULL,
    usage_date DATE NOT NULL,
    hours_used NUMERIC(5,2) DEFAULT 0 NOT NULL,
    kwh_consumed NUMERIC(10,3) DEFAULT 0 NOT NULL,
    estimated_cost NUMERIC(10,2) DEFAULT 0 NOT NULL,
    source TEXT DEFAULT 'manual', -- 'manual' | 'live_session' | 'past_time_range'
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    CONSTRAINT daily_appliance_usage_unique_day UNIQUE(user_id, appliance_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_appliance_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_appliance ON public.daily_appliance_usage(appliance_id);

ALTER TABLE public.daily_appliance_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can view own daily usage" ON public.daily_appliance_usage FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can insert own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can insert own daily usage" ON public.daily_appliance_usage FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can update own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can update own daily usage" ON public.daily_appliance_usage FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can delete own daily usage" ON public.daily_appliance_usage;
CREATE POLICY "Users can delete own daily usage" ON public.daily_appliance_usage FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_appliance_usage TO authenticated, anon;

-- ==============================================================================
-- 4.2 SIMULATED APPLIANCE USAGE TABLE (What-If & Planning Data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.simulated_appliance_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE CASCADE NOT NULL,
    usage_date DATE NOT NULL,
    hours_used NUMERIC(5,2) DEFAULT 0 NOT NULL,
    kwh_consumed NUMERIC(10,3) DEFAULT 0 NOT NULL,
    estimated_cost NUMERIC(10,2) DEFAULT 0 NOT NULL,
    start_hour NUMERIC(4,2) DEFAULT NULL,
    end_hour NUMERIC(4,2) DEFAULT NULL,
    source TEXT DEFAULT 'simulation_plan', -- 'simulation_plan' | 'test_run'
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    CONSTRAINT simulated_appliance_usage_unique_day UNIQUE(user_id, appliance_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_simulated_usage_user_date ON public.simulated_appliance_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_simulated_usage_appliance ON public.simulated_appliance_usage(appliance_id);

ALTER TABLE public.simulated_appliance_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can view own simulated usage" ON public.simulated_appliance_usage FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can insert own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can insert own simulated usage" ON public.simulated_appliance_usage FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can update own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can update own simulated usage" ON public.simulated_appliance_usage FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can delete own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can delete own simulated usage" ON public.simulated_appliance_usage FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.simulated_appliance_usage TO authenticated, anon;

-- ==============================================================================
-- 5. USER CALENDAR EVENTS & USAGE SCHEDULES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    appliance_id UUID REFERENCES public.user_appliances(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'appliance', -- 'billing' | 'peak' | 'appliance' | 'audit'
    day TEXT NOT NULL DEFAULT 'mon',
    hour NUMERIC NOT NULL CHECK (hour >= 0 AND hour < 24),
    duration_hours NUMERIC DEFAULT 1.0,
    is_recurring BOOLEAN DEFAULT true,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- ==============================================================================
-- 6. SYSTEM CHANGELOGS & AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_changelogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    description TEXT NOT NULL,
    git_commit_tag TEXT DEFAULT '',
    deployed_by TEXT DEFAULT 'Antigravity / Pair Programmer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- ==============================================================================
-- 7. SEED CHANGELOG RECORDS
-- ==============================================================================
INSERT INTO public.system_changelogs (version, description, git_commit_tag)
SELECT '2.0.0v',
       '2.0.0v - BETA TEST - Adapt PowerForecast to Refine React framework with Supabase integration',
       '2.0.0v'
WHERE NOT EXISTS (SELECT 1 FROM public.system_changelogs WHERE version = '2.0.0v');

INSERT INTO public.system_changelogs (version, description, git_commit_tag)
SELECT '2.1.0v',
       '2.1.0v - Integrate legacy features: forecasting simulator, live calendar sessions, schedule queue, session logs, category analytics, forgot password, API playground, Python serverless layer',
       '2.1.0v'
WHERE NOT EXISTS (SELECT 1 FROM public.system_changelogs WHERE version = '2.1.0v');

-- ==============================================================================
-- 8. AUTO-UPDATED_AT TRIGGER FUNCTION
-- Automatically sets updated_at = NOW() on every UPDATE for tables that have it.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::TEXT, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to accounts
DROP TRIGGER IF EXISTS set_updated_at_accounts ON public.accounts;
CREATE TRIGGER set_updated_at_accounts
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to user_appliances
DROP TRIGGER IF EXISTS set_updated_at_user_appliances ON public.user_appliances;
CREATE TRIGGER set_updated_at_user_appliances
  BEFORE UPDATE ON public.user_appliances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply trigger to user_calendar_events
DROP TRIGGER IF EXISTS set_updated_at_calendar_events ON public.user_calendar_events;
CREATE TRIGGER set_updated_at_calendar_events
  BEFORE UPDATE ON public.user_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. AUTO-SYNC auth.users → accounts ON SIGNUP
-- Automatically creates/upserts an accounts row when a user signs up.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.accounts (id, full_name, email, avatar_url, provider)
    VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
        new.email,
        coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
        coalesce(new.raw_app_meta_data->>'provider', 'email')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = coalesce(excluded.full_name, accounts.full_name),
        email = coalesce(excluded.email, accounts.email),
        avatar_url = coalesce(excluded.avatar_url, accounts.avatar_url),
        updated_at = now();
    RETURN new;
EXCEPTION
    WHEN others THEN
        RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 10. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appliance_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_changelogs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 11. RLS POLICIES FOR ACCOUNTS (SELECT, INSERT, UPDATE)
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own account" ON public.accounts;
CREATE POLICY "Users can view own account" ON public.accounts
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own account" ON public.accounts;
CREATE POLICY "Users can insert own account" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own account" ON public.accounts;
CREATE POLICY "Users can update own account" ON public.accounts
  FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- 12. RLS POLICIES FOR USER APPLIANCES (FULL CRUD)
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own appliances" ON public.user_appliances;
CREATE POLICY "Users can view own appliances" ON public.user_appliances
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own appliances" ON public.user_appliances;
CREATE POLICY "Users can insert own appliances" ON public.user_appliances
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own appliances" ON public.user_appliances;
CREATE POLICY "Users can update own appliances" ON public.user_appliances
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own appliances" ON public.user_appliances;
CREATE POLICY "Users can delete own appliances" ON public.user_appliances
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ==============================================================================
-- 13. RLS POLICIES FOR USAGE LOGS (FULL CRUD)
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can view own usage logs" ON public.appliance_usage_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can insert own usage logs" ON public.appliance_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can update own usage logs" ON public.appliance_usage_logs
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own usage logs" ON public.appliance_usage_logs;
CREATE POLICY "Users can delete own usage logs" ON public.appliance_usage_logs
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ==============================================================================
-- 14. RLS POLICIES FOR CALENDAR EVENTS (FULL CRUD)
-- ==============================================================================
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can view own calendar events" ON public.user_calendar_events
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can insert own calendar events" ON public.user_calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can update own calendar events" ON public.user_calendar_events
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.user_calendar_events;
CREATE POLICY "Users can delete own calendar events" ON public.user_calendar_events
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ==============================================================================
-- 15. RLS POLICIES FOR CHANGELOGS (PUBLIC READ + INSERT)
-- ==============================================================================
DROP POLICY IF EXISTS "Allow public select for system changelogs" ON public.system_changelogs;
CREATE POLICY "Allow public select for system changelogs" ON public.system_changelogs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for system changelogs" ON public.system_changelogs;
CREATE POLICY "Allow insert for system changelogs" ON public.system_changelogs
  FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 16. EXPLICIT GRANTS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.accounts TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.accounts TO authenticated, anon;

GRANT ALL ON TABLE public.user_appliances TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_appliances TO authenticated, anon;

GRANT ALL ON TABLE public.appliance_usage_logs TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appliance_usage_logs TO authenticated, anon;

GRANT ALL ON TABLE public.user_calendar_events TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_calendar_events TO authenticated, anon;

GRANT ALL ON TABLE public.system_changelogs TO postgres, service_role;
GRANT SELECT, INSERT ON TABLE public.system_changelogs TO authenticated, anon;

-- ==============================================================================
-- 17. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_user_calendar_events_user_day
    ON public.user_calendar_events(user_id, day);

CREATE INDEX IF NOT EXISTS idx_user_calendar_events_appliance
    ON public.user_calendar_events(appliance_id);

-- ==============================================================================
-- 18. REALTIME PUBLICATION ENABLEMENT (IDEMPOTENT)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'accounts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_appliances') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_appliances;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'appliance_usage_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appliance_usage_logs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_calendar_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_calendar_events;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'system_changelogs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_changelogs;
  END IF;
END $$;
