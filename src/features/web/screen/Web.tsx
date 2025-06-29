import Collaborators from "../components/Collaborators";
import Contact from "../components/Contact";
import Faqs from "../components/Faqs";
import Features from "../components/Features";
import Hero from "../components/Hero";
import HowWorks from "../components/HowWorks";
import Membership from "../components/Membership";
import Team from "../components/Team";

export const Web = () => {
  return (
    <div>
      <Hero />
      <Features />
      <HowWorks />
      <Faqs />
      <Collaborators />
      <Membership />
      <Team />
      <Contact />
    </div>
  );
};
