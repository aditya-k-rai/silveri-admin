import AdminLayout from "@/components/AdminLayout";

// This layout wraps all authenticated admin routes with the AdminLayout component
// (sidebar navigation, header, auth guard, 4-hour session freshness gate).
// The /login route lives OUTSIDE this group and uses only the root layout.
export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
