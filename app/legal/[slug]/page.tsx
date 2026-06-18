import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, type LegalSlug } from "@/lib/legal/documents";
import { LegalDocument } from "@/components/legal/LegalDocument";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const meta = LEGAL_DOCUMENTS[slug as LegalSlug];
  if (!meta) return {};
  return { title: `${meta.title} | QuizHub`, description: meta.description };
}

async function getContent(slug: LegalSlug): Promise<string> {
  const filePath = path.join(process.cwd(), "content", "legal", `${slug}.md`);
  return readFile(filePath, "utf-8");
}

export default async function LegalPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const meta = LEGAL_DOCUMENTS[slug as LegalSlug];
  if (!meta) notFound();
  const content = await getContent(slug as LegalSlug);
  return <LegalDocument meta={meta} content={content} />;
}
