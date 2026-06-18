import Link from "next/link"
import {
  BookOpen, Target, BarChart3, Building2,
  FileSpreadsheet, FileJson, AlignLeft, ArrowLeft,
  CheckCircle2, Clock, HelpCircle
} from "lucide-react"
import { DocsThemeToggle } from "@/components/docs/DocsThemeToggle"
import { CopyPromptBlock } from "@/components/docs/CopyPromptBlock"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Documentație — QuizHub",
  description: "Ghid complet pentru utilizarea platformei QuizHub",
}

const JSON_PROMPT = `Transformă întrebările din documentul atașat în format JSON pentru platforma QuizHub.

Reguli stricte:
- Returnează DOAR JSON valid, fără text înainte sau după, fără blocuri markdown.
- Structura: un obiect cu un câmp "questions" care e un array.
- Fiecare întrebare are: "question" (textul întrebării, string), "answers" (array de string-uri, între 2 și 10 variante), "correct" (array de numere).
- IMPORTANT: indicii din "correct" sunt 1-based. Primul răspuns = 1, al doilea = 2, etc. (NU 0-based).
- Pentru o singură variantă corectă: "correct": [2]. Pentru mai multe: "correct": [1, 3].
- Nu inventa întrebări. Folosește doar ce e în document.
- Dacă o întrebare nu are răspunsul marcat, alege varianta corectă pe baza cunoștințelor tale.

Exemplu de format:
{
  "questions": [
    {
      "question": "Care este tensiunea nominală?",
      "answers": ["220V", "110V", "380V"],
      "correct": [1]
    }
  ]
}

Documentul cu întrebări este atașat mai jos.`

const EXCEL_PROMPT = `Transformă întrebările din documentul atașat într-un tabel pentru un fișier Excel (.xlsx) compatibil cu platforma QuizHub.

Reguli stricte:
- Coloana A = textul întrebării.
- Coloanele B, C, D, ... = variantele de răspuns (între 2 și 10 variante).
- Un rând = o singură întrebare.
- Marchează celula cu răspunsul corect colorând fundalul ei cu GALBEN.
- Dacă o întrebare are mai multe răspunsuri corecte, colorează toate celulele corecte cu galben.
- Nu inventa întrebări. Folosește doar ce e în document.
- Dacă o întrebare nu are răspunsul marcat, alege varianta corectă pe baza cunoștințelor tale și colorează-o galben.

Generează un tabel pe care îl pot copia direct într-un fișier Excel, indicând clar care celule trebuie colorate galben.

Documentul cu întrebări este atașat mai jos.`

// Aliniat la parserul real din parsePlainTextToQuestions (components/admin/ExamManagement.tsx):
// întrebările trebuie numerotate ("1." / "1)"), variantele prefixate cu literă ("a)" / "a."),
// iar răspunsul corect marcat cu "*" la finalul rândului acelei variante.
const TEXT_PROMPT = `Transformă întrebările din documentul atașat în format text simplu pentru platforma QuizHub.

Reguli stricte:
- Numerotează fiecare întrebare: începe rândul cu numărul întrebării urmat de punct (ex: "1.").
- Sub întrebare, listează fiecare variantă de răspuns pe câte un rând, prefixată cu o literă urmată de paranteză (ex: "a)", "b)", "c)").
- Marchează răspunsul corect punând un asterisc (*) la finalul rândului acelei variante.
- Lasă un rând gol între întrebări.
- Pentru mai multe răspunsuri corecte, pune asterisc la finalul fiecărei variante corecte.
- Nu inventa întrebări. Folosește doar ce e în document.
- Dacă o întrebare nu are răspunsul marcat, alege varianta corectă pe baza cunoștințelor tale.

Exemplu de format:
1. Care este tensiunea nominală?
a) 220V *
b) 110V
c) 380V

2. Curentul alternativ are frecvența de:
a) 50 Hz
b) 60 Hz *
c) 100 Hz

Documentul cu întrebări este atașat mai jos.`

const sections = [
  { id: "getting-started", label: "Primii pași" },
  { id: "quiz-modes", label: "Moduri quiz" },
  { id: "statistics", label: "Statistici" },
  { id: "organizations", label: "Organizații" },
  { id: "import-excel", label: "Import Excel" },
  { id: "import-json", label: "Import JSON" },
  { id: "import-text", label: "Import Text" },
]

