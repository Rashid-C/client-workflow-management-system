import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  Factory,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import BrandLogo, { BRAND_NAME } from "@/components/brand/brand-logo";
import Link from "@/components/i18n/link";
import MobileNavigation from "@/components/marketing/mobile-navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import logo from "@/public/brand/alfath-logo.png";

// Facts from the firm's own site (alfathuae.com) and new logo. Its team,
// testimonials and client logos were template placeholders and are left out.
const OFFICE = {
  phones: ["+971 58 584 8008", "+971 55 776 9483"],
  email: "info@alfathuae.com",
  mapsQuery: "Building No. 7.M6, Al Nahyan, Abu Dhabi, UAE",
};

type Service = { title: string; text: string; icon: LucideIcon };

const content = {
  en: {
    metaTitle: "Accounting, Audit & Tax in Abu Dhabi",
    metaDescription:
      "Al Fath Accounts & Tax Solutions: auditing, accounting, VAT, corporate tax, ICV certification and ADNOC vendor registration for businesses in the UAE.",
    nav: { services: "Services", about: "About", contact: "Contact" },
    staffSignIn: "Staff sign in",
    eyebrow: "Accounting · Audit · Tax — Abu Dhabi",
    heading: "Your success. Our commitment.",
    intro:
      "Al Fath Accounts & Tax Solutions supports businesses across the UAE with auditing, accounting, tax compliance and business advisory — from company setup to corporate compliance.",
    contactCta: "Talk to us",
    servicesCta: "Explore services",
    highlights: [
      "UAE VAT and corporate tax",
      "ICV certification and ADNOC vendor registration",
      "An office in Abu Dhabi",
    ],
    servicesEyebrow: "What we do",
    servicesHeading: "Services for every stage of your business.",
    servicesIntro:
      "From keeping your books to preparing for an audit, we take care of the financial and regulatory work so you can focus on running the business.",
    services: [
      {
        title: "Auditing & Assurance",
        text: "Independent audits that bring transparency and trust to your financial reporting.",
        icon: ShieldCheck,
      },
      {
        title: "ICV Certification",
        text: "Support through the In-Country Value programme to strengthen your eligibility for government contracts.",
        icon: BadgeCheck,
      },
      {
        title: "Accounting & Bookkeeping",
        text: "Accurate books, payroll and management reports, kept up to date.",
        icon: BookOpenCheck,
      },
      {
        title: "Corporate Tax",
        text: "Stay on top of your UAE corporate tax obligations and reduce financial risk.",
        icon: Landmark,
      },
      {
        title: "VAT Services",
        text: "VAT registration, return filing and advice.",
        icon: ReceiptText,
      },
      {
        title: "ADNOC Vendor Registration",
        text: "Guidance through vendor registration to open up opportunities in the UAE energy sector.",
        icon: Factory,
      },
    ] satisfies Service[],
    moreHeading: "We also help with",
    more: [
      "Business structuring",
      "Management consultancy",
      "Regulatory compliance",
      "Virtual CFO services",
      "Tax advisory",
      "Company incorporation & winding-up",
    ],
    aboutEyebrow: "About Al Fath",
    aboutHeading: "Built on accuracy, integrity and expertise.",
    mission:
      "We help businesses grow through accurate financial insight, professional tax compliance and strategic advice.",
    vision:
      "Our aim is to be recognised as a leading accounting and tax consultancy, known for integrity.",
    values: [
      ["Accuracy", "Numbers you can make decisions on."],
      ["Integrity", "Transparent advice and honest reporting."],
      ["Expertise", "Practical knowledge of UAE tax and compliance."],
    ],
    contactEyebrow: "Contact",
    contactHeading: "Visit or contact our office.",
    contactText: "Call, email or visit us in Abu Dhabi to discuss what your business needs.",
    address: "Building No. 7.M6, Al Nahyan, Abu Dhabi, UAE",
    addressLabel: "Office",
    phoneLabel: "Phone",
    emailLabel: "Email",
    directions: "Get directions",
    staffHeading: "Al Fath staff",
    staffText: "Sign in to the internal workspace for clients, tasks and time.",
    copyright: "All rights reserved.",
    languageName: "العربية",
    languagePath: "/ar",
  },
  ar: {
    metaTitle: "المحاسبة والتدقيق والضرائب في أبوظبي",
    metaDescription:
      "الفتح لحلول الحسابات والضرائب: التدقيق والمحاسبة وضريبة القيمة المضافة وضريبة الشركات وشهادة القيمة المحلية المضافة والتسجيل كمورد لدى أدنوك للشركات في الإمارات.",
    nav: { services: "الخدمات", about: "من نحن", contact: "تواصل معنا" },
    staffSignIn: "دخول الموظفين",
    eyebrow: "المحاسبة · التدقيق · الضرائب — أبوظبي",
    heading: "نجاحكم، التزامنا.",
    intro:
      "تدعم الفتح لحلول الحسابات والضرائب الشركات في دولة الإمارات بخدمات التدقيق والمحاسبة والامتثال الضريبي والاستشارات، من تأسيس الشركة إلى الامتثال المؤسسي.",
    contactCta: "تواصل معنا",
    servicesCta: "استكشف خدماتنا",
    highlights: [
      "ضريبة القيمة المضافة وضريبة الشركات في الإمارات",
      "شهادة القيمة المحلية المضافة والتسجيل كمورد لدى أدنوك",
      "مكتبنا في أبوظبي",
    ],
    servicesEyebrow: "خدماتنا",
    servicesHeading: "خدمات لكل مرحلة من مراحل أعمالكم.",
    servicesIntro:
      "من مسك الدفاتر إلى الاستعداد للتدقيق، نتولى العمل المالي والتنظيمي لتتفرغوا لإدارة أعمالكم.",
    services: [
      {
        title: "التدقيق والتأكيد",
        text: "تدقيق مستقل يعزّز الشفافية والثقة في تقاريركم المالية.",
        icon: ShieldCheck,
      },
      {
        title: "شهادة القيمة المحلية المضافة (ICV)",
        text: "دعم خلال برنامج القيمة المحلية المضافة لتعزيز أهليتكم للعقود الحكومية.",
        icon: BadgeCheck,
      },
      {
        title: "المحاسبة ومسك الدفاتر",
        text: "دفاتر دقيقة ورواتب وتقارير إدارية محدّثة باستمرار.",
        icon: BookOpenCheck,
      },
      {
        title: "ضريبة الشركات",
        text: "التزموا بمتطلبات ضريبة الشركات في الإمارات وقلّلوا المخاطر المالية.",
        icon: Landmark,
      },
      {
        title: "خدمات ضريبة القيمة المضافة",
        text: "التسجيل في ضريبة القيمة المضافة وتقديم الإقرارات والاستشارات.",
        icon: ReceiptText,
      },
      {
        title: "التسجيل كمورد لدى أدنوك",
        text: "إرشاد خلال إجراءات تسجيل الموردين لفتح الفرص في قطاع الطاقة الإماراتي.",
        icon: Factory,
      },
    ] satisfies Service[],
    moreHeading: "نساعدكم أيضًا في",
    more: [
      "هيكلة الأعمال",
      "الاستشارات الإدارية",
      "الامتثال التنظيمي",
      "خدمات المدير المالي الافتراضي",
      "الاستشارات الضريبية",
      "تأسيس الشركات وتصفيتها",
    ],
    aboutEyebrow: "عن الفتح",
    aboutHeading: "قائمون على الدقة والنزاهة والخبرة.",
    mission:
      "نساعد الشركات على النمو من خلال رؤى مالية دقيقة وامتثال ضريبي احترافي واستشارات استراتيجية.",
    vision: "نسعى لأن نكون من الشركات الرائدة في المحاسبة والاستشارات الضريبية، المعروفة بالنزاهة.",
    values: [
      ["الدقة", "أرقام يمكنكم الاعتماد عليها في قراراتكم."],
      ["النزاهة", "استشارات شفافة وتقارير صادقة."],
      ["الخبرة", "معرفة عملية بالضرائب والامتثال في الإمارات."],
    ],
    contactEyebrow: "تواصل معنا",
    contactHeading: "زوروا مكتبنا أو تواصلوا معنا.",
    contactText: "اتصلوا بنا أو راسلونا أو زورونا في أبوظبي لمناقشة احتياجات أعمالكم.",
    address: "المبنى رقم 7.M6، آل نهيان، أبوظبي، الإمارات العربية المتحدة",
    addressLabel: "المكتب",
    phoneLabel: "الهاتف",
    emailLabel: "البريد الإلكتروني",
    directions: "الاتجاهات",
    staffHeading: "موظفو الفتح",
    staffText: "سجّلوا الدخول إلى مساحة العمل الداخلية للعملاء والمهام والوقت.",
    copyright: "جميع الحقوق محفوظة.",
    languageName: "English",
    languagePath: "/en",
  },
} as const;

