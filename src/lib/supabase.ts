import { AuthClient } from '@supabase/auth-js';
import { getSupabaseStorageKey, publishSupabaseClient } from './supabase-readiness';

let supabaseInstance: { auth: InstanceType<typeof AuthClient> } | null = null;

export const getSupabase = (): { auth: InstanceType<typeof AuthClient> } => {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase environment variables are not configured');
        }

        const baseUrl = new URL(supabaseUrl.trim().replace(/\/?$/, '/'));
        if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
            throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.');
        }
        const environment = typeof document !== 'undefined'
            ? 'web'
            : typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
                ? 'react-native'
                : 'node';

        // Preserve the existing project session and OAuth settings for returning users.
        supabaseInstance = { auth: new AuthClient({
            url: new URL('auth/v1', baseUrl).href,
            headers: {
                Authorization: `Bearer ${supabaseAnonKey}`,
                apikey: supabaseAnonKey,
                'X-Client-Info': `supabase-js-${environment}/2.87.1`,
            },
            storageKey: getSupabaseStorageKey(),
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'implicit',
            hasCustomAuthorizationHeader: false,
        }) };
        publishSupabaseClient(supabaseInstance);
    }
    return supabaseInstance;
};
