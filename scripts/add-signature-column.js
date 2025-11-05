// Script to add signature_image_url column to users table
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSignatureColumn() {
  console.log('Adding signature_image_url column to users table...');

  const sql = `
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'signature_image_url'
        ) THEN
            ALTER TABLE users ADD COLUMN signature_image_url TEXT;
            RAISE NOTICE 'Added signature_image_url column';
        ELSE
            RAISE NOTICE 'signature_image_url column already exists';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'signature_storage_path'
        ) THEN
            ALTER TABLE users ADD COLUMN signature_storage_path TEXT;
            RAISE NOTICE 'Added signature_storage_path column';
        ELSE
            RAISE NOTICE 'signature_storage_path column already exists';
        END IF;
    END $$;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).select();

  if (error) {
    console.error('Error adding columns:', error);
    console.log('\nYou need to run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
    process.exit(1);
  }

  console.log('✓ Signature columns added successfully!');
}

addSignatureColumn();
