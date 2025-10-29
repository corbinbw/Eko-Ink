// One-time script to add a password to an existing user
// Run with: node scripts/add-password.js

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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure .env.local is set up correctly.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const user = data.users.find((u) => u.email === email);
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }

  return user.id;
}

async function addPassword(email, newPassword) {
  try {
    console.log(`Setting password for user: ${email}...`);

    // Get user ID
    const userId = await getUserId(email);
    console.log(`Found user with ID: ${userId}`);

    // Update the user's password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) throw error;

    console.log('\n✓ Password updated successfully!');
    console.log(`You can now log in with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}`);
  } catch (error) {
    console.error('\nError updating password:', error.message);
    process.exit(1);
  }
}

// Set your email and desired password here
const EMAIL = 'corbinbrandonwilliams@gmail.com';
const NEW_PASSWORD = 'password123'; // Change this to your desired password

addPassword(EMAIL, NEW_PASSWORD);
