import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ReaderBody,
  ReaderDocumentActions,
  ReaderFooter,
  ReaderLayout,
  ReaderOutline,
  ReaderProgress,
  ReaderProvider,
  ReaderScrollToTop,
  ReaderSections,
  type ReaderHeading,
} from "@/components/notion/ReaderControls";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";
import {
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_EFFECTIVE_DATE_ISO,
  LEGAL_HUB_ROUTE,
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  LEGAL_VERSION,
  VISITOR_COOKIE_REGISTER,
  getLegalDocument,
  type LegalDocumentId,
} from "@/lib/legal";
import { SITE_NAME, contactHref, getSiteUrl } from "@/lib/site";
import { CookieNoticeButton } from "./CookieNotice";
import { LegalHashScroll } from "./LegalHashScroll";
import { LEGAL_DOCUMENT_SECTIONS, type LegalSection } from "./legal-documents";

function buildLegalMetadata({
  title,
  description,
  route,
}: {
  title: string;
  description: string;
  route: string;
}): Metadata {
  const url = `${getSiteUrl()}${route}`;
  const image = ogImageUrl(title, description, "legal");
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function legalHubMetadata(): Metadata {
  return buildLegalMetadata({
    title: "Legal",
    description:
      "Privacy Policy, Terms and Conditions, Disclaimer and cookie information for Prasad M.’s workspace.",
    route: LEGAL_HUB_ROUTE,
  });
}

export function legalDocumentMetadata(id: LegalDocumentId): Metadata {
  const document = getLegalDocument(id);
  return buildLegalMetadata({
    title: document.title,
    description: document.description,
    route: document.route,
  });
}

function LegalSwitcher({ current }: { current?: LegalDocumentId }) {
  return (
    <nav className="legal-switcher" aria-label="Legal documents">
      <Link
        href={LEGAL_HUB_ROUTE}
        aria-current={!current ? "page" : undefined}
        className={!current ? "is-active" : undefined}
      >
        Overview
      </Link>
      {LEGAL_DOCUMENTS.map((document) => (
        <Link
          key={document.id}
          href={document.route}
          aria-current={current === document.id ? "page" : undefined}
          className={current === document.id ? "is-active" : undefined}
        >
          {document.shortTitle}
        </Link>
      ))}
      <Link href="/privacy-policy#cookies-and-browser-storage">
        Cookie details
      </Link>
    </nav>
  );
}

function LegalHeader({
  eyebrow,
  title,
  lede,
  current,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  current?: LegalDocumentId;
}) {
  return (
    <header className="rdr-head legal-head">
      <p className="rdr-chip">
        <span>{eyebrow}</span>
        <span className="legal-version">Version {LEGAL_VERSION}</span>
      </p>
      <h1>{title}</h1>
      <p className="rdr-deck">{lede}</p>
      <div className="rdr-meta legal-meta">
        <span>
          <HugeiconsIcon icon={Calendar03Icon} size={14} aria-hidden />
          Effective{" "}
          <time dateTime={LEGAL_EFFECTIVE_DATE_ISO}>
            {LEGAL_EFFECTIVE_DATE}
          </time>
        </span>
        <span>
          Updated{" "}
          <time dateTime={LEGAL_LAST_UPDATED_ISO}>{LEGAL_LAST_UPDATED}</time>
        </span>
      </div>
      <LegalSwitcher current={current} />
    </header>
  );
}

function Sections({ sections }: { sections: readonly LegalSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section
          className={`legal-section legal-section-depth-${section.depth}`}
          key={section.id}
          aria-labelledby={section.id}
        >
          {section.depth === 0 ? (
            <h2 id={section.id}>{section.label}</h2>
          ) : (
            <h3 id={section.id}>{section.label}</h3>
          )}
          {section.body}
        </section>
      ))}
    </>
  );
}

