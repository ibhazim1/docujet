type ServiceCardProps = {
  title?: string;
  description?: string;
};

export default function ServiceCard({
  title = "Service Title",
  description = "Service description goes here.",
}: ServiceCardProps) {
  return (
    <div className="rounded-xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}