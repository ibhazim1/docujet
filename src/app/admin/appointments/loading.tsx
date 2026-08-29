import AdminSkeleton from "@/components/admin/AdminSkeleton";

// A list page: no KPI row above it, so the tiles are dropped rather than
// promising a shape the page does not have.
export default function Loading() {
  return <AdminSkeleton title="Appointments" tiles={0} rows={8} />;
}
