export type ServiceStatus = "Active" | "Draft" | "Disabled";

export type AdminService = {
  id: string;
  serviceName: string;
  description: string;
  status: ServiceStatus;
  lastUpdated: string;
};

export type ContentCard = {
  title: string;
  description: string;
  actionLabel: string;
  plasmicUrl: string;
};

export type IntegrationStatus = "Not configured" | "Planned" | "Connected";

export const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Appointments", href: "/admin/appointments" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Customer", href: "/admin/customers" },
  { label: "Settings", href: "/admin/settings" },
] as const;

export const adminServices: AdminService[] = [
  {
    id: "SRV-401",
    serviceName: "Business Printing",
    description: "General business document printing consultations and support.",
    status: "Active",
    lastUpdated: "2026-08-08",
  },
  {
    id: "SRV-402",
    serviceName: "Product Demonstration",
    description: "Live product walk-through sessions for prospective clients.",
    status: "Active",
    lastUpdated: "2026-08-06",
  },
  {
    id: "SRV-403",
    serviceName: "After-Sales Support",
    description: "Planned support listing for post-purchase operational help.",
    status: "Draft",
    lastUpdated: "2026-08-03",
  },
];

export const contentCards: ContentCard[] = [
  {
    title: "Homepage",
    description: "Hero, key benefits, service highlights, CTA sections, and FAQ preview.",
    actionLabel: "Edit Content",
    plasmicUrl: "https://studio.plasmic.app/project/docujet-placeholder-home",
  },
  {
    title: "Services",
    description: "Service summaries, consultation CTA, and reusable service content blocks.",
    actionLabel: "Edit Content",
    plasmicUrl: "https://studio.plasmic.app/project/docujet-placeholder-services",
  },
  {
    title: "FAQ",
    description: "Common business questions, accordion entries, and support messaging.",
    actionLabel: "Edit Content",
    plasmicUrl: "https://studio.plasmic.app/project/docujet-placeholder-faq",
  },
  {
    title: "Contact",
    description: "Contact prompts, placeholders, and booking CTA references.",
    actionLabel: "Edit Content",
    plasmicUrl: "https://studio.plasmic.app/project/docujet-placeholder-contact",
  },
];

export const integrationStatuses: Array<{
  name: string;
  status: IntegrationStatus;
  description: string;
}> = [
  {
    name: "Plasmic",
    status: "Connected",
    description: "Public site content components are already registered for visual editing.",
  },
  {
    name: "n8n",
    status: "Planned",
    description: "Workflow automation can be connected later for alerts and follow-ups.",
  },
  {
    // The only row here whose status is not fixed copy — the Settings page
    // replaces it with the live answer, because a sidebar claiming the
    // database is unwired next to a page reading from it is worse than no
    // sidebar at all.
    name: "Supabase",
    status: "Not configured",
    description:
      "Leads and site settings are stored in Postgres. Authentication is not wired up yet, " +
      "so /admin is unprotected.",
  },
];
