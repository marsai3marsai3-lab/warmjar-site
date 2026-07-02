import { createClient } from '@supabase/supabase-js'

// 使用 service role key，可繞過 RLS。僅限在 Server Action 或 API Route 中引用。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
