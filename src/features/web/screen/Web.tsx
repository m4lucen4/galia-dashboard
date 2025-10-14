import NavbarWeb from "../../../components/shared/ui/NavbarWeb";
import WhatsAppButton from "../components/WhatsAppButton";
import Collaborators from "../components/Collaborators";
import Contact from "../components/Contact";
import Faqs from "../components/Faqs";
import Features from "../components/Features";
import Hero from "../components/Hero";
import HowWorks from "../components/HowWorks";
import Membership from "../components/Membership";

export const Web = () => {
  return (
    <div>
      <NavbarWeb />
      <div className="pt-16">
        <Hero />
        <div id="caracteristicas">
          <Features />
        </div>
        <HowWorks />
        <div id="faq">
          <Faqs />
        </div>
        <Collaborators />
        <div id="precios">
          <Membership />
        </div>
        <div id="contacto">
          <Contact />
        </div>
      </div>
      <WhatsAppButton />
    </div>
  );
};
