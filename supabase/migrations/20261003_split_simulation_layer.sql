-- Supabase Migration: Split Simulation Layer & Table Isolation
-- Version: 3.5.0v
-- Creates simulated_appliance_usage and backs up daily_appliance_usage

-- 1. Create simulated_appliance_usage table
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
    source TEXT DEFAULT 'simulation_plan',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
    CONSTRAINT simulated_appliance_usage_unique_day UNIQUE(user_id, appliance_id, usage_date)
);

-- 2. Indexes for fast calendar and month-range lookups
CREATE INDEX IF NOT EXISTS idx_simulated_usage_user_date ON public.simulated_appliance_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_simulated_usage_appliance ON public.simulated_appliance_usage(appliance_id);

-- 3. Row Level Security
ALTER TABLE public.simulated_appliance_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can view own simulated usage" ON public.simulated_appliance_usage 
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can insert own simulated usage" ON public.simulated_appliance_usage 
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can update own simulated usage" ON public.simulated_appliance_usage 
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete own simulated usage" ON public.simulated_appliance_usage;
CREATE POLICY "Users can delete own simulated usage" ON public.simulated_appliance_usage 
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.simulated_appliance_usage TO authenticated, anon;

-- 4. Safe Snapshot Backup of current daily_appliance_usage before cleanup
CREATE TABLE IF NOT EXISTS public.daily_appliance_usage_backup_350 AS 
SELECT * FROM public.daily_appliance_usage;

-- 5. Copy existing simulated/autofill rows to simulated_appliance_usage (if any exist)
INSERT INTO public.simulated_appliance_usage (
    user_id, appliance_id, usage_date, hours_used, kwh_consumed, estimated_cost, source, notes, created_at, updated_at
)
SELECT 
    user_id, appliance_id, usage_date::date, hours_used, kwh_consumed, estimated_cost, 
    COALESCE(source, 'simulation_plan'), notes, COALESCE(created_at, now()), COALESCE(updated_at, now())
FROM public.daily_appliance_usage
WHERE source IN ('schedule_autofill', 'routine_default')
ON CONFLICT (user_id, appliance_id, usage_date) DO UPDATE SET
    hours_used = EXCLUDED.hours_used,
    kwh_consumed = EXCLUDED.kwh_consumed,
    estimated_cost = EXCLUDED.estimated_cost,
    updated_at = now();

-- 6. Clean up daily_appliance_usage so actuals table is purely measured/live
DELETE FROM public.daily_appliance_usage
WHERE source IN ('schedule_autofill', 'routine_default');
