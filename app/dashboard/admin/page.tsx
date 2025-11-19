'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Account {
  id: string;
  company_name: string;
  billing_type: string;
  credits_remaining: number;
  api_monthly_limit: number;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  is_admin: boolean;
  created_at: string;
  userCount: number;
  apiKeyCount: number;
  currentMonthUsage: {
    cardsSent: number;
    apiCalls: number;
    amountOwed: number;
  };
}

interface User {
  id: string;
  account_id: string;
  email: string;
  name: string;
  role: string;
  notes_sent_count: number;
  learning_complete: boolean;
  created_at: string;
}

interface ApiKey {
  id: string;
  account_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: string;
  read_at: string | null;
  notes: string | null;
  created_at: string;
  referrer: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

interface AdminData {
  accounts: Account[];
  users: User[];
  apiKeys: ApiKey[];
  contactSubmissions: ContactSubmission[];
  stats: {
    totalRevenue: number;
    cardsSentThisMonth: number;
    activePayingCustomers: number;
    monthlyRecurringRevenue: number;
    approvalRate: number;
    failedGenerations: number;
    newAccountsThisMonth: number;
    avgCardsPerCustomer: string;
    totalApiKeys: number;
  };
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'accounts' | 'users' | 'api-keys' | 'contact'>('accounts');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const response = await fetch('/api/admin/overview');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch admin data');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h2>
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Master Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">View all users, accounts, and API keys across EkoInk</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Revenue (All Time)"
          value={`$${(data.stats.totalRevenue / 100).toFixed(2)}`}
          subtitle="Credits + API invoices"
        />
        <StatCard
          title="Cards Sent This Month"
          value={data.stats.cardsSentThisMonth}
          subtitle="Physical cards delivered"
        />
        <StatCard
          title="Active Paying Customers"
          value={data.stats.activePayingCustomers}
          subtitle="Accounts with credits or recent activity"
        />
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${(data.stats.monthlyRecurringRevenue / 100).toFixed(2)}`}
          subtitle="Projected from API usage"
        />
        <StatCard
          title="Note Approval Rate"
          value={`${data.stats.approvalRate}%`}
          subtitle="AI quality metric"
        />
        <StatCard
          title="Failed Generations"
          value={data.stats.failedGenerations}
          subtitle="Needs attention"
          alert={data.stats.failedGenerations > 0}
        />
        <StatCard
          title="New Accounts This Month"
          value={data.stats.newAccountsThisMonth}
          subtitle="Growth metric"
        />
        <StatCard
          title="Avg Cards per Customer"
          value={data.stats.avgCardsPerCustomer}
          subtitle="Engagement metric"
        />
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setView('accounts')}
            className={`${
              view === 'accounts'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Accounts ({data.accounts.length})
          </button>
          <button
            onClick={() => setView('users')}
            className={`${
              view === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Users ({data.users.length})
          </button>
          <button
            onClick={() => setView('api-keys')}
            className={`${
              view === 'api-keys'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            API Keys ({data.apiKeys.filter((k) => !k.revoked_at).length})
          </button>
          <button
            onClick={() => setView('contact')}
            className={`${
              view === 'contact'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Contact Requests ({data.contactSubmissions?.filter((c) => c.status === 'new').length || 0})
          </button>
        </nav>
      </div>

      {/* Content */}
      {view === 'accounts' && <AccountsView accounts={data.accounts} users={data.users} apiKeys={data.apiKeys} />}
      {view === 'users' && <UsersView users={data.users} accounts={data.accounts} />}
      {view === 'api-keys' && <ApiKeysView apiKeys={data.apiKeys} accounts={data.accounts} />}
      {view === 'contact' && <ContactView contactSubmissions={data.contactSubmissions || []} onUpdate={fetchData} />}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  alert,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow ${
        alert ? 'ring-2 ring-red-500 dark:ring-red-400' : ''
      }`}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function AccountsView({ accounts, users, apiKeys }: { accounts: Account[]; users: User[]; apiKeys: ApiKey[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Billing Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                This Month
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {accounts.map((account) => (
              <>
                <tr
                  key={account.id}
                  onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg
                        className={`w-4 h-4 mr-2 transform transition-transform ${
                          expandedId === account.id ? 'rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {account.company_name}
                          {account.is_admin && (
                            <span className="ml-2 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{account.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.billing_type === 'monthly_api'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {account.billing_type === 'monthly_api' ? 'Monthly API' : 'Credits'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {account.credits_remaining}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {account.userCount} users, {account.apiKeyCount} keys
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {account.billing_type === 'monthly_api' ? (
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-gray-100">
                          {account.currentMonthUsage.cardsSent} cards
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          ${(account.currentMonthUsage.amountOwed / 100).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
                  </td>
                </tr>
                {expandedId === account.id && (
                  <tr key={`${account.id}-details`}>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account Details */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Account Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Full Account ID:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{account.id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Billing Type:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.billing_type}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Credits Remaining:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.credits_remaining}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">API Monthly Limit:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.api_monthly_limit}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Stripe Customer:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                                {account.stripe_customer_id || 'Not connected'}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Payment Method:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {account.stripe_payment_method_id ? 'Connected' : 'None'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Usage Stats */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Month Usage</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Cards Sent:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.currentMonthUsage.cardsSent}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">API Calls:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.currentMonthUsage.apiCalls}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Amount Owed:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                ${(account.currentMonthUsage.amountOwed / 100).toFixed(2)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Total Users:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.userCount}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Active API Keys:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{account.apiKeyCount}</dd>
                            </div>
                          </dl>
                        </div>

                        {/* Users List */}
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Users in this Account</h4>
                          <div className="space-y-2">
                            {users.filter((u) => u.account_id === account.id).length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No users yet</p>
                            ) : (
                              users
                                .filter((u) => u.account_id === account.id)
                                .map((user) => (
                                  <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-gray-900 dark:text-gray-100">{user.notes_sent_count} notes</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.role}</div>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* API Keys List */}
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">API Keys for this Account</h4>
                          <div className="space-y-2">
                            {apiKeys.filter((k) => k.account_id === account.id).length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No API keys yet</p>
                            ) : (
                              apiKeys
                                .filter((k) => k.account_id === account.id)
                                .map((key) => (
                                  <div
                                    key={key.id}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{key.name}</div>
                                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{key.key_prefix}...</div>
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`px-2 py-1 text-xs rounded-full ${
                                          key.revoked_at
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        }`}
                                      >
                                        {key.revoked_at ? 'Revoked' : 'Active'}
                                      </span>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {key.last_used_at ? `Used ${formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}` : 'Never used'}
                                      </div>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersView({ users, accounts }: { users: User[]; accounts: Account[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Notes Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Learning
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <>
                <tr
                  key={user.id}
                  onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg
                        className={`w-4 h-4 mr-2 transform transition-transform ${
                          expandedId === user.id ? 'rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {accountMap.get(user.account_id)?.company_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.notes_sent_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.learning_complete ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Complete
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        {user.notes_sent_count}/25
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === user.id && (
                  <tr key={`${user.id}-details`}>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Details */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">User Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Full User ID:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{user.id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{user.name}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Email:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{user.email}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Role:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{user.role}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Account ID:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{user.account_id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Created:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Activity Stats */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Activity & Learning</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Notes Sent:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{user.notes_sent_count}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Learning Status:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {user.learning_complete ? (
                                  <span className="text-green-600 dark:text-green-400">Complete</span>
                                ) : (
                                  <span className="text-yellow-600 dark:text-yellow-400">
                                    In Progress ({user.notes_sent_count}/25)
                                  </span>
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Notes Remaining:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {user.learning_complete ? '—' : `${25 - user.notes_sent_count} to complete learning`}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Account Info */}
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Associated Account</h4>
                          {accountMap.get(user.account_id) ? (
                            <div className="p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {accountMap.get(user.account_id)!.company_name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {accountMap.get(user.account_id)!.billing_type}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-900 dark:text-gray-100">
                                    {accountMap.get(user.account_id)!.credits_remaining} credits
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {accountMap.get(user.account_id)!.userCount} users
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Account not found</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiKeysView({ apiKeys, accounts }: { apiKeys: ApiKey[]; accounts: Account[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const accountMap = new Map(accounts.map((a) => [a.id, a.company_name]));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Key Prefix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Scopes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Used
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {apiKeys.map((key) => (
              <>
                <tr
                  key={key.id}
                  onClick={() => setExpandedId(expandedId === key.id ? null : key.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg
                        className={`w-4 h-4 mr-2 transform transition-transform ${
                          expandedId === key.id ? 'rotate-90' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{key.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {accountMap.get(key.account_id) || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded font-mono">
                      {key.key_prefix}...
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 3).map((scope) => (
                        <span
                          key={scope}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                        >
                          {scope}
                        </span>
                      ))}
                      {key.scopes.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                          +{key.scopes.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {key.revoked_at ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Revoked
                      </span>
                    ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === key.id && (
                  <tr key={`${key.id}-details`}>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* API Key Details */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">API Key Details</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Full Key ID:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{key.id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">{key.name}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Key Prefix:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono">{key.key_prefix}...</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Account ID:</dt>
                              <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{key.account_id}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Created:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* Usage & Status */}
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Usage & Status</h4>
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Status:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {key.revoked_at ? (
                                  <span className="text-red-600 dark:text-red-400">Revoked</span>
                                ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                                  <span className="text-orange-600 dark:text-orange-400">Expired</span>
                                ) : (
                                  <span className="text-green-600 dark:text-green-400">Active</span>
                                )}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Last Used:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {key.last_used_at ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true }) : 'Never used'}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Expires:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {key.expires_at ? formatDistanceToNow(new Date(key.expires_at), { addSuffix: true }) : 'Never'}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-gray-500 dark:text-gray-400">Revoked:</dt>
                              <dd className="text-gray-900 dark:text-gray-100">
                                {key.revoked_at ? formatDistanceToNow(new Date(key.revoked_at), { addSuffix: true }) : 'No'}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {/* All Scopes */}
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Scopes ({key.scopes.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {key.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactView({ contactSubmissions, onUpdate }: { contactSubmissions: ContactSubmission[]; onUpdate: () => void }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const response = await fetch('/api/admin/contact-submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating contact submission:', error);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Submitted
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {contactSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No contact submissions yet
                </td>
              </tr>
            ) : (
              contactSubmissions.map((submission) => (
                <>
                  <tr
                    key={submission.id}
                    onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      submission.status === 'new' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <svg
                          className={`w-4 h-4 mr-2 transform transition-transform ${
                            expandedId === submission.id ? 'rotate-90' : ''
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {submission.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`mailto:${submission.email}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {submission.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {submission.company || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 max-w-md">
                        {submission.message.length > 100
                          ? `${submission.message.substring(0, 100)}...`
                          : submission.message}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          submission.status === 'new'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : submission.status === 'contacted'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : submission.status === 'qualified'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : submission.status === 'spam'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                  {expandedId === submission.id && (
                    <tr key={`${submission.id}-details`}>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Contact Details */}
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact Details</h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Submission ID:</dt>
                                <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">{submission.id}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                                <dd className="text-gray-900 dark:text-gray-100">{submission.name}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Email:</dt>
                                <dd className="text-gray-900 dark:text-gray-100">
                                  <a
                                    href={`mailto:${submission.email}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {submission.email}
                                  </a>
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Company:</dt>
                                <dd className="text-gray-900 dark:text-gray-100">{submission.company || 'Not provided'}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Submitted:</dt>
                                <dd className="text-gray-900 dark:text-gray-100">
                                  {new Date(submission.created_at).toLocaleString()}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Status & Tracking */}
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Status & Tracking</h4>
                            <dl className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <dt className="text-gray-500 dark:text-gray-400">Current Status:</dt>
                                <dd>
                                  <select
                                    value={submission.status}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateStatus(submission.id, e.target.value);
                                    }}
                                    disabled={updating === submission.id}
                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                  >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="spam">Spam</option>
                                    <option value="archived">Archived</option>
                                  </select>
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Read:</dt>
                                <dd className="text-gray-900 dark:text-gray-100">
                                  {submission.read_at ? formatDistanceToNow(new Date(submission.read_at), { addSuffix: true }) : 'Unread'}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Referrer:</dt>
                                <dd className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-xs">
                                  {submission.referrer || 'Direct'}
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">IP Address:</dt>
                                <dd className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                                  {submission.ip_address || 'Unknown'}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Full Message */}
                          <div className="md:col-span-2">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Full Message</h4>
                            <div className="p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                {submission.message}
                              </p>
                            </div>
                          </div>

                          {/* Internal Notes */}
                          {submission.notes && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Internal Notes</h4>
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                  {submission.notes}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* User Agent */}
                          {submission.user_agent && (
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">User Agent</h4>
                              <code className="block p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-800 dark:text-gray-300">
                                {submission.user_agent}
                              </code>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
