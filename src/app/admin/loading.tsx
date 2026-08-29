import AdminSkeleton from "@/components/admin/AdminSkeleton";

// Shown the instant /admin is clicked, while the Plasmic lookup and the
// Supabase reads behind the dashboard run. See AdminSkeleton for why.
export default function Loading() {
  return <AdminSkeleton title="Dashboard" tiles={6} rows={5} />;
}
