import { redirect } from 'next/navigation';

// Root / redirects straight to /dashboard.
// AdminLayout will then enforce auth and redirect to /login if not authenticated.
export default function RootPage() {
  redirect('/dashboard');
}
