import { supabase } from '../../lib/supabase'

type ProfileUsernameRow = {
    username: string
}

export async function getProfileUsername(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle<ProfileUsernameRow>()

    if (error) throw error
    return data?.username ?? null
}
