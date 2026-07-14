import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export type AuthUserListener = (user: User | null) => void

export async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
}

export async function getCurrentSessionUser() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session?.user ?? null
}

export function subscribeToAuthUser(listener: AuthUserListener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        listener(session?.user ?? null)
    })

    return () => data.subscription.unsubscribe()
}
