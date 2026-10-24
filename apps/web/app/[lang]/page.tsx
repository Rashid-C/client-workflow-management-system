import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChartLine,
  Cpu,
  FileCheck,
  HandCoins,
  Layers,
  Network,
  Users,
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
import ContactFab from "@/components/marketing/contact-fab";
import MobileNavigation from "@/components/marketing/mobile-navigation";
import SocialLinks, { SocialIcon, type SocialNetwork } from "@/components/marketing/social-icons";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { DEVELOPER } from "@/lib/developer";
import { OFFICE, telHref } from "@/lib/office";
import accountingPhoto from "@/public/services/accounting.jpg";
import adnocPhoto from "@/public/services/adnoc.jpg";
import auditingPhoto from "@/public/services/auditing.jpg";
import corporateTaxPhoto from "@/public/services/corporate-tax.jpg";
import icvPhoto from "@/public/services/icv.jpg";
import vatPhoto from "@/public/services/vat.jpg";

// The old site's team, testimonials and client logos were template
// placeholders and are left out.
const DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${OFFICE.coordinates}`;
const MAP_EMBED_URL = `https://www.google.com/maps?q=${OFFICE.coordinates}&z=16&output=embed`;

// Client logos for the "Trusted by" strip: add each real client here, with
// their permission, as { name, src } (src: a file under public/clients/).
// The strip stays hidden in production until this list has entries.
const CLIENT_LOGOS: readonly { name: string; src: string }[] = [];

// Template demo logos — fictional brands, shown only in development so the
// strip's design can be reviewed. Never published: they are not clients.
const DEMO_LOGOS = ["skoola", "zenyoga", "bugblock", "skillscape", "femmous", "nouvo", "freshmoo", "brandcy", "farmica", "digancy"]
  .map((name) => ({ name, src: `/demo-logos/${name}.png` }));
const TRUSTED_LOGOS = CLIENT_LOGOS.length > 0 || process.env.NODE_ENV === "production" ? CLIENT_LOGOS : DEMO_LOGOS;

// Add each profile's `url` when the client provides it; until then the icon
// shows without a link (the old site's icons linked nowhere).
const SOCIAL: readonly { network: SocialNetwork; url?: string }[] = [
  { network: "facebook" },
  { network: "instagram" },
  { network: "x" },
  { network: "linkedin" },
];

type Service = { title: string; text: string; icon: LucideIcon };

// Icons for `more` (the extra services) and `why`, in order.
const MORE_ICONS: LucideIcon[] = [Network, BriefcaseBusiness, FileCheck, ChartLine, Calculator, Building2];
const WHY_ICONS: LucideIcon[] = [Users, Cpu, Layers, HandCoins];

