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

  // Get user with signature data
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, signature_image_url, notes_sent_count, learning_complete')
    .eq('email', authUser.email)
    .single();

  if (!user) {
    redirect('/login');
  }

  return <SettingsClient user={user} />;
}
