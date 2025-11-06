import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const supabaseAdmin = createServiceClient();

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user data with account credits and invite code
  let { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      account_id,
      signature_image_url,
      invite_code,
      accounts:account_id (
        credits_remaining,
        company_name
      )
    `)
    .eq('email', authUser.email)
    .single();

  // If user doesn't exist in users table, create them with a personal account
  if (!user || userError) {
    console.log('User not found, creating new user and account...');

    // First create an account for this user
    const { data: newAccount, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        company_name: authUser.email?.split('@')[1] || 'Personal Account',
        credits_remaining: 0,
      })
      .select('id, credits_remaining, company_name')
      .single();

    if (accountError || !newAccount) {
      console.error('Error creating account:', accountError);
      redirect('/login');
    }

    // Then create the user linked to this account
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        account_id: newAccount.id,
        email: authUser.email!,
        name: authUser.email?.split('@')[0] || 'User',
        role: 'owner',
      })
      .select(`
        id,
        email,
        name,
        role,
        account_id,
        signature_image_url,
        invite_code,
        accounts:account_id (
          credits_remaining,
          company_name
        )
      `)
      .single();

    if (createError || !newUser) {
      console.error('Error creating user:', createError);
      redirect('/login');
    }

    user = newUser;
  }

  // Get note counts for this user
  const { count: notesSent } = await supabaseAdmin
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['sent', 'delivered']);

  return <SettingsClient user={user} notesSent={notesSent || 0} />;
}
