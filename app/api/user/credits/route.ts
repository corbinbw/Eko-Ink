import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with account credits
    const { data: user } = await supabaseAdmin
      .from('users')
      .select(`
        account_id,
        accounts:account_id (
          credits_remaining
        )
      `)
      .eq('email', authUser.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const accountData = Array.isArray(user.accounts) ? user.accounts[0] : user.accounts;
    const credits = (accountData as any)?.credits_remaining || 0;

    return NextResponse.json({ credits });
  } catch (error: any) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