// One photo per service, in the same order as `services` in both languages.
// The ICV and ADNOC photos are cropped clear of those programmes' logos.
const SERVICE_PHOTOS = [auditingPhoto, icvPhoto, accountingPhoto, corporateTaxPhoto, vatPhoto, adnocPhoto];

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
    ctaHeading: "Partner with experts who understand your business.",
    ctaText: "Let Al Fath handle your accounting, tax and compliance needs — so you can focus on growing your business.",
    addressShort: "Building No. 33 M04, Defence Road, Abu Dhabi",
    stats: [
      ["500+", "Satisfied clients"],
      ["1,200+", "Audits completed"],
      ["15+", "Years of experience"],
      ["12", "Services"],
    ],
    whyHeading: "Why businesses trust Al Fath",
    why: [
      ["Qualified & experienced team", "Chartered Accountants and tax professionals with global expertise."],
      ["Modern accounting tools", "Advanced technology for precision and efficiency."],
      ["End-to-end financial solutions", "From startup setup to corporate compliance, we have you covered."],
      ["Affordable & transparent pricing", "High-quality financial services at competitive rates."],
    ],
    reach:
      "Our team of experienced Chartered Accountants and tax experts supports clients across the UAE, Bahrain and India.",
    fab: { open: "Contact options", close: "Close contact options", whatsapp: "WhatsApp", call: "Call", email: "Email" },
    callUs: "Call us",
    emailUs: "Email us",
    servicesCta: "Explore services",
    highlights: [
      "UAE VAT and corporate tax",
      "ICV certification and ADNOC vendor registration",
      "An office in Abu Dhabi",
    ],
    trustedHeading: "Trusted by leading businesses",
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
    moreText: [
      "Efficient business structures that support growth while staying compliant with UAE regulations.",
      "Strategic advice to improve operations, profitability and sustainable growth.",
      "Help meeting ESR, AML and ISO requirements, avoiding penalties.",
      "Financial planning, budgeting and analysis to strengthen business decisions.",
      "Guidance on VAT, excise and corporate tax for complete regulatory compliance.",
      "Company formation, licensing and orderly winding-up with full legal compliance.",
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
    address: "Building No. 33 M04, Defence Road, Al Nahyan, Abu Dhabi, UAE",
    addressLabel: "Office",
    mapTitle: "Map showing the Al Fath office in Al Nahyan, Abu Dhabi",
    phoneLabel: "Phone",
    emailLabel: "Email",
    directions: "Get directions",
    footerAbout:
      "A trusted accounting and tax firm in Abu Dhabi, offering accounting, auditing, tax advisory and business consultancy services.",
    quickLinks: "Quick links",
    home: "Home",
    ourServices: "Our services",
    contactUs: "Contact us",
    copyright: "All rights reserved.",
    developedBy: "Designed & developed by",
    developerLinkedIn: (name: string) => `${name} on LinkedIn`,
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
    ctaHeading: "شاركوا خبراء يفهمون أعمالكم.",
    ctaText: "دعوا الفتح تتولى احتياجاتكم في المحاسبة والضرائب والامتثال، لتتفرغوا لتنمية أعمالكم.",
    addressShort: "المبنى رقم 33 M04، شارع الدفاع، أبوظبي",
    stats: [
      ["+500", "عميل راضٍ"],
      ["+1,200", "عملية تدقيق منجزة"],
      ["+15", "عامًا من الخبرة"],
      ["12", "خدمة"],
    ],
    whyHeading: "لماذا تثق الشركات بالفتح",
    why: [
      ["فريق مؤهل وذو خبرة", "محاسبون قانونيون وخبراء ضرائب بخبرة عالمية."],
      ["أدوات محاسبية حديثة", "تقنيات متقدمة لدقة وكفاءة أعلى."],
      ["حلول مالية متكاملة", "من تأسيس الشركات الناشئة إلى الامتثال المؤسسي، نحن معكم."],
      ["أسعار مناسبة وشفافة", "خدمات مالية عالية الجودة بأسعار تنافسية."],
    ],
    reach: "يدعم فريقنا من المحاسبين القانونيين وخبراء الضرائب ذوي الخبرة العملاء في الإمارات والبحرين والهند.",
    fab: { open: "خيارات التواصل", close: "إغلاق خيارات التواصل", whatsapp: "واتساب", call: "اتصال", email: "البريد الإلكتروني" },
    callUs: "اتصل بنا",
    emailUs: "راسلنا",
    servicesCta: "استكشف خدماتنا",
    highlights: [
      "ضريبة القيمة المضافة وضريبة الشركات في الإمارات",
      "شهادة القيمة المحلية المضافة والتسجيل كمورد لدى أدنوك",
      "مكتبنا في أبوظبي",
    ],
    trustedHeading: "شركات رائدة تثق بنا",
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
    moreText: [
      "هياكل أعمال فعّالة تدعم النمو مع الالتزام بأنظمة الإمارات.",
      "استشارات استراتيجية لتحسين العمليات والربحية والنمو المستدام.",
      "المساعدة في استيفاء متطلبات ESR وAML وISO وتجنّب الغرامات.",
      "تخطيط مالي وموازنات وتحليلات لدعم قرارات الأعمال.",
      "إرشاد في ضريبة القيمة المضافة والضريبة الانتقائية وضريبة الشركات لامتثال كامل.",
      "تأسيس الشركات وترخيصها وتصفيتها بشكل منظم مع امتثال قانوني كامل.",
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
    address: "المبنى رقم 33 M04، شارع الدفاع، آل نهيان، أبوظبي، الإمارات العربية المتحدة",
    addressLabel: "المكتب",
    mapTitle: "خريطة توضح مكتب الفتح في آل نهيان، أبوظبي",
    phoneLabel: "الهاتف",
    emailLabel: "البريد الإلكتروني",
    directions: "الاتجاهات",
    footerAbout:
      "شركة محاسبة وضرائب موثوقة في أبوظبي، تقدم خدمات المحاسبة والتدقيق والاستشارات الضريبية واستشارات الأعمال.",
    quickLinks: "روابط سريعة",
    home: "الرئيسية",
    ourServices: "خدماتنا",
    contactUs: "تواصل معنا",
    copyright: "جميع الحقوق محفوظة.",
    developedBy: "تصميم وتطوير",
    developerLinkedIn: (name: string) => `${name} على LinkedIn`,
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

const sectionEyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-signal-700";
const footerHeading = "text-xs font-semibold uppercase tracking-[0.16em] text-white";
const footerLink = "text-slate-400 transition hover:text-white";
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
    <main id="top" className="min-h-screen bg-white text-slate-900">
      <div className="hidden bg-navy-950 text-xs text-slate-300 md:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <p className="flex items-center gap-2">
            <MapPin className="size-3.5 shrink-0 text-signal-300" aria-hidden="true" />
            {copy.addressShort}
          </p>
          <div className="flex items-center gap-5">
            <a href={`mailto:${OFFICE.email}`} dir="ltr" className="flex items-center gap-1.5 transition hover:text-white">
              <Mail className="size-3.5 text-signal-300" aria-hidden="true" />
              {OFFICE.email}
            </a>
            {OFFICE.phones.map((phone) => (
              <a key={phone} href={telHref(phone)} dir="ltr" className="hidden items-center gap-1.5 transition hover:text-white lg:flex">
                <Phone className="size-3.5 text-signal-300" aria-hidden="true" />
                {phone}
              </a>
            ))}
            <SocialLinks links={SOCIAL} compact />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link href="/" aria-label={BRAND_NAME} className="shrink-0">
            <BrandLogo variant="full" priority />
          </Link>

          <nav aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"} className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a key={item.href} className="text-sm font-medium text-slate-600 transition hover:text-signal-700" href={item.href}>
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
              className="hidden min-h-10 items-center justify-center rounded-full bg-signal-600 px-5 text-sm font-medium text-white shadow-sm shadow-signal-600/30 transition hover:bg-signal-700 md:inline-flex"
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

      {/* Hero: bright blue, centred, with a photo row rising into the next section. */}
      <section className="relative text-white">
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-signal-700 via-signal-600 to-signal-500" aria-hidden="true">
          <div className="absolute -top-48 start-1/2 size-240 -translate-x-1/2 rounded-full bg-white/20 blur-3xl rtl:translate-x-1/2" />
          <div className="absolute -bottom-40 -end-32 size-112 rounded-full bg-sky-300/30 blur-3xl" />
          <div className="marketing-grid absolute inset-0 opacity-[0.14]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 pt-16 text-center sm:px-8 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-medium backdrop-blur sm:text-sm">
            <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {copy.heading}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">{copy.intro}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-signal-700 shadow-lg shadow-signal-950/25 transition hover:bg-signal-50"
            >
              {copy.contactCta}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </a>
            <a
              href="#services"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {copy.servicesCta}
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5 text-sm">
            {copy.highlights.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="relative z-10 mx-auto -mb-28 mt-14 grid max-w-5xl grid-cols-1 items-end gap-5 sm:-mb-36 sm:mt-16 sm:grid-cols-[0.8fr_1.4fr_0.8fr]">
            <div className="hidden overflow-hidden rounded-2xl border-4 border-white/50 shadow-2xl shadow-signal-950/30 sm:block">
              <Image src={accountingPhoto} alt="" placeholder="blur" sizes="240px" className="aspect-4/5 w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-3xl border-4 border-white/60 shadow-2xl shadow-signal-950/40">
              <Image src={auditingPhoto} alt="" priority placeholder="blur" sizes="(min-width: 640px) 520px, 90vw" className="aspect-4/3 w-full object-cover" />
            </div>
            <div className="hidden overflow-hidden rounded-2xl border-4 border-white/50 shadow-2xl shadow-signal-950/30 sm:block">
              <Image src={corporateTaxPhoto} alt="" placeholder="blur" sizes="240px" className="aspect-4/5 w-full object-cover" />
            </div>
          </div>
        </div>
      </section>
      {/* The firm's numbers, confirmed by the client; the top padding leaves
          room for the photo row that overlaps the hero's lower edge. */}
      <section className="bg-white px-5 pb-4 pt-40 sm:px-8 sm:pt-52">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
          {copy.stats.map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse rounded-2xl border border-signal-100 bg-gradient-to-b from-signal-50 to-white px-5 py-6 text-center">
              <dt className="mt-1 text-sm text-slate-600">{label}</dt>
              <dd className="text-3xl font-semibold tracking-tight text-signal-700 sm:text-4xl" dir="ltr">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Trusted by */}
      {TRUSTED_LOGOS.length > 0 && (
        <section aria-labelledby="trusted-heading" className="border-t border-slate-200 bg-white px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 id="trusted-heading" className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {copy.trustedHeading}
            </h2>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-14">
              {TRUSTED_LOGOS.map((logo) => (
                <li key={logo.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- small fixed logos */}
                  <img
                    src={logo.src}
                    alt={logo.name}
                    loading="lazy"
                    className="h-8 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-9"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className={sectionEyebrow}>{copy.servicesEyebrow}</p>
            <h2 className={sectionHeading}>{copy.servicesHeading}</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{copy.servicesIntro}</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.services.map(({ title, text, icon: Icon }, index) => (
              <article key={title} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-signal-200 hover:shadow-xl hover:shadow-signal-900/10">
                <div className="aspect-3/2 overflow-hidden bg-slate-100">
                  <Image
                    src={SERVICE_PHOTOS[index]}
                    alt=""
                    placeholder="blur"
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="relative px-6 pb-7 sm:px-7">
                  <span className="-mt-6 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-signal-500 to-signal-700 text-white shadow-lg shadow-signal-700/30 ring-4 ring-white">
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-navy-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14">
            <h3 className="text-xl font-semibold text-navy-950">{copy.moreHeading}</h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {copy.more.map((title, index) => {
                const Icon = MORE_ICONS[index];
                return (
                  <li key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-signal-200 hover:shadow-md">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-signal-50 text-signal-700">
                      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div>
                      <h4 className="font-semibold text-navy-950">{title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{copy.moreText[index]}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Why Al Fath */}
      <section className="bg-gradient-to-b from-signal-50/70 to-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className={`${sectionHeading} mx-auto max-w-2xl text-center`}>{copy.whyHeading}</h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {copy.why.map(([title, text], index) => {
              const Icon = WHY_ICONS[index];
              const featured = index === 1;
              return (
                <li
                  key={title}
                  className={featured
                    ? "rounded-3xl bg-gradient-to-br from-signal-500 to-signal-800 p-7 text-white shadow-xl shadow-signal-900/20"
                    : "rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"}
                >
                  <span className={`flex size-12 items-center justify-center rounded-2xl ${featured ? "bg-white/15 text-white" : "bg-signal-50 text-signal-700"}`}>
                    <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3 className={`mt-6 text-lg font-semibold ${featured ? "" : "text-navy-950"}`}>{title}</h3>
                  <p className={`mt-2 text-sm leading-6 ${featured ? "text-signal-50/90" : "text-slate-600"}`}>{text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 border-y border-slate-200 bg-porcelain px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <p className={sectionEyebrow}>{copy.aboutEyebrow}</p>
            <h2 className={sectionHeading}>{copy.aboutHeading}</h2>
            <p className="mt-6 text-base leading-7 text-slate-600">{copy.mission}</p>
            <p className="mt-4 text-base leading-7 text-slate-600">{copy.vision}</p>
            <p className="mt-4 text-base leading-7 text-slate-600">{copy.reach}</p>
          </div>
          <ul className="grid gap-4 self-center">
            {copy.values.map(([title, text], index) => (
              <li key={title} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-500 to-signal-700 text-sm font-semibold text-white" dir="ltr" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-semibold text-navy-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Call to action */}
      <section className="px-5 pt-20 sm:px-8 sm:pt-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-signal-600 via-signal-700 to-navy-900 px-6 py-12 text-white shadow-xl shadow-signal-900/20 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="marketing-grid pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden="true" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-3xl">{copy.ctaHeading}</h2>
              <p className="mt-3 text-base leading-7 text-signal-50/90">{copy.ctaText}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:${OFFICE.phones[0].replace(/\s/g, "")}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-navy-950 shadow-lg transition hover:bg-signal-50"
              >
                <Phone className="size-4" aria-hidden="true" />
                {copy.callUs}
              </a>
              <a
                href={`mailto:${OFFICE.email}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <Mail className="size-4" aria-hidden="true" />
                {copy.emailUs}
              </a>
            </div>
          </div>
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
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-signal-700 hover:text-signal-800"
                >
                  {copy.directions}
                  <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                </a>
              </ContactRow>
              <ContactRow icon={Phone} label={copy.phoneLabel}>
                {OFFICE.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s/g, "")}`} dir="ltr" className="w-fit hover:text-signal-700">
                    {phone}
                  </a>
                ))}
              </ContactRow>
              <ContactRow icon={Mail} label={copy.emailLabel}>
                <a href={`mailto:${OFFICE.email}`} dir="ltr" className="w-fit hover:text-signal-700">
                  {OFFICE.email}
                </a>
              </ContactRow>
            </dl>
          </div>

          <div className="min-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:min-h-0">
            <iframe
              title={copy.mapTitle}
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="size-full min-h-[320px] border-0"
            />
          </div>
        </div>
      </section>

      <footer className="bg-navy-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.3fr_0.7fr_1.4fr_1fr] lg:gap-12">
          <div>
            <BrandLogo variant="full" tone="dark" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">{copy.footerAbout}</p>
            <SocialLinks links={SOCIAL} className="mt-5" />
          </div>

          <nav aria-label={copy.quickLinks}>
            <h2 className={footerHeading}>{copy.quickLinks}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="#top" className={footerLink}>{copy.home}</a></li>
              {navItems.map((item) => (
                <li key={item.href}><a href={item.href} className={footerLink}>{item.label}</a></li>
              ))}
              <li><Link href="/login" className={footerLink}>{copy.staffSignIn}</Link></li>
            </ul>
          </nav>

          <div>
            <h2 className={footerHeading}>{copy.ourServices}</h2>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              {[...copy.services.map((s) => s.title), ...copy.more].map((title) => (
                <li key={title}><a href="#services" className={footerLink}>{title}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={footerHeading}>{copy.contactUs}</h2>
            <ul className="mt-4 space-y-3.5 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-signal-300" aria-hidden="true" />
                <a href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer" className={footerLink}>{copy.address}</a>
              </li>
              {OFFICE.phones.map((phone) => (
                <li key={phone} className="flex gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-signal-300" aria-hidden="true" />
                  <a href={`tel:${phone.replace(/\s/g, "")}`} dir="ltr" className={footerLink}>{phone}</a>
                </li>
              ))}
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-signal-300" aria-hidden="true" />
                <a href={`mailto:${OFFICE.email}`} dir="ltr" className={footerLink}>{OFFICE.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>© 2026 {BRAND_NAME}. {copy.copyright}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <p className="inline-flex items-center gap-1.5">
                {copy.developedBy}{" "}
                <a href={DEVELOPER.url} target="_blank" rel="noopener" dir="ltr" className="font-medium text-slate-300 transition hover:text-white">
                  {DEVELOPER.name}
                </a>
                <a
                  href={DEVELOPER.linkedin}
                  target="_blank"
                  rel="noopener"
                  aria-label={copy.developerLinkedIn(DEVELOPER.name)}
                  title={copy.developerLinkedIn(DEVELOPER.name)}
                  className="inline-flex size-6 items-center justify-center rounded text-slate-300 transition hover:text-white"
                >
                  <SocialIcon network="linkedin" size={14} />
                </a>
              </p>
              <Link href={copy.languagePath} className="w-fit transition hover:text-white">{copy.languageName}</Link>
            </div>
          </div>
        </div>
      </footer>

      <ContactFab labels={copy.fab} phones={OFFICE.phones} email={OFFICE.email} />
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
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-signal-50 text-signal-700">
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
        <dd className="mt-1 flex flex-col text-base text-slate-800">{children}</dd>
      </div>
    </div>
  );
}
