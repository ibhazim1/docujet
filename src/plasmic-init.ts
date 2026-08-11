import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import ServiceCard from "@/components/ServiceCard";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ServicesSection from "@/components/ServicesSection";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import HomePage from "@/components/pages/HomePage";
import ServicesPage from "@/components/pages/ServicesPage";
import BookingPage from "@/components/pages/BookingPage";
import FAQPage from "@/components/pages/FAQPage";
import ContactPage from "@/components/pages/ContactPage";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.PLASMIC_PROJECT_ID!,
      token: process.env.PLASMIC_API_TOKEN!,
    },
  ],
  preview: false,
});

PLASMIC.registerComponent(ServiceCard, {
  name: "ServiceCard",
  displayName: "Service Card",
  props: {
    className: {
      type: "class",
    },
    title: {
      type: "string",
      defaultValue: "Service Title",
    },
    description: {
      type: "string",
      defaultValue: "Service description goes here.",
    },
    buttonText: {
      type: "string",
      defaultValue: "Learn More",
    },
    buttonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(Navbar, {
  name: "Navbar",
  displayName: "Navbar",
  props: {
    className: {
      type: "class",
    },
  },
});

PLASMIC.registerComponent(Hero, {
  name: "Hero",
  displayName: "Hero Section",
  props: {
    className: {
      type: "class",
    },
    eyebrow: {
      type: "string",
      defaultValue: "DocuJet Document Solutions",
    },
    title: {
      type: "string",
      defaultValue: "Smart Printing Solutions for Modern Businesses",
    },
    description: {
      type: "string",
      defaultValue:
        "DocuJet provides reliable printing, printer consultation, document solutions, product demonstrations, and business printing support.",
    },
    primaryButtonText: {
      type: "string",
      defaultValue: "Book an Appointment",
    },
    primaryButtonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
    secondaryButtonText: {
      type: "string",
      defaultValue: "Explore Solutions",
    },
    secondaryButtonUrl: {
      type: "string",
      defaultValue: "/services",
    },
  },
});

PLASMIC.registerComponent(ServicesSection, {
  name: "ServicesSection",
  displayName: "Services Section",
  props: {
    className: {
      type: "class",
    },
    title: {
      type: "string",
      defaultValue: "WorkForce Enterprise Product Range",
    },
    description: {
      type: "string",
      defaultValue:
        "Explore the three Epson WorkForce Enterprise models and review the key product details highlighted in the brochure.",
    },
  },
});

PLASMIC.registerComponent(CallToAction, {
  name: "CallToAction",
  displayName: "Call To Action",
  props: {
    className: {
      type: "class",
    },
    title: {
      type: "string",
      defaultValue: "Book a consultation with DocuJet",
    },
    description: {
      type: "string",
      defaultValue:
        "Tell us what you need and we will prepare the right discussion, demonstration, or recommendation path for your business.",
    },
    buttonText: {
      type: "string",
      defaultValue: "Book Appointment",
    },
    buttonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(Footer, {
  name: "Footer",
  displayName: "Footer",
  props: {
    className: {
      type: "class",
    },
    companyName: {
      type: "string",
      defaultValue: "DocuJet",
    },
    bookingLinkText: {
      type: "string",
      defaultValue: "Book Appointment",
    },
    bookingLinkUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(HomePage, {
  name: "HomePage",
  displayName: "DocuJet Home Page",
  props: {
    heroTitle: {
      type: "string",
      defaultValue: "Smart Printing Solutions for Modern Businesses",
    },
    heroDescription: {
      type: "string",
      defaultValue:
        "DocuJet provides reliable printing, printer consultation, document solutions, product demonstrations, and business printing support for organisations that need dependable output and clear guidance.",
    },
    primaryButtonText: {
      type: "string",
      defaultValue: "Book an Appointment",
    },
    primaryButtonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
    secondaryButtonText: {
      type: "string",
      defaultValue: "Explore Solutions",
    },
    secondaryButtonUrl: {
      type: "string",
      defaultValue: "/services",
    },
    benefitsHeading: {
      type: "string",
      defaultValue:
        "Built for business printing decisions that need clarity and reliability",
    },
    whyChooseHeading: {
      type: "string",
      defaultValue:
        "A professional approach to printer consultation and document support",
    },
    faqHeading: {
      type: "string",
      defaultValue: "Common questions from businesses exploring DocuJet",
    },
    ctaTitle: {
      type: "string",
      defaultValue: "Ready to discuss your printing requirements?",
    },
    ctaDescription: {
      type: "string",
      defaultValue:
        "Book an appointment for consultation, product demonstrations, pricing discussions, or technical guidance.",
    },
    ctaButtonText: {
      type: "string",
      defaultValue: "Book Appointment",
    },
    ctaButtonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(ServicesPage, {
  name: "ServicesPage",
  displayName: "DocuJet Services Page",
  props: {
    className: {
      type: "class",
    },
    pageTitle: {
      type: "string",
      defaultValue: "Epson WorkForce Enterprise WF-C20600, WF-C20750, and WF-C21000",
    },
    pageDescription: {
      type: "string",
      defaultValue:
        "Explore the Epson WorkForce Enterprise product range and review the key details for each model, including print speed, Heat-Free performance, finishing support, workflow compatibility, and enterprise-ready features.",
    },
    ctaTitle: {
      type: "string",
      defaultValue: "Need help choosing the right product?",
    },
    ctaDescription: {
      type: "string",
      defaultValue:
        "Book a product consultation to compare the WF-C20600, WF-C20750, and WF-C21000 based on output speed, media handling, finishing options, and deployment needs.",
    },
    ctaButtonText: {
      type: "string",
      defaultValue: "Book Product Consultation",
    },
    ctaButtonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(BookingPage, {
  name: "BookingPage",
  displayName: "DocuJet Booking Page",
  props: {
    className: {
      type: "class",
    },
    pageTitle: {
      type: "string",
      defaultValue: "Schedule a consultation or product discussion with DocuJet",
    },
    pageDescription: {
      type: "string",
      defaultValue:
        "Use the form below to request a consultation, demonstration, pricing discussion, technical session, or after-sales support appointment.",
    },
    introTitle: {
      type: "string",
      defaultValue: "What to expect",
    },
  },
});

PLASMIC.registerComponent(FAQPage, {
  name: "FAQPage",
  displayName: "DocuJet FAQ Page",
  props: {
    className: {
      type: "class",
    },
    pageTitle: {
      type: "string",
      defaultValue: "Clear answers for businesses exploring DocuJet",
    },
    pageDescription: {
      type: "string",
      defaultValue:
        "Review common questions about appointments, demonstrations, printer recommendations, pricing discussions, business printing, and support.",
    },
    ctaTitle: {
      type: "string",
      defaultValue: "Still need a tailored answer?",
    },
    ctaDescription: {
      type: "string",
      defaultValue:
        "Book an appointment and discuss your business requirements directly with DocuJet.",
    },
    ctaButtonText: {
      type: "string",
      defaultValue: "Book Appointment",
    },
    ctaButtonUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});

PLASMIC.registerComponent(ContactPage, {
  name: "ContactPage",
  displayName: "DocuJet Contact Page",
  props: {
    className: {
      type: "class",
    },
    pageTitle: {
      type: "string",
      defaultValue: "Speak with DocuJet about your printing and document needs",
    },
    pageDescription: {
      type: "string",
      defaultValue:
        "Use the contact form for general enquiries, or book an appointment if you already know the type of consultation you need.",
    },
    phone: {
      type: "string",
      defaultValue: "Phone placeholder - replace with official business number",
    },
    email: {
      type: "string",
      defaultValue: "Email placeholder - replace with official business email",
    },
    address: {
      type: "string",
      defaultValue: "Office location placeholder - replace with official address",
    },
    businessHours: {
      type: "string",
      defaultValue: "Business hours placeholder - replace with actual operating hours",
    },
    ctaText: {
      type: "string",
      defaultValue: "Book Appointment",
    },
    ctaUrl: {
      type: "string",
      defaultValue: "/booking",
    },
  },
});
