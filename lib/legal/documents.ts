export type LegalSlug = "confidentialitate" | "termeni" | "cookies";

export interface LegalDocumentMeta {
  slug: LegalSlug;
  title: string;        // Romanian
  version: string;      // e.g. "1.0" — used later by consent system
  lastUpdated: string;  // ISO date "YYYY-MM-DD"
  description: string;  // for <meta> SEO
}

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocumentMeta> = {
  confidentialitate: {
    slug: "confidentialitate",
    title: "Politică de confidențialitate",
    version: "1.0",
    lastUpdated: "2026-06-18",
    description: "Cum colectăm, folosim și protejăm datele tale personale pe QuizHub.",
  },
  termeni: {
    slug: "termeni",
    title: "Termeni și condiții",
    version: "1.0",
    lastUpdated: "2026-06-18",
    description: "Termenii care guvernează utilizarea platformei QuizHub.",
  },
  cookies: {
    slug: "cookies",
    title: "Politica de cookie-uri",
    version: "1.0",
    lastUpdated: "2026-06-18",
    description: "Ce cookie-uri și tehnologii de analiză folosim pe QuizHub.",
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS) as LegalSlug[];
