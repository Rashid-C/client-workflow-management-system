import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  FileClock,
  FileText,
  GitBranch,
  Users,
} from "lucide-react";
import Link from "@/components/i18n/link";
import MobileNavigation from "@/components/marketing/mobile-navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

const content = {
  en: {
    title: "Client workflow management",
    description:
      "Keep client records, engagement workflows, document expiry, team assignments and time history connected in one workspace.",
    navFeatures: "Features",
    navWorkflow: "How work moves",
    navTeam: "For your team",
    signIn: "Sign in",
    openWorkspace: "Open workspace",
    eyebrow: "CLIENT WORK, CLEARLY COORDINATED",
    heading: "Every client engagement, moving in step.",
    intro:
      "Tickwise brings client records, documents, work stages and team progress into one clear view—so the next step never gets lost.",
    seeHow: "See how it works",
    previewLabel: "A connected client workflow",
    previewTitle: "From client record to completed work",
    previewNote: "One shared view for the whole team",
    steps: [
      ["Client records", "Keep the relationship and its details in view."],
      ["Documents & expiry", "See important files and dates together."],
      ["Engagement stages", "Move work forward with clear ownership."],
      ["Time & activity", "Keep progress and its history connected."],
    ],
    workflowEyebrow: "A CLEARER WAY TO WORK",
    workflowHeading: "The details around the work belong together.",
    workflowIntro:
      "Client services involve more than a task list. Tickwise connects the records, hand-offs and follow-through that keep an engagement moving.",
    features: [
      {
        title: "Know the client context",
        text: "Keep client details and document expiry visible alongside the work they relate to.",
        icon: BriefcaseBusiness,
      },
      {
        title: "Make every hand-off clear",
        text: "Organize engagements into ordered stages, assign responsibility and see what is waiting or blocked.",
        icon: GitBranch,
      },
      {
        title: "See how work is progressing",
        text: "Bring daily updates, time logs and activity history together for employees and managers.",
        icon: Activity,
      },
    ],
    operationsEyebrow: "BUILT AROUND YOUR OPERATIONS",
    operationsHeading: "A practical view for every working day.",
    operationsText:
      "Employees can focus on their assigned work. Managers can monitor workload, overdue work and team progress—without losing the underlying detail.",
    capabilities: [
      ["My work", "Assigned stages and what needs attention"],
      ["Daily updates", "A clear record of progress from the team"],
      ["Time logs", "Time recorded against the work itself"],
      ["Activity history", "An accountable trail of important changes"],
    ],
    closingHeading: "Bring the day's client work into focus.",
    closingText:
      "Sign in to see your assigned work, client engagements and team activity in Tickwise.",
    closingAction: "Sign in to Tickwise",
    footerText: "Client work, clearly coordinated.",
    copyright: "All rights reserved.",
    languageName: "العربية",
    languagePath: "/ar",
  },
  ar: {
    title: "إدارة سير عمل العملاء",
    description:
      "اربط سجلات العملاء وسير العمل والمستندات وتوزيع المهام وسجل الوقت في مساحة عمل واحدة.",
    navFeatures: "المزايا",
    navWorkflow: "آلية العمل",
    navTeam: "لفريقك",
    signIn: "تسجيل الدخول",
    openWorkspace: "افتح مساحة العمل",
    eyebrow: "عملاء أوضح، وعمل أكثر تنسيقًا",
    heading: "كل ارتباط عميل، بخطوات مترابطة.",
    intro:
      "يجمع Tickwise سجلات العملاء والمستندات ومراحل العمل وتقدم الفريق في عرض واضح واحد، حتى لا تضيع الخطوة التالية.",
    seeHow: "تعرّف على آلية العمل",
    previewLabel: "سير عمل مترابط للعميل",
    previewTitle: "من سجل العميل إلى إنجاز العمل",
    previewNote: "عرض مشترك للفريق بأكمله",
    steps: [
      ["سجلات العملاء", "تابع العلاقة وتفاصيلها في مكان واحد."],
      ["المستندات والانتهاء", "اجمع الملفات المهمة ومواعيد انتهائها."],
      ["مراحل الارتباط", "قدّم العمل مع وضوح المسؤوليات."],
      ["الوقت والنشاط", "اربط التقدم بسجله التاريخي."],
    ],
    workflowEyebrow: "طريقة عمل أوضح",
    workflowHeading: "تفاصيل العمل المترابطة في مكان واحد.",
    workflowIntro:
      "خدمات العملاء أكثر من مجرد قائمة مهام. يربط Tickwise السجلات وتسليم المهام والمتابعة التي تحافظ على تقدم العمل.",
    features: [
      {
        title: "اعرف سياق العميل",
        text: "تابع تفاصيل العميل وانتهاء المستندات إلى جانب العمل المرتبط بها.",
        icon: BriefcaseBusiness,
      },
      {
        title: "اجعل تسليم العمل واضحًا",
        text: "نظّم الارتباطات في مراحل مرتبة، وحدد المسؤوليات، وتابع العمل المنتظر أو المتعطل.",
        icon: GitBranch,
      },
      {
        title: "تابع تقدم العمل",
        text: "اجمع التحديثات اليومية وسجلات الوقت وسجل النشاط للموظفين والمديرين.",
        icon: Activity,
      },
    ],
    operationsEyebrow: "مصمم لعمليات فريقك",
    operationsHeading: "عرض عملي لكل يوم عمل.",
    operationsText:
      "يركز الموظفون على المهام المسندة إليهم، ويتابع المديرون أعباء العمل والمهام المتأخرة وتقدم الفريق مع الحفاظ على التفاصيل.",
    capabilities: [
      ["مهامي", "المراحل المسندة وما يحتاج إلى متابعة"],
      ["التحديثات اليومية", "سجل واضح لتقدم الفريق"],
      ["سجلات الوقت", "الوقت المسجل على العمل نفسه"],
      ["سجل النشاط", "تاريخ موثوق للتغييرات المهمة"],
    ],
    closingHeading: "اجعل عمل العملاء اليومي أكثر وضوحًا.",
    closingText:
      "سجّل الدخول لمتابعة مهامك وارتباطات العملاء ونشاط الفريق في Tickwise.",
    closingAction: "تسجيل الدخول إلى Tickwise",
    footerText: "عملاء أوضح، وعمل أكثر تنسيقًا.",
    copyright: "جميع الحقوق محفوظة.",
    languageName: "English",
    languagePath: "/en",
  },
} as const;

