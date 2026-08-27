export type AppointmentStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Won"
  | "Lost";

export type ServiceStatus = "Active" | "Draft" | "Disabled";

export type Appointment = {
  id: string;
  customer: string;
  company: string;
  email: string;
  phone: string;
  product: string;
  appointmentType: string;
  preferredDate: string;
  preferredTime: string;
  status: AppointmentStatus;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  productInterest: string;
  source: string;
  status: LeadStatus;
  createdDate: string;
};

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
  { label: "Settings", href: "/admin/settings" },
] as const;

export const superadminNavItems = [
  ...adminNavItems,
  { label: "Staff Accounts", href: "/superadmin/users" },
] as const;

export const dashboardStats = [
  { label: "Total Appointments", value: "128", helper: "Demo total for UI preview" },
  { label: "Pending Appointments", value: "14", helper: "Awaiting confirmation" },
  { label: "New Leads", value: "22", helper: "Captured this month" },
  { label: "Total Customers", value: "64", helper: "Leads at the Customer stage" },
];

export const appointments: Appointment[] = [
  {
    id: "APT-1001",
    customer: "Aisyah Rahman",
    company: "Southpoint Advisory",
    email: "aisyah@example.com",
    phone: "+60 12-555 0181",
    product: "WorkForce Enterprise WF-C20600",
    appointmentType: "Product Consultation",
    preferredDate: "2026-08-12",
    preferredTime: "10:00",
    status: "Pending",
  },
  {
    id: "APT-1002",
    customer: "Daniel Lim",
    company: "Vertex Projects",
    email: "daniel@example.com",
    phone: "+60 12-555 0182",
    product: "WorkForce Enterprise WF-C20750",
    appointmentType: "Product Demonstration",
    preferredDate: "2026-08-13",
    preferredTime: "14:30",
    status: "Confirmed",
  },
  {
    id: "APT-1003",
    customer: "Nurul Huda",
    company: "Axis Legal Support",
    email: "nurul@example.com",
    phone: "+60 12-555 0183",
    product: "Not sure - recommendation required",
    appointmentType: "Pricing Discussion",
    preferredDate: "2026-08-15",
    preferredTime: "11:15",
    status: "Completed",
  },
  {
    id: "APT-1004",
    customer: "Marcus Tan",
    company: "Evergrid Holdings",
    email: "marcus@example.com",
    phone: "+60 12-555 0184",
    product: "WorkForce Enterprise WF-C21000",
    appointmentType: "Technical Consultation",
    preferredDate: "2026-08-16",
    preferredTime: "15:00",
    status: "Cancelled",
  },
];

export const leads: Lead[] = [
  {
    id: "LEAD-201",
    name: "Siti Hana",
    company: "MetroWorks",
    email: "siti@example.com",
    phone: "+60 13-555 2011",
    productInterest: "WorkForce Enterprise WF-C20600",
    source: "Booking Form",
    status: "New",
    createdDate: "2026-08-09",
  },
  {
    id: "LEAD-202",
    name: "Adrian Goh",
    company: "Northshore Retail",
    email: "adrian@example.com",
    phone: "+60 13-555 2012",
    productInterest: "WorkForce Enterprise WF-C20750",
    source: "Contact Form",
    status: "Qualified",
    createdDate: "2026-08-07",
  },
  {
    id: "LEAD-203",
    name: "Farah Yusof",
    company: "Delta Medical Supply",
    email: "farah@example.com",
    phone: "+60 13-555 2013",
    productInterest: "Recommendation required",
    source: "Manual Entry",
    status: "Proposal",
    createdDate: "2026-08-05",
  },
];

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
