// Public Privacy Policy and Terms of Service content, Albanian + English.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │ ⚠  LAUNCH DRAFT — REQUIRES HUMAN LEGAL REVIEW BEFORE PRODUCTION LAUNCH.  │
// │                                                                           │
// │ These are engineering drafts that describe what the software actually     │
// │ does. They are NOT legal advice and have NOT been reviewed by a lawyer.   │
// │ A qualified reviewer must check them against the law of the jurisdiction  │
// │ Kornizo actually operates and sells in (Kosovo/Albania, plus the EU GDPR  │
// │ where applicable) before the public site goes live. The pages themselves  │
// │ carry a visible draft notice for the same reason.                         │
// └───────────────────────────────────────────────────────────────────────────┘
//
// WRITING RULES APPLIED HERE — every one of these is a way this file could
// have lied, and deliberately does not:
//
//   * Only behaviour that EXISTS in this repository is described. Nothing is
//     promised about features that are not built.
//   * NO certification or audit claim: no GDPR "compliant"/"certified", no
//     ISO 27001, no SOC 2, no PCI DSS, no penetration-test claim.
//   * NO invented legal entity name, company registration number, VAT number,
//     postal address, phone number or data-protection-officer contact. None of
//     those is configured anywhere in this project.
//   * NO invented retention periods, deletion SLAs, uptime or availability
//     promise, backup-frequency guarantee or breach-notification deadline.
//   * NO price, payment term, refund policy or renewal term, because the launch
//     product has no self-service billing at all.
//   * NO claim that data is encrypted "at rest with AES-256" or similar; what
//     is stated is what is verifiable from the code and hosting setup.
//   * The sub-processor is named only as far as it is genuinely known from the
//     configuration (a managed Postgres provider), without asserting a
//     contractual data-processing agreement that has not been reviewed.
//   * Where a decision genuinely has not been made, the text says so plainly
//     rather than inventing a policy.
//
// The support address is injected at render time from src/lib/support-contact.ts
// so the open contact decision lives in exactly one place.

// Readonly throughout, so the copy cannot be mutated at runtime.
export interface LegalSection {
  readonly heading: string;
  /** Paragraphs. Rendered in order, each as its own <p>. */
  readonly paragraphs: readonly string[];
  /** Optional bullet list rendered after the paragraphs. */
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  /** Document title, e.g. "Politika e privatësisë". */
  title: string;
  /** One-line summary under the title. */
  intro: string;
  /** The visible "this is a draft" notice. */
  draftNotice: string;
  /** Label for the "last updated" line. */
  updatedLabel: string;
  readonly sections: readonly LegalSection[];
  /** Heading of the closing contact block. */
  contactHeading: string;
  /** Sentence introducing the support address (the address is appended). */
  contactBody: string;
  backLabel: string;
}

/**
 * Last substantive edit to this text, as a plain calendar date.
 *
 * A calendar date, not a timestamp: "last updated" on a legal page is a
 * business fact about the document, not an instant, and must read the same for
 * every visitor regardless of timezone.
 */
export const LEGAL_LAST_UPDATED = "2026-09-10";

/** Both documents for one locale. */
interface LocaleLegal {
  readonly privacy: LegalDocument;
  readonly terms: LegalDocument;
}

