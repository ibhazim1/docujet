import AdminSkeleton from "@/components/admin/AdminSkeleton";

// The tracker reads the whole lead book, its appointments and its event
// history before it can render anything, so this is the page the skeleton
// matters most on.
export default function Loading() {
  return <AdminSkeleton title="Lead Tracker" tiles={6} rows={6} />;
}
