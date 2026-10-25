import { FaqSection } from "@/features/newWeb/components/faq/FaqSection";
import { ContactSection } from "@/features/newWeb/components/contact/ContactSection";
import { LandingFooter } from "@/features/newWeb/components/LandingFooter";
import { PricingSection } from "@/features/newWeb/components/pricing/PricingSection";
import { CaseStudiesSection } from "@/features/newWeb/components/caseStudies/CaseStudiesSection";
import { TrustSection } from "@/features/newWeb/components/trust/TrustSection";
import { WebsiteBuilderSection } from "@/features/newWeb/components/websiteBuilder/WebsiteBuilderSection";
import { BrandVoiceSection } from "@/features/newWeb/components/brandVoice/BrandVoiceSection";
import { HowItWorksSection } from "@/features/newWeb/components/howItWorks/HowItWorksSection";
import { OutputChannelsSection } from "@/features/newWeb/components/channels/OutputChannelsSection";
import { LandingHeader } from "@/features/newWeb/components/LandingHeader";
import { LandingHero } from "@/features/newWeb/components/hero/LandingHero";
import { useLandingScroll } from "@/features/newWeb/hooks/useLandingScroll";
import "@/features/newWeb/fonts.css";

export const NewWeb = () => {
  useLandingScroll();

  return (
    <div
      className="min-h-svh bg-[#d8e4d6] text-[#010000] font-['Hanken_Grotesk',system-ui,sans-serif] text-base leading-normal [--new-web-gutter:clamp(1.25rem,5.5556vw,5rem)] [&_:where(a,button,summary):focus-visible]:outline-[3px] [&_:where(a,button,summary):focus-visible]:outline-solid [&_:where(a,button,summary):focus-visible]:outline-[#010000] [&_:where(a,button,summary):focus-visible]:outline-offset-4 **:[[id]]:scroll-mt-28"
      id="new-web-top"
    >
      <a className="absolute top-2 left-(--new-web-gutter) z-50 -translate-y-[200%] rounded-[999px] bg-[#010000] px-4 py-3 text-[#d8e4d6] focus:translate-y-0" href="#new-web-content">
        Saltar al contenido
      </a>
      <LandingHeader />
      <main id="new-web-content" tabIndex={-1}>
        <LandingHero />
        <OutputChannelsSection />
        <HowItWorksSection />
        <BrandVoiceSection />
        <WebsiteBuilderSection />
        <TrustSection />
        <CaseStudiesSection />
        <PricingSection />
        <FaqSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
};
