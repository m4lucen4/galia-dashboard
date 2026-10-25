import faqSource from "@/features/newWeb/data/faqs.json?raw";
import { parseFaqs } from "@/features/newWeb/components/faq/faqs";
import { AccordionItem } from "@/features/newWeb/components/ui/AccordionItem";
import { Container } from "@/features/newWeb/components/ui/Container";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";

const faqs = parseFaqs(faqSource);

export const FaqSection = () => (
  <section id="faq" aria-labelledby="faq-title" className="bg-[#d8e4d6] py-16 text-[#010000] lg:py-25">
    <Container className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-6">
      <SectionTitle id="faq-title" className="text-[clamp(2rem,3.6111vw,3.25rem)] leading-[1.02] lg:col-span-4">
        Lo que nos preguntan los estudios.
      </SectionTitle>
      <div className="flex min-w-0 flex-col gap-2.5 lg:col-span-7 lg:col-start-6">
        {faqs.map(({ question, answer }, index) => (
          <AccordionItem
            key={`${index}-${question}`}
            question={question}
            answer={answer}
            name="landing-faq"
            open={index === 0}
          />
        ))}
      </div>
    </Container>
  </section>
);
