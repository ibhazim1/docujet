"use client";

import { PLASMIC } from "./plasmic-init";
import ServiceCard from "./components/ServiceCard";

PLASMIC.registerComponent(ServiceCard, {
  name: "ServiceCard",
  displayName: "Service Card",
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