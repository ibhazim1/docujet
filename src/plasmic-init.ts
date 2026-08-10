import { initPlasmicLoader } from "@plasmicapp/loader-nextjs/react-server-conditional";
import ServiceCard from "@/components/ServiceCard";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.PLASMIC_PROJECT_ID!,
      token: process.env.PLASMIC_API_TOKEN!,
    },
  ],
  preview: true,
});

PLASMIC.registerComponent(ServiceCard, {
  name: "ServiceCard",
  props: {
    title: {
      type: "string",
      defaultValue: "Service Title",
    },
    description: {
      type: "string",
      defaultValue: "Service description goes here.",
    },
  },
});