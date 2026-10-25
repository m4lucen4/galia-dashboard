export type Faq = {
  question: string;
  answer: string;
};

export const parseFaqs = (source: string): Faq[] => {
  let entries: unknown;
  try {
    entries = JSON.parse(source);
  } catch {
    return [];
  }

  if (!Array.isArray(entries)) return [];

  return entries.filter((entry): entry is Faq => (
    typeof entry === "object" && entry !== null
    && typeof entry.question === "string" && entry.question.trim().length > 0
    && typeof entry.answer === "string" && entry.answer.trim().length > 0
  ));
};
