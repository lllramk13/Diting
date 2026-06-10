import { supabase } from './supabase'

export async function getIsAdmin(uid: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', uid).single()
  return (data as { is_admin?: boolean } | null)?.is_admin ?? false
}
