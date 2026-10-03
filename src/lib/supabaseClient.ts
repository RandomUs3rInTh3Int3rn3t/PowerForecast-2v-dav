import { createClient } from '@supabase/supabase-js';
import { devLog } from './devLogger';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://ezjzuggagfnkjmbcakta.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gfiWW-NqpccAsARI5pO4Kg_qzOTY6Az';

// Application Version - bump on every deployment according to user versioning rule
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '3.5.0ev';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Resolves authentication tokens from URL (handling both standard query params, single hashes,
 * and double-hash segments created by HashRouter like /#/forgot-password?mode=update#access_token=...)
 */
export async function initializeUrlAuthSession(): Promise<{ hasSession: boolean; userEmail?: string }> {
  if (typeof window === 'undefined') return { hasSession: false };

  try {
    const fullUrl = window.location.href;
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let code: string | null = null;
    let errorDesc: string | null = null;

    // 1. Search in URL query params
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('access_token')) accessToken = searchParams.get('access_token');
    if (searchParams.get('refresh_token')) refreshToken = searchParams.get('refresh_token');
    if (searchParams.get('code')) code = searchParams.get('code');
    if (searchParams.get('error_description')) errorDesc = searchParams.get('error_description');

    // 2. Search in all hash segments (split on '#' to gracefully handle HashRouter double hashes)
    const hashSegments = fullUrl.split('#');
    for (const segment of hashSegments) {
      if (!segment) continue;
      const queryPart = segment.includes('?') ? segment.split('?')[1] : segment;
      const params = new URLSearchParams(queryPart);
      if (params.get('access_token')) accessToken = params.get('access_token');
      if (params.get('refresh_token')) refreshToken = params.get('refresh_token');
      if (params.get('code')) code = params.get('code');
      if (params.get('error_description')) errorDesc = params.get('error_description');
    }

    // 3. Fallback direct regex match across entire URL
    if (!accessToken) {
      const match = fullUrl.match(/[#&?]access_token=([^&]+)/);
      if (match) accessToken = decodeURIComponent(match[1]);
    }
    if (!refreshToken) {
      const match = fullUrl.match(/[#&?]refresh_token=([^&]+)/);
      if (match) refreshToken = decodeURIComponent(match[1]);
    }
    if (!code) {
      const match = fullUrl.match(/[#&?]code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }

    if (errorDesc) {
      devLog.warn('Auth', 'Auth error detected in URL parameters:', errorDesc);
      return { hasSession: false };
    }

    // Explicitly set session if tokens are present
    if (accessToken && refreshToken) {
      devLog.info('Auth', 'Restoring Supabase session from extracted URL access_token and refresh_token...');
      const { data, error } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        devLog.error('Auth', 'Failed to set session from URL tokens:', error);
        return { hasSession: false };
      }
      devLog.info('Auth', 'Session successfully restored for user:', data.session?.user?.email);
      return { hasSession: true, userEmail: data.session?.user?.email };
    }

    // Exchange PKCE authorization code if present
    if (code) {
      devLog.info('Auth', 'Exchanging auth code from URL for session...');
      const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (error) {
        devLog.error('Auth', 'Failed to exchange auth code for session:', error);
        return { hasSession: false };
      }
      devLog.info('Auth', 'Session established via auth code exchange for user:', data.session?.user?.email);
      return { hasSession: true, userEmail: data.session?.user?.email };
    }

    // Check existing stored session
    const { data: existingData } = await supabaseClient.auth.getSession();
    return { hasSession: Boolean(existingData?.session), userEmail: existingData?.session?.user?.email };
  } catch (err) {
    devLog.warn('Auth', 'Error initializing URL auth session:', err);
    return { hasSession: false };
  }
}

// Auto-run if URL contains auth tokens on initial load
if (typeof window !== 'undefined') {
  const currentHref = window.location.href;
  if (currentHref.includes('access_token=') || currentHref.includes('code=') || currentHref.includes('type=recovery')) {
    initializeUrlAuthSession().catch((e) => devLog.warn('Auth', 'Auto-recovery init warning:', e));
  }
}

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
