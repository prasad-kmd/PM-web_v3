"use client";

import {
  contactLinks,
  education,
  experience,
  interests,
  languages,
  personalDetails,
  resumeProfile,
} from "@/lib/resume-data";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";

const profileStats = [
  { label: "Workplaces", value: experience.length },
  { label: "Qualifications", value: education.length },
  { label: "Interests", value: interests.length },
  { label: "Languages", value: languages.length },
];

export function ResumeApp({ onNavigateHome }: { onNavigateHome?: () => void }) {
  return (
    <div className="resume-app">
      <WindowBreadcrumb
        items={[{ label: "Resume" }]}
        onHomeClick={onNavigateHome}
      />

      <div className="resume-content">
        <header className="resume-hero">
          <div className="resume-monogram" aria-hidden="true">
            PM
          </div>
          <div className="resume-identity">
            <p className="resume-eyebrow">{resumeProfile.role}</p>
            <h1>{resumeProfile.name}</h1>
            <p className="resume-status">{resumeProfile.status}</p>
            <p className="resume-tagline">{resumeProfile.tagline}</p>
            <p className="resume-summary">{resumeProfile.summary}</p>
            <div
              className="resume-contact-links"
              aria-label="Contact and social links"
            >
              {contactLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={
                    link.href.startsWith("mailto:") ? undefined : "_blank"
                  }
                  rel={
                    link.href.startsWith("mailto:") ? undefined : "noreferrer"
                  }
                >
                  {link.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </header>

        <dl className="resume-stat-grid" aria-label="Profile overview">
          {profileStats.map((stat) => (
            <div className="resume-stat" key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{String(stat.value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>

        <div className="resume-columns">
          <div className="resume-primary-column">
            <section
              className="resume-section"
              id="resume-projects"
              aria-labelledby="projects-heading"
            >
              <div className="resume-section-heading">
                <div>
                  <p className="resume-section-index">01 / Selected work</p>
                  <h2 id="projects-heading">Projects</h2>
                </div>
                <span className="resume-section-count">00</span>
              </div>
              <div className="resume-project-empty">
                <p>Project case studies are being curated.</p>
                <span>
                  No project summaries are published here until their details
                  and outcomes have been verified.
                </span>
              </div>
            </section>

            <section
              className="resume-section"
              id="resume-experience"
              aria-labelledby="experience-heading"
            >
              <div className="resume-section-heading">
                <div>
                  <p className="resume-section-index">02 / Work history</p>
                  <h2 id="experience-heading">Experience</h2>
                </div>
              </div>
              <div className="resume-timeline">
                {experience.map((entry) => (
                  <article
                    className="resume-experience"
                    key={`${entry.org}-${entry.role}`}
                  >
                    <time>{entry.period}</time>
                    <h3>{entry.role}</h3>
                    <p className="resume-experience-org">
                      {entry.org} · {entry.location}
                    </p>
                    <p className="resume-experience-summary">{entry.summary}</p>
                    <ul>
                      {entry.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="resume-aside">
            <section
              className="resume-section resume-aside-section"
              id="resume-details"
              aria-labelledby="details-heading"
            >
              <p className="resume-section-index">03 / At a glance</p>
              <h2 id="details-heading">Personal details</h2>
              <dl className="resume-details-list">
                {personalDetails.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section
              className="resume-section resume-aside-section"
              id="resume-education"
              aria-labelledby="education-heading"
            >
              <p className="resume-section-index">04 / Learning</p>
              <h2 id="education-heading">Education</h2>
              <ol className="resume-education-list">
                {education.map((entry) => (
                  <li key={entry.credential}>
                    <h3>{entry.credential}</h3>
                    <p>{entry.institution}</p>
                    <span>
                      {entry.location} · {entry.period}
                    </span>
                    <small>{entry.note}</small>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="resume-section resume-aside-section"
              id="resume-interests"
              aria-labelledby="interests-heading"
            >
              <p className="resume-section-index">05 / Areas of interest</p>
              <h2 id="interests-heading">Interests</h2>
              <ul className="resume-interest-list">
                {interests.map((interest) => (
                  <li key={interest}>{interest}</li>
                ))}
              </ul>
            </section>

            <section
              className="resume-section resume-aside-section"
              id="resume-languages"
              aria-labelledby="languages-heading"
            >
              <p className="resume-section-index">06 / Communication</p>
              <h2 id="languages-heading">Languages</h2>
              <ul className="resume-language-list">
                {languages.map((language) => (
                  <li key={language.name}>
                    <span>{language.name}</span>
                    <span>{language.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <footer className="resume-footer" id="resume-contact">
          <div>
            <p className="resume-section-index">Get in touch</p>
            <h2>Let’s build something together.</h2>
          </div>
          <a href="mailto:prasad.madhuranga@pm.me">
            Contact Prasad <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
