import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export const runtime = 'edge';

// Admin emails - in production, use a database role column instead
const ADMIN_EMAILS = [
  'martin.pauroud@outlook.com', // Wolfy
];

function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - can't set cookies
          }
        },
      },
    }
  );
}

export default async function AdminPage() {
  const supabase = createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  // Not logged in - redirect to sign in
  if (!session) {
    redirect('/signin?redirect=/admin');
  }

  // Check if user is admin
  const userEmail = session.user.email;
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <h1 className="text-2xl font-bold text-white mb-4">🚫 Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You don&apos;t have admin privileges.
          </p>
          <a href="/" className="text-orange-400 hover:text-orange-300">
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  // User is admin - show dashboard
  return <AdminDashboard />;
}
