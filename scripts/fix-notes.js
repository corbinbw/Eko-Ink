// One-time script to fix existing notes with placeholder text
// Run with: node scripts/fix-notes.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixNotes() {
  try {
    console.log('Fixing notes with placeholder text...');

    const { data, error } = await supabase
      .from('notes')
      .update({
        draft_text: '',
        status: 'pending',
      })
      .or('draft_text.eq.Generating note...')
      .select();

    if (error) throw error;

    console.log(`\n✓ Fixed ${data?.length || 0} notes!`);
    console.log('These notes will now show the "Generate Note" button.');
  } catch (error) {
    console.error('\nError fixing notes:', error.message);
    process.exit(1);
  }
}

fixNotes();
