type AdminTableProps = {
  children: React.ReactNode;
};

export default function AdminTable({ children }: AdminTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">{children}</div>
    </div>
  );
}