export default async function DocsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Left: back to home */}
          <div className="flex flex-1 items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Acasă
            </Link>
          </div>

          {/* Center: QuizHub wordmark, large + centered */}
          <div className="flex flex-1 items-center justify-center">
            <Link
              href="/docs"
              className="bg-gradient-to-r from-primary via-sky-400 to-blue-500 bg-clip-text text-2xl font-extrabold leading-none tracking-tight text-transparent"
            >
              QuizHub
            </Link>
          </div>

          {/* Right: theme toggle + login */}
          <div className="flex flex-1 items-center justify-end gap-3">
            <DocsThemeToggle />
            {isLoggedIn ? (
              <Link
                href="/"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 sm:px-4"
              >
                Aplicație
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-500 sm:px-4"
              >
                Conectare
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:flex lg:gap-12">
        {/* Sidebar nav */}
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <nav className="sticky top-24 flex flex-col gap-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cuprins
            </p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 space-y-16">

          {/* Getting Started */}
          <section id="getting-started" className="scroll-mt-24">
            <DocSectionHeader icon={BookOpen} title="Primii pași" color="blue" />
            <div className="prose-sm mt-6 space-y-4 text-muted-foreground">
              <p>QuizHub e o platformă de pregătire pentru examene. Funcționează pe baza de <strong className="text-foreground">organizații</strong> — fiecare organizație are propriile examene și cursanți.</p>
              <DocStep number={1} title="Creează cont">
                Accesează <Link href="/login?tab=signup" className="text-blue-600 hover:underline dark:text-blue-400">quizhub.ro</Link> și creează un cont gratuit cu email și parolă.
              </DocStep>
              <DocStep number={2} title="Primești acces">
                Un admin din organizația ta îți acordă acces la examene. Vei vedea examenele disponibile în meniul principal.
              </DocStep>
              <DocStep number={3} title="Alegi modul și începi">
                Din pagina principală alegi examenul și modul (Simulare sau Practică), apoi pornești.
              </DocStep>
            </div>
          </section>

          {/* Quiz Modes */}
          <section id="quiz-modes" className="scroll-mt-24">
            <DocSectionHeader icon={Target} title="Moduri quiz" color="indigo" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <DocCard
                title="Simulare Examen"
                icon={Clock}
                items={[
                  "Cronometru activ (implicit 30 min)",
                  "Număr fix de întrebări random din pool",
                  "Nu vezi răspunsul corect în timpul testului",
                  "La final: scor, dacă ai trecut sau nu",
                  "Statisticile se actualizează automat",
                ]}
              />
              <DocCard
                title="Mod Practică"
                icon={CheckCircle2}
                items={[
                  "Fără cronometru",
                  "Tu alegi câte întrebări vrei",
                  "Feedback instant după fiecare răspuns",
                  "Poți filtra: toate / salvate / greșite anterior",
                  "Streak counter pentru răspunsuri consecutive corecte",
                ]}
              />
            </div>
          </section>

          {/* Statistics */}
          <section id="statistics" className="scroll-mt-24">
            <DocSectionHeader icon={BarChart3} title="Statistici" color="emerald" />
            <div className="mt-6 space-y-4">
              <DocDefinition term="Nivel de pregătire (%)">
                Procentul din pool-ul total la care ultimul tău răspuns a fost corect. Dacă
                răspunzi greșit la o întrebare pe care o știai, procentul scade — reflectă
                nivelul tău actual de cunoaștere, nu tot ce ai știut vreodată.
              </DocDefinition>
              <DocDefinition term="Rată de trecere (%)">
                Procentul simulărilor finalizate în care ai atins pragul de trecere.
              </DocDefinition>
              <DocDefinition term="Evoluție scor simulări">
                Graficul ultimelor simulări cu linia de prag. Poți vedea dacă ești în progres sau regres.
              </DocDefinition>
              <DocDefinition term="Întrebări cu probleme">
                Întrebările la care ai răspuns greșit în simulări sau practică.
                Le poți exersa separat în Mod Practică → Sursă: Greșite anterior.
              </DocDefinition>
              <DocDefinition term="Timp dedicat">
                Suma timpului din toate sesiunile de simulare + practică pentru acel examen.
              </DocDefinition>
            </div>
          </section>

          {/* Organizations */}
          <section id="organizations" className="scroll-mt-24">
            <DocSectionHeader icon={Building2} title="Organizații" color="violet" />
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <p>Fiecare organizație e un spațiu separat cu propriii utilizatori și examene. Un utilizator poate aparține unei singure organizații.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <RoleCard role="Admin Organizație" description="Gestionează organizația sa: adaugă examene, acordă acces utilizatorilor, vede statistici." />
                <RoleCard role="Utilizator" description="Accesează examenele la care i s-a acordat acces. Vede propriile statistici." />
              </div>
            </div>
          </section>

          {/* Import Excel */}
          <section id="import-excel" className="scroll-mt-24">
            <DocSectionHeader icon={FileSpreadsheet} title="Import Excel (.xlsx)" color="green" />
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <p>Cel mai simplu mod de a adăuga întrebări în masă. Structura fișierului:</p>
              <DocTable
                headers={["Coloana", "Conținut", "Observații"]}
                rows={[
                  ["A", "Textul întrebării", "Obligatoriu. Rândurile fără text sunt ignorate."],
                  ["B, C, D...", "Variantele de răspuns", "Minim 2, maxim 10 variante."],
                  ["—", "Răspunsuri corecte", "Celulele corecte se marchează cu fundal galben în Excel."],
                ]}
              />
              <DocNote>
                Duplicatele sunt detectate automat — aceeași întrebare nu va fi adăugată de două ori,
                chiar dacă importezi același fișier de mai multe ori.
              </DocNote>
              <CopyPromptBlock prompt={EXCEL_PROMPT} />
            </div>
          </section>

          {/* Import JSON */}
          <section id="import-json" className="scroll-mt-24">
            <DocSectionHeader icon={FileJson} title="Import JSON" color="amber" />
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <p>Poți lipi direct sau încărca un fișier <code className="rounded bg-muted px-1">.json</code> cu structura de mai jos:</p>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed">{`{
  "questions": [
    {
      "question": "Care este tensiunea nominală?",
      "answers": ["220V", "110V", "380V"],
      "correct": [1]
    },
    {
      "question": "Curentul alternativ are frecvența de:",
      "answers": ["50 Hz", "60 Hz", "100 Hz"],
      "correct": [1]
    }
  ]
}`}</pre>
              <DocTable
                headers={["Câmp", "Tip", "Descriere"]}
                rows={[
                  ["question", "string", "Textul întrebării"],
                  ["answers", "string[]", "Array cu 2–10 variante de răspuns"],
                  ["correct", "number[]", "Indecși 1-bazați ai răspunsurilor corecte. Ex: [1] = primul răspuns"],
                ]}
              />
              <DocNote>
                Pentru răspunsuri multiple: <code className="rounded bg-muted px-1">{`"correct": [1, 3]`}</code> marchează primul și al treilea răspuns ca corecte.
              </DocNote>
              <CopyPromptBlock prompt={JSON_PROMPT} />
            </div>
          </section>

          {/* Import Text */}
          <section id="import-text" className="scroll-mt-24">
            <DocSectionHeader icon={AlignLeft} title="Import Text simplu" color="rose" />
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <p>Cel mai accesibil format — lipești întrebările direct ca text, fără formatare specială.</p>
              <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-4 font-mono text-xs leading-relaxed">{`1. Care este tensiunea nominală?
a) 220V *
b) 110V
c) 380V

