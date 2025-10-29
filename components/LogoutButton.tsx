'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Logging out...' : 'Log out'}
    </button>
  );
}