export function LegalDocumentPage({ id }: { id: LegalDocumentId }) {
  const document = getLegalDocument(id);
  const sections = LEGAL_DOCUMENT_SECTIONS[id];
  const headings: ReaderHeading[] = sections.map((section) => ({
    id: section.id,
    label: section.label,
    depth: section.depth,
  }));
  const otherDocuments = LEGAL_DOCUMENTS.filter((entry) => entry.id !== id);

  return (
    <main className="cms-app rdr-app legal-app">
      <ReaderProvider headings={headings}>
        <WindowBreadcrumb
          items={[
            { label: "Legal", href: LEGAL_HUB_ROUTE },
            { label: document.title },
          ]}
          actions={<ReaderDocumentActions />}
        />
        <ReaderProgress />
        <ReaderLayout>
          <article className="rdr-doc legal-doc">
            <LegalHeader
              eyebrow="Legal"
              title={document.title}
              lede={document.lede}
              current={id}
            />
            <ReaderBody>
              <div className="legal-body">
                <Sections sections={sections} />
              </div>
            </ReaderBody>
            <footer className="legal-end">
              <p>
                Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE} ·
                Last updated {LEGAL_LAST_UPDATED}
              </p>
              <nav aria-label="Other legal documents">
                {otherDocuments.map((entry) => (
                  <Link key={entry.id} href={entry.route}>
                    {entry.title}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      aria-hidden
                    />
                  </Link>
                ))}
              </nav>
            </footer>
          </article>
          <aside className="rdr-toc" aria-label="On this page">
            <ReaderOutline />
          </aside>
        </ReaderLayout>
        <ReaderSections />
        <ReaderScrollToTop />
        <ReaderFooter collectionLabel="Legal" hasNext={false} hasPrev={false} />
        <LegalHashScroll />
      </ReaderProvider>
    </main>
  );
}

const HUB_HEADINGS: ReaderHeading[] = [
  { id: "documents", label: "Documents", depth: 0 },
  { id: "cookies-and-storage", label: "Cookies & storage", depth: 0 },
  { id: "questions", label: "Questions", depth: 0 },
];

export function LegalHubPage() {
  return (
    <main className="cms-app rdr-app legal-app">
      <ReaderProvider headings={HUB_HEADINGS}>
        <WindowBreadcrumb
          items={[{ label: "Legal" }]}
          actions={<ReaderDocumentActions />}
        />
        <ReaderProgress />
        <ReaderLayout>
          <article className="rdr-doc legal-doc">
            <LegalHeader
              eyebrow="Legal"
              title="Legal"
              lede="The privacy, terms and disclaimer pages for this workspace, written for the features the current site actually has."
            />
            <ReaderBody>
              <div className="legal-body">
                <section className="legal-section" aria-labelledby="documents">
                  <h2 id="documents">Documents</h2>
                  <p>
                    These pages are versioned together. The Privacy Policy is
                    the source for the cookie and browser-storage register; the
                    Terms govern use of the site; and the Disclaimer explains
                    the limits of the engineering material published here.
                  </p>
                  <div className="legal-document-list">
                    {LEGAL_DOCUMENTS.map((document) => (
                      <Link
                        className="legal-document-card"
                        href={document.route}
                        key={document.id}
                      >
                        <span>
                          <strong>{document.title}</strong>
                          <small>{document.description}</small>
                          <small>
                            Version {LEGAL_VERSION} · Updated{" "}
                            {LEGAL_LAST_UPDATED}
                          </small>
                        </span>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={17}
                          aria-hidden
                        />
                      </Link>
                    ))}
                  </div>
                </section>

                <section
                  className="legal-section"
                  aria-labelledby="cookies-and-storage"
                >
                  <h2 id="cookies-and-storage">Cookies &amp; storage</h2>
                  <p>
                    The workspace currently uses{" "}
                    {VISITOR_COOKIE_REGISTER.length} visitor cookie names for
                    appearance, slideshow settings, commenter prefill and
                    remembering this notice. It also uses local and session
                    storage for window layout, saved items, reader preferences,
                    quiz results, comment drafts and avoiding a duplicate read
                    pulse in one session. There are no advertising cookies or
                    third-party analytics scripts.
                  </p>
                  <div className="legal-actions">
                    <Link
                      className="legal-action-link"
                      href="/privacy-policy#cookies-and-browser-storage"
                    >
                      View the full register
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={14}
                        aria-hidden
                      />
                    </Link>
                    <CookieNoticeButton />
                  </div>
                </section>

                <section className="legal-section" aria-labelledby="questions">
                  <h2 id="questions">Questions</h2>
                  <p>
                    For a privacy request, correction or question about these
                    pages, use the{" "}
                    <Link href={contactHref("Privacy")}>Contact page</Link> and
                    include enough detail to locate the relevant page or record.
                  </p>
                </section>
              </div>
            </ReaderBody>
          </article>
          <aside className="rdr-toc" aria-label="On this page">
            <ReaderOutline />
          </aside>
        </ReaderLayout>
        <ReaderSections />
        <ReaderScrollToTop />
        <ReaderFooter collectionLabel="Legal" hasNext={false} hasPrev={false} />
        <LegalHashScroll />
      </ReaderProvider>
    </main>
  );
}