// Annotated rather than `as const`: an `as const` literal narrows each section
// to its own exact shape, so a section without `bullets` loses the optional
// property entirely and the renderer cannot read `section.bullets`. The
// readonly interface already prevents mutation.
const sq: LocaleLegal = {
  privacy: {
    title: "Politika e privatësisë",
    intro:
      "Si i mbledh, i përdor dhe i mbron Kornizo të dhënat e llogarisë dhe të dhënat e biznesit tuaj.",
    draftNotice:
      "Ky tekst është draft. Ai përshkruan sjelljen aktuale të produktit dhe nuk është ende i rishikuar juridikisht. Përmbajtja mund të ndryshojë përpara lansimit publik.",
    updatedLabel: "Përditësuar më",
    contactHeading: "Kontakt",
    contactBody: "Për çdo pyetje për të dhënat tuaja ose për këtë politikë, shkruani te",
    backLabel: "Kthehu në faqen kryesore",
    sections: [
      {
        heading: "Kush e ofron Kornizo",
        paragraphs: [
          "Kornizo është një aplikacion në internet për kompanitë e dritareve dhe dyerve: konfigurim, çmime, projekte, oferta, fatura dhe pagesa.",
          "Entiteti juridik, adresa e regjistrimit dhe numri i biznesit të operatorit të Kornizo do të shtohen në këtë faqe përpara lansimit publik. Ato nuk janë shpallur ende dhe nuk shpikeshin këtu.",
        ],
      },
      {
        heading: "Të dhënat që mbledhim",
        paragraphs: [
          "Mbledhim vetëm të dhënat që janë të nevojshme për të krijuar llogarinë, për të shqyrtuar kërkesën tuaj dhe për të mbajtur aplikacionin në funksion.",
        ],
        bullets: [
          "Të dhënat e llogarisë: emri, adresa e email-it dhe fjalëkalimi i ruajtur në formë hash nga sistemi i autentikimit. Fjalëkalimin nuk e ruajmë dhe nuk e shohim si tekst.",
          "Të dhënat e kërkesës për provë: emri i kompanisë, personi i kontaktit, email-i, shteti dhe informacioni i vetëdeklaruar për madhësinë e kompanisë, që i dërgoni në formularin e kërkesës.",
          "Të dhënat e kërkesës për demo: emri, email-i dhe të dhënat e kompanisë që i jepni vullnetarisht. Kërkesa për demo nuk krijon llogari.",
          "Të dhënat e biznesit që futni brenda aplikacionit: klientët, çmimet e kompanisë, konfigurimet e dritareve/dyerve, projektet, ofertat, faturat, pagesat, bilancet dhe shënimet.",
          "Të dhënat e sesionit dhe të autentikimit: cookie e sesionit dhe koha e skadimit, të nevojshme për të mbajtur kyçjen.",
        ],
      },
      {
        heading: "Si i përdorim",
        paragraphs: [
          "Të dhënat e llogarisë dhe të sesionit i përdorim për t'ju kyçur, për t'ju lidhur me kompaninë tuaj dhe për të kontrolluar rolet brenda ekipit.",
          "Të dhënat e kërkesës për provë dhe demo i përdorim për të shqyrtuar kërkesën, për t'ju kontaktuar për të dhe për të hapur qasjen kur kërkesa aprovohet.",
          "Të dhënat e biznesit tuaj i përdorim vetëm për të ofruar funksionet e aplikacionit për kompaninë tuaj. Ato janë të dhënat e kompanisë tuaj, jo tonat.",
          "Nuk i shesim të dhënat tuaja dhe nuk i ndajmë me palë të treta për reklama.",
          "Nuk i përdorim të dhënat e biznesit tuaj për të trajnuar modele të inteligjencës artificiale.",
        ],
      },
      {
        heading: "Ndarja midis kompanive",
        paragraphs: [
          "Të dhënat e biznesit ndahen sipas organizatës. Aplikacioni e zbaton këtë ndarje në nivel baze të dhënash, me politika që lejojnë vetëm rreshtat e organizatës tuaj aktive, dhe roli i anëtarit rilexohet nga serveri në secilën kërkesë.",
          "Një kompani nuk mund të lexojë të dhënat e një kompanie tjetër përmes aplikacionit.",
        ],
      },
      {
        heading: "Kush ka qasje",
        paragraphs: [
          "Brenda kompanisë tuaj, qasja varet nga roli që pronari ose administratori ju ka dhënë.",
          "Ekipi operativ i Kornizo ka një zonë të veçantë administrative për të menaxhuar llogaritë. Ajo tregon të dhëna të llogarisë dhe numërime përdorimi — jo përmbajtjen e biznesit tuaj: nuk shfaqen rreshtat e faturave, adresat e klientëve tuaj, konfigurimet e projekteve ose përmbajtja e pagesave.",
          "Aplikacioni nuk ka funksion për t'u kyçur si ju (impersonim).",
          "Veprimet administrative regjistrohen në një gjurmë auditimi që mund vetëm të shtohet.",
        ],
      },
      {
        heading: "Ku ruhen të dhënat",
        paragraphs: [
          "Të dhënat ruhen në një bazë të dhënash PostgreSQL të menaxhuar nga një ofrues i jashtëm hostimi, e lidhur me komunikim të kriptuar.",
          "Ofruesi konkret i hostimit dhe regjioni për lansim do të konfirmohen në këtë faqe kur mjedisi i produksionit të finalizohet.",
        ],
      },
      {
        heading: "Sa kohë i ruajmë",
        paragraphs: [
          "Të dhënat e kompanisë tuaj ruhen sa kohë që llogaria ekziston. Përfundimi i provës 14-ditore ndalon qasjen e përditshme në aplikacion, por nuk fshin asgjë.",
          "Kornizo nuk ka ende një rrjedhë të vendosur për fshirjen e llogarisë sipas kërkesës ose një periudhë të caktuar ruajtjeje pas mbylljes. Kjo është një vendim që nuk është marrë ende dhe nuk po e shpikim këtu. Deri atëherë, për fshirje ose eksportim të të dhënave tuaja, na kontaktoni dhe e trajtojmë manualisht.",
        ],
      },
      {
        heading: "Të drejtat tuaja",
        paragraphs: [
          "Mund t'i shikoni dhe t'i ndryshoni të dhënat e kompanisë tuaj brenda aplikacionit dhe të ndryshoni fjalëkalimin nga faqja e sigurisë.",
          "Për një kopje, korrigjim ose fshirje të të dhënave që nuk mund t'i kryeni vetë brenda aplikacionit, na shkruani dhe e trajtojmë kërkesën manualisht.",
          "Nuk pretendojmë certifikim GDPR, ISO 27001, SOC 2 ose çdo certifikim tjetër formal. Nuk kemi kaluar një auditim të tillë.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Aplikacioni përdor një cookie sesioni të nevojshme për të mbajtur kyçjen. Nuk përdorim cookie reklamimi dhe nuk kemi gjurmuesa reklamash të palëve të treta.",
        ],
      },
      {
        heading: "Ndryshimet",
        paragraphs: [
          "Kur e ndryshojmë këtë politikë në mënyrë thelbësore, do të përditësojmë datën më lart. Përpara lansimit publik ky tekst do të kalojë rishikim juridik.",
        ],
      },
    ],
  },
  terms: {
    title: "Kushtet e shërbimit",
    intro: "Kushtet me të cilat mund të përdorni Kornizo.",
    draftNotice:
      "Ky tekst është draft. Ai përshkruan sjelljen aktuale të produktit dhe nuk është ende i rishikuar juridikisht. Përmbajtja mund të ndryshojë përpara lansimit publik.",
    updatedLabel: "Përditësuar më",
    contactHeading: "Kontakt",
    contactBody: "Për pyetje për këto kushte ose për llogarinë tuaj, shkruani te",
    backLabel: "Kthehu në faqen kryesore",
    sections: [
      {
        heading: "Shërbimi",
        paragraphs: [
          "Kornizo është aplikacion në internet për kompanitë e dritareve dhe dyerve. Plani i vetëm në lansim është Kornizo Standard dhe përfshin funksionet aktuale të produktit: klientë, çmime të kompanisë, konfigurues dritaresh/dyersh, projekte, oferta, ndjekje të ofertave, fatura, pagesa, bilanc/kredi, shënime, ekip dhe cilësimet e kompanisë.",
        ],
      },
      {
        heading: "Llogaria dhe qasja",
        paragraphs: [
          "Për t'i përdorur funksionet e biznesit duhet një llogari dhe një kompani e krijuar nga Kornizo.",
          "Vetëm një llogari nuk jep qasje në aplikacion. Kërkesa për provë shqyrtohet nga ekipi i Kornizo dhe qasja hapet vetëm pas aprovimit. Regjistrimi publik i vetëshërbimit i kompanive nuk është i hapur.",
          "Ju jeni përgjegjës për ruajtjen e kredencialeve tuaja dhe për veprimet e anëtarëve që i shtoni në kompaninë tuaj.",
        ],
      },
      {
        heading: "Prova 14-ditore",
        paragraphs: [
          "Kur kërkesa juaj aprovohet dhe llogaria bëhet gati, merrni 14 ditë qasje të plotë në Kornizo Standard. Prova nis kur llogaria bëhet gati — jo kur dërgohet kërkesa.",
          "Prova përmban të njëjtat funksione si plani i plotë. Nuk ka funksione të kufizuara gjatë provës.",
          "Kur prova përfundon, qasja e përditshme në aplikacion ndalon. Të dhënat e kompanisë tuaj ruhen dhe nuk fshihen. Për të vazhduar, na kontaktoni.",
        ],
      },
      {
        heading: "Pagesa",
        paragraphs: [
          "Në këtë fazë Kornizo nuk ka pagesë me vetëshërbim, abonim automatik ose portal faturimi. Aktivizimi i një klienti pas provës bëhet manualisht nga ekipi i Kornizo pas bisedës me ju.",
          "Çmimet dhe kushtet komerciale bien dakord veçmas dhe nuk publikohen në këtë faqe.",
        ],
      },
      {
        heading: "Të dhënat tuaja",
        paragraphs: [
          "Të dhënat e biznesit që futni në Kornizo mbeten të dhënat e kompanisë tuaj.",
          "Ju jeni përgjegjës për saktësinë e të dhënave që futni dhe për ligjshmërinë e përdorimit të tyre — përfshirë të dhënat e klientëve tuaj.",
          "Si i trajtojmë të dhënat përshkruhet në politikën e privatësisë.",
        ],
      },
      {
        heading: "Përdorim i pranueshëm",
        paragraphs: [
          "Nuk lejohet përpjekja për të hyrë në të dhënat e një kompanie tjetër, për t'i shmangur kontrollet e qasjes, për të ngarkuar përmbajtje të paligjshme ose për të prishur funksionimin e shërbimit për të tjerët.",
        ],
      },
      {
        heading: "Pezullimi",
        paragraphs: [
          "Kornizo mund të pezullojë qasjen e një organizate për arsye operative ose në rast shkeljeje të këtyre kushteve. Pezullimi ndalon qasjen; nuk fshin të dhëna. Kur pezullimi hiqet, qasja kthehet.",
        ],
      },
      {
        heading: "Disponueshmëria",
        paragraphs: [
          "Kornizo është produkt në zhvillim aktiv. Nuk premtojmë një nivel të caktuar disponueshmërie, kohë përgjigjeje ose afat rikuperimi, sepse një marrëveshje e tillë e shërbimit nuk është vendosur ende.",
          "Mund të bëhen ndërprerje të planifikuara për mirëmbajtje dhe përditësime.",
        ],
      },
      {
        heading: "Ndryshimet në shërbim dhe në kushte",
        paragraphs: [
          "Produkti vazhdon të zhvillohet: funksione mund të shtohen ose të ndryshojnë. Plane shtesë mund të prezantohen me kohë; asnjë nuk është premtuar me emër, çmim ose datë.",
          "Kur e ndryshojmë këtë tekst në mënyrë thelbësore, do të përditësojmë datën më lart.",
        ],
      },
      {
        heading: "Përgjegjësia dhe ligji",
        paragraphs: [
          "Kufizimet e përgjegjësisë, garancitë dhe ligji e juridiksioni i zbatueshëm do të plotësohen në këtë faqe pas rishikimit juridik. Nuk po i shpikim këtu.",
        ],
      },
    ],
  },
};