2. Curentul alternativ are frecvența de:
a) 50 Hz *
b) 60 Hz
c) 100 Hz`}</pre>
              <DocTable
                headers={["Element", "Format", "Observații"]}
                rows={[
                  ["Întrebare", "1. sau 1)", "Număr urmat de punct sau paranteză"],
                  ["Variantă", "a) sau a.", "Literă urmată de punct sau paranteză"],
                  ["Răspuns corect", "* sau ✓ la final", "Adaugă după textul variantei corecte"],
                ]}
              />
              <CopyPromptBlock prompt={TEXT_PROMPT} />
            </div>
          </section>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} QuizHub ·{" "}
          <Link href="/" className="transition hover:text-foreground">Acasă</Link>
          {" · "}
          <Link href="/legal/confidentialitate" className="transition hover:text-foreground">Confidențialitate</Link>
          {" · "}
          <Link href="/legal/termeni" className="transition hover:text-foreground">Termeni</Link>
          {" · "}
          <Link href="/legal/cookies" className="transition hover:text-foreground">Cookie-uri</Link>
          {" · "}
          <a href="mailto:contact@quizhub.ro" className="transition hover:text-foreground">Contact</a>
        </div>
      </footer>
    </div>
  )
}

// ── Helper sub-components ──────────────────────────────────────────────────

function DocSectionHeader({
  icon: Icon, title, color,
}: { icon: any; title: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  }
  return (
    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
      <div className={`flex size-10 items-center justify-center rounded-xl ${colorMap[color] ?? colorMap.blue}`}>
        <Icon className="size-5" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
  )
}

function DocStep({ number, title, children }: {
  number: number; title: string; children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-600 dark:text-blue-400">
        {number}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1">{children}</p>
      </div>
    </div>
  )
}

function DocCard({ title, icon: Icon, items }: {
  title: string; icon: any; items: string[]
}) {
  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DocDefinition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <dt className="font-semibold text-foreground">{term}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  )
}

function RoleCard({ role, description }: { role: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4">
      <p className="font-semibold text-foreground">{role}</p>
      <p className="mt-1 text-xs">{description}</p>
    </div>
  )
}

function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-muted-foreground">
                  {j === 0 ? (
                    <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">{cell}</code>
                  ) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200/60 bg-blue-50/50 p-4 text-sm dark:border-blue-800/30 dark:bg-blue-500/5">
      <HelpCircle className="mt-0.5 size-4 shrink-0 text-blue-500" />
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}
