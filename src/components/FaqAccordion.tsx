"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/site-data";

type FaqAccordionProps = {
  items: FaqItem[];
};

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;

        return (
          <div
            key={item.question}
            className="rounded-3xl border border-slate-200 bg-white"
          >
            <h2>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="text-base font-semibold text-slate-950">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="text-2xl leading-none text-sky-800"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-6 pb-6 text-sm leading-7 text-slate-600"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
