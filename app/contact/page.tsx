import type { Metadata } from "next";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import { ContactForm } from "./ContactForm";
import { EmailReveal } from "./EmailReveal";
import { getSiteUrl } from "@/lib/site";
import { OG_IMAGE_SIZE, ogImageUrl } from "@/lib/content-metadata";

const description =
  "Get in touch with Prasad Madhuranga about engineering, ideas, or collaboration.";
export function generateMetadata(): Metadata {
  const image = ogImageUrl("Contact", description, "pages");
  return {
    title: "Contact",
    description,
    alternates: { canonical: `${getSiteUrl()}/contact` },
    openGraph: {
      title: "Contact",
      description,
      url: `${getSiteUrl()}/contact`,
      images: [{ url: image, ...OG_IMAGE_SIZE }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
export default function ContactPage() {
  const key =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    (process.env.NODE_ENV !== "production" ? "1x00000000000000000000AA" : "");
  return (
    <main className="cms-app">
      <WindowBreadcrumb items={[{ label: "Contact" }]} />
      <div className="cms-page">
        <header className="cms-heading">
          <div>
            <p className="cms-eyebrow">Get in touch</p>
            <h1>Let’s start a conversation.</h1>
            <p>
              Have a question, an idea or a project in mind? Send a note below.
            </p>
          </div>
        </header>
        <div className="contact-layout">
          <ContactForm siteKey={key} />
          <aside className="contact-aside">
            <div className="contact-aside-icon" aria-hidden="true">
              ✉
            </div>
            <h2>Prefer email?</h2>
            <p>
              You can also reach me directly. I’ll get back to you as soon as I
              can.
            </p>
            <EmailReveal siteKey={key} />
            <div className="contact-aside-divider" />
            <p>Based in Kandy, Sri Lanka.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
