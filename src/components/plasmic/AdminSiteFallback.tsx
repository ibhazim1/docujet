import AdminShell from "@/components/admin/AdminShell";

type AdminSiteFallbackProps = {
  children: React.ReactNode;
};

export default function AdminSiteFallback({
  children,
}: AdminSiteFallbackProps) {
  return <AdminShell>{children}</AdminShell>;
}
