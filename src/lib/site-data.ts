export type NavItem = {
  label: string;
  href: string;
};

export type ServiceItem = {
  title: string;
  description: string;
  buttonText?: string;
  buttonUrl?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/services" },
  { label: "Book Appointment", href: "/booking" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const benefitItems = [
  {
    title: "Consistent High-Speed Output",
    description:
      "Simplex and duplex printing remain fast across the range, with performance options up to 60, 75, and 100 pages per minute.",
  },
  {
    title: "Heat-Free Efficiency",
    description:
      "Epson Heat-Free Technology reduces power consumption and helps lower running costs compared with conventional laser printing workflows.",
  },
  {
    title: "High Yield Consumables",
    description:
      "Print up to 100,000 black pages or 50,000 colour pages before cartridge replacement to reduce intervention.",
  },
  {
    title: "Advanced Finishing",
    description:
      "Support for stapling, hole punching, booklet printing, thick media, and long paper helps match demanding business workflows.",
  },
];

export const serviceItems: ServiceItem[] = [
  {
    title: "WF-C20600",
    description:
      "A3 colour multifunction printer designed for enterprise productivity, with approximate ISO print speeds of 60 ipm for simplex and duplex output, Heat-Free performance, and support for advanced finishing options.",
    buttonText: "Discuss WF-C20600",
    buttonUrl: "/booking",
  },
  {
    title: "WF-C20750",
    description:
      "High-volume A3 business printer with approximate ISO print speeds of 75 ipm for simplex and duplex printing, built on Epson PrecisionCore linehead technology for fast and consistent output.",
    buttonText: "Discuss WF-C20750",
    buttonUrl: "/booking",
  },
  {
    title: "WF-C21000",
    description:
      "Flagship WorkForce Enterprise model delivering approximate ISO print speeds up to 100 ipm, high-capacity ink support, enterprise workflow integration, and Epson Heat-Free Technology for demanding print environments.",
    buttonText: "Discuss WF-C21000",
    buttonUrl: "/booking",
  },
];

export const whyChooseItems = [
  "Heat-Free Technology means less power consumption and no fuser warm-up stage",
  "PrecisionCore linehead design supports high speed printing with approximately 33,500 active nozzles",
  "Fast first page out time starts from approximately 5.0 seconds depending on model",
  "High-capacity ink and fewer replacement parts help reduce downtime and intervention",
  "Fleet management, document capture, and print administration tools support enterprise environments",
];

export const faqItems: FaqItem[] = [
  {
    question:
      "What are the main differences between the WF-C20600, WF-C20750, and WF-C21000?",
    answer:
      "The three models share the same WorkForce Enterprise platform but differ mainly in output speed, delivering approximate ISO print speeds of 60 ipm, 75 ipm, and 100 ipm respectively.",
  },
  {
    question: "What is Epson Heat-Free Technology?",
    answer:
      "Heat-Free Technology avoids the heating and fusing stages used by laser printers. Epson's inkjet process focuses on receiving the job, ejecting ink, and printing out, which supports lower power use and faster readiness.",
  },
  {
    question: "How much ink yield can these printers deliver?",
    answer:
      "The brochure states output of up to 100,000 pages in black using two black cartridges and up to 50,000 pages in colour, helping reduce consumable changes.",
  },
  {
    question: "Do these models support duplex printing at high speed?",
    answer:
      "Yes. The WorkForce Enterprise range is positioned around consistent high-speed simplex and duplex printing, with the brochure specifically highlighting a short duplex route design.",
  },
  {
    question: "What media types can the multipurpose tray handle?",
    answer:
      "The multipurpose tray supports a wide range of media including envelopes, sticker media, thick stock up to 350 g/m2, and long paper up to 1.2 metres.",
  },
  {
    question: "What workflow and management solutions are available?",
    answer:
      "The brochure highlights Epson Device Admin, Epson Remote Service, Epson Print Admin, Epson Print Admin Serverless, Epson Open Platform, Document Capture Pro, and Document Capture Pro Server.",
  },
  {
    question: "What security features are included?",
    answer:
      "Security features listed include PIN release printing, IP address filtering, panel admin mode, limited access functions, and LDAP address book integration.",
  },
];

export const bookingProducts = [
  "WorkForce Enterprise WF-C20600",
  "WorkForce Enterprise WF-C20750",
  "WorkForce Enterprise WF-C21000",
  "Not sure - recommendation required",
];

export const bookingTypes = [
  "Product Consultation",
  "Product Demonstration",
  "Pricing Discussion",
  "Technical Consultation",
  "After-Sales Support",
];

export const footerPlaceholders = {
  phone: "1800-81-7349 (Toll-Free, Malaysia)",
  email: "Enterprise printing enquiries via Epson Malaysia website contact channels",
  office:
    "Epson Malaysia Sdn Bhd, 3rd Floor, East Tower, Wisma Consplant 1, No. 2, Jalan SS16/4, 47500 Subang Jaya, Selangor Darul Ehsan.",
  hours:
    "Business hours were not listed in the brochure. Please contact the Malaysia enterprise printing line for current availability.",
};
