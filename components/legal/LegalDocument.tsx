import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LegalDocumentMeta } from "@/lib/legal/documents";

interface LegalDocumentProps {
  meta: LegalDocumentMeta;
  content: string;
}

export function LegalDocument({ meta, content }: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi la pagina principală
      </Link>
      <header className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {meta.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versiunea {meta.version} · Ultima actualizare:{" "}
          {new Date(meta.lastUpdated).toLocaleDateString("ro-RO", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="text-foreground/90">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="mt-10 mb-4 text-2xl font-bold tracking-tight text-foreground" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="mt-8 mb-3 text-xl font-semibold text-foreground" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="mt-6 mb-2 text-lg font-semibold text-foreground" {...props} />
            ),
            p: ({ node, ...props }) => <p className="my-4 leading-7" {...props} />,
            ul: ({ node, ...props }) => <ul className="my-4 list-disc space-y-2 pl-6" {...props} />,
            ol: ({ node, ...props }) => <ol className="my-4 list-decimal space-y-2 pl-6" {...props} />,
            li: ({ node, ...props }) => <li className="leading-7" {...props} />,
            a: ({ node, ...props }) => (
              <a className="font-medium text-primary underline underline-offset-4" {...props} />
            ),
            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
            hr: ({ node, ...props }) => <hr className="my-8 border-border" {...props} />,
            table: ({ node, ...props }) => (
              <div className="my-6 overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-sm" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th className="border-b border-border bg-muted px-3 py-2 text-left font-semibold" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="border-b border-border px-3 py-2 align-top" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