function copyFor(locale: string) {
  return content[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const copy = copyFor(lang);
  return {
    title: { absolute: `${copy.metaTitle} | Al Fath` },
    description: copy.metaDescription,
  };
}

const sectionEyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-brand-700";
const sectionHeading = "mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em] text-navy-950 sm:text-4xl";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const copy = copyFor(locale);
  const navItems = [
    { href: "#services", label: copy.nav.services },
    { href: "#about", label: copy.nav.about },
    { href: "#contact", label: copy.nav.contact },
  ] as const;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" aria-label={BRAND_NAME} className="shrink-0">
            <BrandLogo variant="full" priority />
          </Link>

          <nav aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"} className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a key={item.href} className="text-sm font-medium text-slate-600 transition hover:text-navy-900" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              href={copy.languagePath}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 md:inline-flex"
            >
              {copy.languageName}
            </Link>
            <Link
              href="/login"
              className="hidden min-h-10 items-center justify-center rounded-lg bg-navy-900 px-4 text-sm font-medium text-white transition hover:bg-navy-800 md:inline-flex"
            >
              {copy.staffSignIn}
            </Link>
            <MobileNavigation
              items={navItems}
              signIn={copy.staffSignIn}
              languageName={copy.languageName}
              languagePath={copy.languagePath}
              language={locale}
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-medium text-brand-800 sm:text-sm">
              {copy.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-navy-950 sm:text-6xl">
              {copy.heading}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{copy.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {copy.contactCta}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </a>
              <a
                href="#services"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-navy-900 transition hover:bg-slate-50"
              >
                {copy.servicesCta}
              </a>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              {copy.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-100/70 via-white to-navy-100/70 blur-2xl" aria-hidden="true" />
            <div className="relative rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_30px_80px_-40px_rgba(6,26,47,0.35)] sm:p-10">
              <Image src={logo} alt={BRAND_NAME} priority sizes="(min-width: 1024px) 400px, 80vw" className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 border-t border-slate-200 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className={sectionEyebrow}>{copy.servicesEyebrow}</p>
            <h2 className={sectionHeading}>{copy.servicesHeading}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{copy.servicesIntro}</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.services.map(({ title, text, icon: Icon }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm sm:p-7">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h3 className="text-sm font-semibold text-navy-950">{copy.moreHeading}</h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {copy.more.map((item) => (
                <li key={item} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 bg-navy-950 px-5 py-20 text-white sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{copy.aboutEyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">{copy.aboutHeading}</h2>
            <p className="mt-6 text-base leading-7 text-slate-300">{copy.mission}</p>
            <p className="mt-4 text-base leading-7 text-slate-300">{copy.vision}</p>
          </div>
          <ul className="grid gap-4 self-center">
            {copy.values.map(([title, text]) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className={sectionEyebrow}>{copy.contactEyebrow}</p>
            <h2 className={sectionHeading}>{copy.contactHeading}</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">{copy.contactText}</p>

            <dl className="mt-8 space-y-5">
              <ContactRow icon={MapPin} label={copy.addressLabel}>
                <span>{copy.address}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  {copy.directions}
                  <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                </a>
              </ContactRow>
              <ContactRow icon={Phone} label={copy.phoneLabel}>
                {OFFICE.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`} dir="ltr" className="w-fit hover:text-brand-700">
                    {phone}
                  </a>
                ))}
              </ContactRow>
              <ContactRow icon={Mail} label={copy.emailLabel}>
                <a href={`mailto:${OFFICE.email}`} dir="ltr" className="w-fit hover:text-brand-700">
                  {OFFICE.email}
                </a>
              </ContactRow>
            </dl>
          </div>

          <div className="flex flex-col justify-end">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <BrandLogo variant="mark" />
              <h3 className="mt-5 text-lg font-semibold text-navy-950">{copy.staffHeading}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.staffText}</p>
              <Link
                href="/login"
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy-900 px-5 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                {copy.staffSignIn}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <BrandLogo />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/login" className="transition hover:text-navy-900">{copy.staffSignIn}</Link>
            <Link href={copy.languagePath} className="transition hover:text-navy-900">{copy.languageName}</Link>
            <span>
              © 2026 {BRAND_NAME}. {copy.copyright}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
        <dd className="mt-1 flex flex-col text-base text-slate-800">{children}</dd>
      </div>
    </div>
  );
}
