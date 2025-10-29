import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createServiceClient(); // For creating accounts/users

    // Check authentication
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();

    // Extract deal details
    const customerFirstName = formData.get('customerFirstName') as string;
    const customerLastName = formData.get('customerLastName') as string;
    const addressLine1 = formData.get('addressLine1') as string;
    const addressLine2 = formData.get('addressLine2') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const postalCode = formData.get('postalCode') as string;
    const country = formData.get('country') as string;
    const productName = formData.get('productName') as string;
    const dealValue = formData.get('dealValue') as string;
    const personalDetail = formData.get('personalDetail') as string;

    const audioFile = formData.get('audioFile') as File | null;
    const audioUrl = formData.get('audioUrl') as string | null;

    // Get user's account
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('account_id, id')
      .eq('email', authUser.email)
      .single();

    let userData = user;

    if (userError || !user) {
      // Create user if doesn't exist
      const metadata = authUser.user_metadata;

      // First, create or get account
      let accountId;
      const { data: existingAccount } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('company_name', metadata.company_name || 'Default Company')
        .single();

      if (existingAccount) {
        accountId = existingAccount.id;
      } else {
        const { data: newAccount, error: accountError} = await supabaseAdmin
          .from('accounts')
          .insert({
            company_name: metadata.company_name || 'Default Company',
          })
          .select('id')
          .single();

        if (accountError) {
          console.error('Account creation error:', accountError);
          throw new Error(`Failed to create account: ${accountError.message}`);
        }
        accountId = newAccount.id;
      }

      // Create user
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from('users')
        .insert({
          account_id: accountId,
          email: authUser.email!,
          name: metadata.name || authUser.email!,
        })
        .select('account_id, id')
        .single();

      if (createUserError) {
        console.error('User creation error:', createUserError);
        throw new Error(`Failed to create user profile: ${createUserError.message}`);
      }

      userData = newUser;
    }

    // Handle audio upload if file provided
    let mp3StoragePath = null;
    let mp3Url = audioUrl;

    if (audioFile) {
      const fileName = `${userData.account_id}/${Date.now()}-${audioFile.name}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('call-audio')
        .upload(fileName, audioFile, {
          contentType: audioFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload audio: ${uploadError.message}`);
      }

      mp3StoragePath = uploadData.path;

      // Generate signed URL for AssemblyAI to access
      const { data: urlData } = await supabaseAdmin.storage
        .from('call-audio')
        .createSignedUrl(mp3StoragePath, 3600); // 1 hour

      mp3Url = urlData?.signedUrl || null;
    }

    // Create deal
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .insert({
        account_id: userData.account_id,
        user_id: userData.id,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_address: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          state,
          postal_code: postalCode,
          country,
        },
        product_name: productName,
        deal_value: dealValue ? parseFloat(dealValue) : null,
        closed_at: new Date().toISOString(),
        personal_detail: personalDetail,
      })
      .select()
      .single();

    if (dealError) {
      throw new Error(`Failed to create deal: ${dealError.message}`);
    }

    // Create call record
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        deal_id: deal.id,
        mp3_url: audioUrl,
        mp3_storage_path: mp3StoragePath,
        transcript_status: 'pending',
      })
      .select()
      .single();

    if (callError) {
      throw new Error(`Failed to create call record: ${callError.message}`);
    }

    // Create draft note (will be populated by AI later)
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .insert({
        deal_id: deal.id,
        user_id: userData.id,
        call_id: call.id,
        status: 'pending', // Pending until AI generates the note
        requires_approval: true,
      })
      .select()
      .single();

    if (noteError) {
      throw new Error(`Failed to create note: ${noteError.message}`);
    }

    return NextResponse.json({
      success: true,
      deal,
      call,
      note,
    });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create deal' },
      { status: 500 }
    );
  }
}