function copyFor(locale: string) {
  return content[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = copyFor(lang);
  return {
    title: { absolute: `${copy.title} | Tickwise` },
    description: copy.description,
  };
}

export default async function MarketingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const copy = copyFor(locale);
  const isArabic = locale === "ar";
  const featureIcons = [FileClock, GitBranch, Clock3, FileText] as const;

  return (
    <main className="min-h-screen bg-white text-[#111318]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            href="/"
            aria-label="Tickwise home"
            className="shrink-0 text-[25px] font-semibold tracking-[-0.06em]"
            dir="ltr"
          >
            tickwise<span className="text-blue-600">.</span>
          </Link>

          <nav aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"} className="hidden items-center gap-8 md:flex">
            <a className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="#features">{copy.navFeatures}</a>
            <a className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="#workflow">{copy.navWorkflow}</a>
            <a className="text-sm font-medium text-slate-600 transition hover:text-slate-950" href="#team">{copy.navTeam}</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href="/login"
              className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            >
              {copy.signIn}
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#17191e] px-4 text-sm font-medium text-white transition hover:bg-[#30343c]"
            >
              <span className="hidden sm:inline">{copy.openWorkspace}</span>
              <span className="sm:hidden">{copy.signIn}</span>
            </Link>
            <MobileNavigation
              features={copy.navFeatures}
              workflow={copy.navWorkflow}
              team={copy.navTeam}
              languageName={copy.languageName}
              languagePath={copy.languagePath}
              language={locale}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] border-x border-slate-100">
        <section className="relative overflow-hidden px-5 pb-16 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28 lg:pt-32">
          <div className="mx-auto max-w-4xl">
            <p className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 sm:text-sm">
              {copy.eyebrow}
            </p>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[76px]">
              {copy.heading}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-xl sm:leading-8">
              {copy.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#17191e] px-5 text-sm font-medium text-white transition hover:bg-[#30343c]"
              >
                {copy.openWorkspace}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {copy.seeHow}
              </a>
            </div>
          </div>

          <div className="marketing-grid pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-20 opacity-60" aria-hidden="true" />
          <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-start shadow-[0_28px_90px_-48px_rgba(15,23,42,0.3)] sm:mt-20">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <BriefcaseBusiness size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{copy.previewTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{copy.previewLabel}</p>
                </div>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {copy.previewNote}
              </span>
            </div>

            <div className="bg-[#fafbfc] p-4 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {copy.steps.map(([title, detail], index) => {
                  const Icon = featureIcons[index];
                  return (
                    <div
                      className="flex min-h-[100px] items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
                      key={title}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
                        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{title}</p>
                        <p className="mt-1.5 text-sm leading-5 text-slate-500">{detail}</p>
                      </div>
                      <span className="ms-auto hidden text-xs tabular-nums text-slate-400 sm:block">
                        0{index + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 border-t border-slate-200 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.workflowEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{copy.workflowHeading}</h2>
              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{copy.workflowIntro}</p>
            </div>
            <div id="features" className="mt-12 grid scroll-mt-24 gap-4 md:grid-cols-3">
              {copy.features.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="scroll-mt-20 border-t border-slate-200 bg-[#fafbfc] px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.operationsEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{copy.operationsHeading}</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">{copy.operationsText}</p>
              <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-blue-700">
                {copy.signIn}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {copy.capabilities.map(([title, detail], index) => {
                const icons = [CalendarDays, Users, Clock3, FileText] as const;
                const Icon = icons[index];
                return (
                  <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
                    <Icon size={19} strokeWidth={1.8} className="text-slate-600" aria-hidden="true" />
                    <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-5 text-slate-500">{detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[#111318] px-5 py-20 text-center text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Tickwise</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{copy.closingHeading}</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-300">{copy.closingText}</p>
            <Link
              href="/login"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              {copy.closingAction}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <footer className="bg-[#111318] text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="text-xl font-semibold tracking-[-0.06em] text-white" dir="ltr">
            tickwise<span className="text-blue-400">.</span>
          </Link>
          <p className="text-sm">{copy.footerText}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
            <Link href="/login" className="transition hover:text-white">{copy.signIn}</Link>
            <Link href={copy.languagePath} className="transition hover:text-white">{copy.languageName}</Link>
            <span>© 2026 Tickwise. {copy.copyright}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
