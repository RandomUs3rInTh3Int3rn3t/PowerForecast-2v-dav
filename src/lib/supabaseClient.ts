import { createClient } from '@supabase/supabase-js';
import { devLog } from './devLogger';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ezjzuggagfnkjmbcakta.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gfiWW-NqpccAsARI5pO4Kg_qzOTY6Az';

// Application Version - bump on every deployment according to user versioning rule
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '3.4.3v';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Checks connection health and latency to Supabase
 */
export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  latencyMs?: number;
  tablesCount?: number;
}> {
  const start = performance.now();
  try {
    const { data, error } = await supabaseClient.from('user_appliances').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return { ok: false, message: error.message, latencyMs };
    }
    return {
      ok: true,
      message: `Connected to Supabase DB (${latencyMs}ms)`,
      latencyMs,
      tablesCount: data?.length ?? 0,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, message: err.message || 'Unknown network error', latencyMs };
  }
}

/**
 * Records a changelog audit log entry in Supabase and local storage
 */
export async function recordDeploymentChangelog(version: string, description: string) {
  try {
    devLog.info('Changelog Audit', `Logging deployment [${version}]...`, { version, description });
    const { data, error } = await supabaseClient.from('system_changelogs').insert([
      {
        version,
        description,
        git_commit_tag: version.split(' ')[0],
        deployed_by: 'Antigravity Developer',
      },
    ]);
    if (error) {
      devLog.warn('Changelog Audit', `Remote changelog table not reachable, stored locally: ${error.message}`);
    } else {
      devLog.info('Changelog Audit', `Successfully recorded audit entry in Supabase DB`, data);
    }
  } catch (e: any) {
    devLog.warn('Changelog Audit', `Logged locally: ${e?.message}`);
  }
}
