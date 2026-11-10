// Exact editorial template from src/n8n/creacion_publicaciones.json (OpenAI node).
// The leading n8n expression marker is syntax, not part of the model message.
export const N8N_PUBLICATION_TEMPLATE = [
  "Redacta una descripción arquitectónica breve y evocadora de un edificio contemporáneo. Describe cómo se organiza la fachada principal, qué elementos la componen o articulan, y cómo se dan los encuentros volumétricos. Añade observaciones sobre la materialidad, el ritmo compositivo y cualquier gesto que rompa la regularidad (como vuelos, contrapeos o cambios de escala).",
  "",
  "A partir de la siguiente descripción y palabras clave, genera un texto atractivo, creativo y profesional para una publicación.",
  "",
  "Devuélvelo **únicamente** como un **objeto JSON válido** con esta estructura exacta (sin comillas envolventes, sin texto antes o después):",
  "",
  "```json",
  "{",
  "  \"publicacion\": {",
  "    \"texto\": \"...\"",
  "  }",
  "}",
  "",
  "Muy importante:",
  "    •\tUsa un máximo de 75 palabras.",
  "\t•\tNo devuelvas nada fuera del JSON (ni comentarios, ni explicaciones).",
  "\t•\tNo encierres el JSON en comillas.",
  "\t•\tNo uses \\n fuera de comillas.",
  "\t•\tNo escribas nada antes o después del objeto.",
  "",
  "Descripción: {{ $json[\"description\"] }}",
  " ",
  "Palabras clave: {{ $json[\"keywords\"] }}",
  " ",
  "Número de variante: {{ $json[\"variante\"] }}",
  "",
  "El estilo debe ser único en cada variante. El tono debe ser técnico, claro y visualmente sugerente, como en una memoria de proyecto arquitectónico.",
].join("\n");

export function renderPublicationPrompt(description: string, keywords: string, slot: number): string {
  const values: Record<string, string> = { description, keywords, variante: String(slot) };
  // S15 changes only v2's length guidance; retain the original template as provenance.
  // Replace before interpolation so identical wording in source data stays untouched.
  const template = N8N_PUBLICATION_TEMPLATE.replace(
    "Usa un máximo de 75 palabras.",
    "Usa aproximadamente 75 palabras como orientación, no como límite estricto.",
  );
  // One pass: placeholder-looking source text and replacement metacharacters stay literal.
  return template.replace(
    /\{\{ \$json\["(description|keywords|variante)"\] \}\}/gu,
    (_match, key: string) => values[key],
  );
}