const en: LocaleLegal = {
  privacy: {
    title: "Privacy Policy",
    intro: "How Kornizo collects, uses and protects your account data and your business data.",
    draftNotice:
      "This text is a draft. It describes the product's current behaviour and has not yet been legally reviewed. The content may change before the public launch.",
    updatedLabel: "Last updated",
    contactHeading: "Contact",
    contactBody: "For any question about your data or about this policy, write to",
    backLabel: "Back to the homepage",
    sections: [
      {
        heading: "Who provides Kornizo",
        paragraphs: [
          "Kornizo is a web application for window and door companies: configuration, pricing, projects, offers, invoices and payments.",
          "The legal entity, registered address and business registration number of Kornizo's operator will be added to this page before the public launch. They have not been published yet and are not invented here.",
        ],
      },
      {
        heading: "Data we collect",
        paragraphs: [
          "We collect only the data needed to create your account, review your request and keep the application running.",
        ],
        bullets: [
          "Account data: your name, email address, and a password stored as a hash by the authentication system. We never store or see your password in plain text.",
          "Trial request data: company name, contact person, email, country and the self-declared company-size information you submit in the request form.",
          "Demo request data: the name, email and company details you provide voluntarily. A demo request does not create an account.",
          "Business data you enter inside the application: clients, company pricing, window/door configurations, projects, offers, invoices, payments, balances and notes.",
          "Session and authentication data: the session cookie and its expiry, needed to keep you signed in.",
        ],
      },
      {
        heading: "How we use it",
        paragraphs: [
          "Account and session data is used to sign you in, connect you to your company and enforce roles within your team.",
          "Trial and demo request data is used to review your request, contact you about it, and open access when the request is approved.",
          "Your business data is used only to provide the application's features to your company. It is your company's data, not ours.",
          "We do not sell your data and do not share it with third parties for advertising.",
          "We do not use your business data to train artificial-intelligence models.",
        ],
      },
      {
        heading: "Separation between companies",
        paragraphs: [
          "Business data is separated per organization. The application enforces this at the database level, with policies that permit only rows belonging to your active organization, and your member role is re-read from the server on every request.",
          "One company cannot read another company's data through the application.",
        ],
      },
      {
        heading: "Who has access",
        paragraphs: [
          "Within your company, access depends on the role your owner or administrator granted you.",
          "Kornizo's operations team has a separate administrative area for managing accounts. It shows account data and usage counts — not your business content: it does not display invoice lines, your customers' addresses, project configurations or payment contents.",
          "The application has no feature for signing in as you (impersonation).",
          "Administrative actions are recorded in an append-only audit trail.",
        ],
      },
      {
        heading: "Where data is stored",
        paragraphs: [
          "Data is stored in a PostgreSQL database managed by an external hosting provider, reached over an encrypted connection.",
          "The specific hosting provider and region for launch will be confirmed on this page once the production environment is finalised.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Your company's data is kept for as long as the account exists. The end of the 14-day trial stops day-to-day access to the application but deletes nothing.",
          "Kornizo does not yet have an established flow for account deletion on request, nor a defined retention period after closure. That decision has not been made, and we are not inventing one here. Until then, contact us for deletion or export of your data and we will handle it manually.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can view and change your company's data inside the application, and change your password from the security page.",
          "For a copy, correction or deletion of data you cannot handle yourself inside the application, write to us and we will process the request manually.",
          "We claim no GDPR certification, ISO 27001, SOC 2 or any other formal certification. We have not undergone such an audit.",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "The application uses a session cookie that is necessary to keep you signed in. We use no advertising cookies and have no third-party ad trackers.",
        ],
      },
      {
        heading: "Changes",
        paragraphs: [
          "When we change this policy substantively we will update the date above. Before the public launch this text will undergo legal review.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "The terms under which you may use Kornizo.",
    draftNotice:
      "This text is a draft. It describes the product's current behaviour and has not yet been legally reviewed. The content may change before the public launch.",
    updatedLabel: "Last updated",
    contactHeading: "Contact",
    contactBody: "For questions about these terms or about your account, write to",
    backLabel: "Back to the homepage",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "Kornizo is a web application for window and door companies. The only plan at launch is Kornizo Standard, and it includes the product's current features: clients, company pricing, a window/door configurator, projects, offers, offer tracking, invoices, payments, balance/credit, notes, team and company settings.",
        ],
      },
      {
        heading: "Account and access",
        paragraphs: [
          "Using the business features requires an account and a company created by Kornizo.",
          "An account alone does not grant access to the application. A trial request is reviewed by the Kornizo team and access opens only after approval. Public self-service company signup is not open.",
          "You are responsible for keeping your credentials safe and for the actions of the members you add to your company.",
        ],
      },
      {
        heading: "The 14-day trial",
        paragraphs: [
          "When your request is approved and your account is ready, you receive 14 days of full access to Kornizo Standard. The trial starts when the account becomes ready — not when the request is submitted.",
          "The trial contains the same features as the full plan. No feature is restricted during the trial.",
          "When the trial ends, day-to-day access to the application stops. Your company's data is kept and is not deleted. To continue, contact us.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "At this stage Kornizo has no self-service payment, automatic subscription or billing portal. Activating a customer after the trial is done manually by the Kornizo team following a conversation with you.",
          "Prices and commercial terms are agreed separately and are not published on this page.",
        ],
      },
      {
        heading: "Your data",
        paragraphs: [
          "The business data you enter into Kornizo remains your company's data.",
          "You are responsible for the accuracy of the data you enter and for the lawfulness of its use — including your own customers' data.",
          "How we handle data is described in the Privacy Policy.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You may not attempt to access another company's data, circumvent access controls, upload unlawful content, or disrupt the service for others.",
        ],
      },
      {
        heading: "Suspension",
        paragraphs: [
          "Kornizo may suspend an organization's access for operational reasons or in case of a breach of these terms. Suspension stops access; it deletes no data. When the suspension is lifted, access returns.",
        ],
      },
      {
        heading: "Availability",
        paragraphs: [
          "Kornizo is a product under active development. We promise no specific level of availability, response time or recovery target, because no such service agreement has been established yet.",
          "Planned interruptions may occur for maintenance and updates.",
        ],
      },
      {
        heading: "Changes to the service and to these terms",
        paragraphs: [
          "The product continues to develop: features may be added or changed. Additional plans may be introduced over time; none is promised by name, price or date.",
          "When we change this text substantively we will update the date above.",
        ],
      },
      {
        heading: "Liability and governing law",
        paragraphs: [
          "Limitations of liability, warranties, and the applicable law and jurisdiction will be completed on this page after legal review. We are not inventing them here.",
        ],
      },
    ],
  },
};

export const legalContent: Record<"sq" | "en", LocaleLegal> = { sq, en };

export type LegalDocumentId = "privacy" | "terms";
