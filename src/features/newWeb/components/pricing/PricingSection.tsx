import { useState } from "react";
import type { BillingPeriod } from "@/types";
import { SUBSCRIPTION_PRICES, formatMoney } from "@/helpers/subscriptionPricing";
import { Container } from "@/features/newWeb/components/ui/Container";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";
import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { PricingCard, type PricingCardProps } from "@/features/newWeb/components/ui/PricingCard";
import { BillingToggle, type BillingToggleProps } from "./BillingToggle";

const professionalFeatures = [
  "Publicaciones ilimitadas",
  "Instagram y LinkedIn",
  "Prompt personalizado con tu tono",
];
const SOCIAL_MANAGEMENT_MONTHLY_PRICE = 19900;

const socialManagementFeatures = [
  "Hasta 10 publicaciones al mes por cada red social (Instagram y LinkedIn)",
  "Nos envías el material; lo organizamos y subimos",
  "Te proponemos el calendario",
  "Constructor web incluido",
  "Fotografía e identidad, si lo necesitas",
];

export const PricingSectionView = ({ value, onChange }: BillingToggleProps) => {
  const annual = value === "annual";
  const monthlyEquivalent = annual ? SUBSCRIPTION_PRICES.annual / 12 : SUBSCRIPTION_PRICES.monthly;
  const socialManagementMonthlyEquivalent = SOCIAL_MANAGEMENT_MONTHLY_PRICE * (annual ? 0.8 : 1);
  const cards: PricingCardProps[] = [
    {
      label: "Profesional",
      tone: "yellow",
      price: <><span aria-describedby="pricing-tax-note">{formatMoney(monthlyEquivalent)}*</span><span className="ml-1.5 inline-block text-base tracking-normal">/mes{annual ? " equivalente" : ""}</span></>,
      secondary: annual
        ? <span aria-describedby="pricing-tax-note">{formatMoney(SUBSCRIPTION_PRICES.annual)}* al año · Facturación anual</span>
        : "Facturación mensual",
      features: professionalFeatures,
      addon: (
        <div className="mt-2 flex min-w-0 flex-col items-start gap-3 border-t-[1.5px] border-[#010000]/25 pt-5">
          <h4 className="text-lg font-medium">Añade tu web de estudio</h4>
          <p className="font-['Geist_Mono',monospace] text-xl">
            <span aria-describedby="pricing-tax-note">+{formatMoney(monthlyEquivalent)}*</span>
            <span className="ml-1.5 text-sm">/mes{annual ? " equivalente" : ""}</span>
          </p>
          <p className="font-['Geist_Mono',monospace] text-[13px]">
            {annual
              ? <><span aria-describedby="pricing-tax-note">{formatMoney(SUBSCRIPTION_PRICES.annual)}* al año</span> · Facturación anual</>
              : "Facturación mensual"}
            {" · Opcional, se añade a tu plan"}
          </p>
          <a
            href="#tu-web"
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-[3px] focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-4"
          >
            Descubre el constructor
          </a>
        </div>
      ),
      action: <ButtonLink href="/register" className="py-4 text-[#fbea71] hover:bg-[#010000] hover:text-[#fbea71] focus-visible:outline-[#010000]">Empezar</ButtonLink>,
    },
    {
      label: "Gestión de redes sociales",
      tone: "outline",
      price: <><span aria-describedby="pricing-tax-note">{formatMoney(socialManagementMonthlyEquivalent)}*</span><span className="ml-1.5 inline-block text-base tracking-normal">/mes{annual ? " equivalente" : ""}</span></>,
      secondary: `Plan Profesional incluido · Facturación ${annual ? "anual" : "mensual"}`,
      features: socialManagementFeatures,
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
      </Container>
    </section>
  );
};

export const PricingSection = () => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return <PricingSectionView value={period} onChange={setPeriod} />;
};
