import Link from "next/link"
import { ArrowRight, BookOpen, Target, BarChart3, GraduationCap, Building2 } from "lucide-react"
import { HeroQuiz } from "@/components/homepage/HeroQuiz"
import { StatsCountUp } from "@/components/homepage/StatsCountUp"
import type { PublicStats } from "@/lib/public-stats"

export function Homepage({ stats }: { stats: PublicStats }) {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* NAV */}
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="bg-gradient-to-r from-primary via-sky-400 to-blue-500 bg-clip-text text-2xl font-extrabold leading-none tracking-tight text-transparent sm:text-3xl"
          >
            QuizHub
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted sm:px-4"
            >
              Conectare
            </Link>
            <Link
              href="/login?tab=signup"
              className="btn-primary rounded-lg px-4 py-2 text-sm sm:px-5"
            >
              Creează cont
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Examene reale.
              <br />
              <span className="text-gradient">Pregătire reală.</span>
            </h1>
            <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
              Simulări identice cu examenele oficiale și mod practică nelimitat.
              De la autorizări profesionale la admitere universitară, te pregătești
              într-un singur loc.
            </p>
          </div>

          {/* Interactive mini quiz */}
          <div className="lg:pl-8">
            <HeroQuiz />
          </div>
        </div>
      </section>

      {/* LIVE STATS */}
      <section className="border-y border-border/40 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="mb-6 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-center">
            QuizHub în cifre
          </p>
          <StatsCountUp stats={stats} />
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-12 text-left sm:text-center">
          <p className="section-label mb-3">Ce primești</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tot ce-ți trebuie ca să dai examen
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={Target}
            title="Simulare Examen"
            description="Cronometru, prag de trecere, întrebări random din pool — exact ca la examenul real."
            color="blue"
          />
          <FeatureCard
            icon={BookOpen}
            title="Mod Practică"
            description="Antrenament liber cu feedback instant. Vezi imediat ce ai greșit și de ce."
            color="emerald"
          />
          <FeatureCard
            icon={BarChart3}
            title="Statistici Detaliate"
            description="Nivel de pregătire, evoluție pe simulări, întrebări cu probleme. Știi exact unde stai."
            color="amber"
          />
        </div>
      </section>

      {/* AUDIENCE */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="mb-12 text-left sm:text-center">
          <p className="section-label mb-3">Pentru cine</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            QuizHub e pentru toți
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mx-auto">
            Fiecare organizație are propriile examene și cursanți. Tu primești acces la
            ce îți acordă organizația ta.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <AudienceCard
            icon={GraduationCap}
            title="Cursanți & Studenți"
            bullets={[
              "Vezi imediat unde greșești cu Mod Practică",
              "Cronometru și prag de trecere ca la examenul real",
              "Statistici personale și confetti la promovare 🎉",
            ]}
          />
          <AudienceCard
            icon={Building2}
            title="Școli & Organizații"
            bullets={[
              "Organizație separată cu cursanții tăi",
              "Tu adaugi examenele, tu controlezi accesul",
              "Statistici pe fiecare elev și examen",
            ]}
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border/40 bg-gradient-to-b from-blue-500/5 to-transparent">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Începe să înveți astăzi
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Cont gratuit. Fără card. Începi pregătirea în câteva click-uri.
          </p>
          <Link
            href="/login?tab=signup"
            className="btn-primary mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base"
          >
            Creează cont gratuit
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} QuizHub — toate drepturile rezervate
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <Link href="/login" className="transition hover:text-foreground">Conectare</Link>
            <span>·</span>
            <Link href="/docs" className="transition hover:text-foreground">Documentație</Link>
            <span>·</span>
            <Link href="/legal/confidentialitate" className="transition hover:text-foreground">Politică de confidențialitate</Link>
            <span>·</span>
            <Link href="/legal/termeni" className="transition hover:text-foreground">Termeni și condiții</Link>
            <span>·</span>
            <Link href="/legal/cookies" className="transition hover:text-foreground">Politica de cookie-uri</Link>
            <span>·</span>
            <a href="mailto:contact@quizhub.ro" className="transition hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, color }: {
  icon: any, title: string, description: string, color: "blue" | "emerald" | "amber"
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }
  return (
    <div className="card-surface flex flex-col gap-4 p-6 transition-all hover:-translate-y-1">
      <div className={`inline-flex size-12 items-center justify-center rounded-xl ${colorMap[color]}`}>
        <Icon className="size-6" />
      </div>
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function AudienceCard({ icon: Icon, title, bullets }: {
  icon: any, title: string, bullets: string[]
}) {
  return (
    <div className="card-surface flex flex-col gap-4 p-8">
      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <Icon className="size-7" />
      </div>
      <h3 className="text-2xl font-bold text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
