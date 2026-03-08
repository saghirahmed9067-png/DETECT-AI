import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

if (!config.supabaseUrl || !config.supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
}

export const db = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false }
})
