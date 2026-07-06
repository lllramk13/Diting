import { supabase } from './supabase'

export async function getIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_is_admin')
  if (error) {
    console.error('[getIsAdmin]', error)
    return false
  }
  return data === true
}