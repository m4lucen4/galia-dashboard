import { useState } from "react";
import type { BillingPeriod } from "@/types";
import { SUBSCRIPTION_PRICES, formatMoney } from "@/helpers/subscriptionPricing";
import { Container } from "@/features/newWeb/components/ui/Container";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";
import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { PricingCard, type PricingCardProps } from "@/features/newWeb/components/ui/PricingCard";
import { BillingToggle, type BillingToggleProps } from "./BillingToggle";
import { SavingsCalculator } from "@/features/newWeb/components/savingsCalculator/SavingsCalculator.tsx";

const professionalFeatures = [
  "Publicaciones ilimitadas",
  "Instagram y LinkedIn",
  "Prompt personalizado con tu tono",
  "Constructor web opcional",
];
const accompanimentFeatures = [
  "Nos envías el material; lo organizamos y subimos",
  "Te proponemos el calendario",
  "Constructor web incluido",
  "Fotografía e identidad, si lo necesitas",
];

export const PricingSectionView = ({ value, onChange }: BillingToggleProps) => {
  const annual = value === "annual";
  const monthlyEquivalent = annual ? SUBSCRIPTION_PRICES.annual / 12 : SUBSCRIPTION_PRICES.monthly;
  const cards: PricingCardProps[] = [
    {
      label: "Profesional",
      tone: "yellow",
      price: <><span aria-describedby="pricing-tax-note">{formatMoney(monthlyEquivalent)}*</span><span className="ml-1.5 inline-block text-base tracking-normal">/mes{annual ? " equivalente" : ""}</span></>,
      secondary: annual
        ? <span aria-describedby="pricing-tax-note">{formatMoney(SUBSCRIPTION_PRICES.annual)}* al año · Facturación anual</span>
        : "Facturación mensual",
      features: professionalFeatures,
      action: <ButtonLink href="/register" className="py-4 text-[#fbea71] hover:bg-[#010000] hover:text-[#fbea71] focus-visible:outline-[#010000]">Empezar</ButtonLink>,
    },
    {
      label: "Acompañamiento",
      tone: "outline",
      price: "A consultar",
      secondary: "Plan Profesional incluido",
      features: accompanimentFeatures,
      action: <ButtonLink href="#contacto" className="bg-[#d8e4d6] py-4 text-[#010000] hover:bg-[#d8e4d6] hover:text-[#010000] focus-visible:outline-[#fbea71]!">Hablemos</ButtonLink>,
    },
  ];

  return (
    <section id="precios" aria-labelledby="pricing-title" className="mt-15 bg-[#010000] py-16 text-[#d8e4d6] lg:py-25">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle id="pricing-title" className="text-[clamp(2rem,3.8889vw,3.5rem)] leading-[1.02] text-[#d8e4d6]">
            Hazlo tú, o déjalo en nuestras manos.
          </SectionTitle>
          <BillingToggle value={value} onChange={onChange} />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {cards.map((card) => <PricingCard key={card.label} {...card} />)}
        </div>
        <p id="pricing-tax-note" className="font-['Geist_Mono',monospace] text-[13px]">*Impuestos no incluidos</p>
        <SavingsCalculator />
      </Container>
    </section>
  );
};

export const PricingSection = () => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return <PricingSectionView value={period} onChange={setPeriod} />;
};
