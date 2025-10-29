import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { getSupabaseClientConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    // Get the session token from the Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ||
                  request.cookies.get('sb-vszhsjpmlufjmmbswvov-auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Create a Supabase client with the user's token
    const supabaseConfig = getSupabaseClientConfig({
      context: 'app/api/notes/route.ts',
    });

    if (!supabaseConfig) {
      return NextResponse.json(
        { error: 'Supabase environment variables are not configured.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
    }

    // Use admin client for database queries
    const supabaseAdmin = createServiceClient();

    // Get user's account
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('account_id, id')
      .eq('email', user.email)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all notes for this account
    const { data: notes, error } = await supabaseAdmin
      .from('notes')
      .select(`
        *,
        deals:deal_id (
          customer_first_name,
          customer_last_name,
          product_name,
          deal_value
        )
      `)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}
