"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Bookmark01Icon,
  Briefcase01Icon,
  Clock01Icon,
  FileDownloadIcon,
  Folder01Icon,
  Github01Icon,
  Link01Icon,
  Location01Icon,
  Mail01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { BeamCard } from "@/components/ui/beam-card";
import { WindowBreadcrumb } from "@/components/system/WindowBreadcrumb";
import type { LatestItem } from "@/lib/latest-types";
import {
  contactLinks,
  education,
  experience,
  interests,
  languages,
  personalDetails,
  resumeProfile,
  selectedProjects,
} from "@/lib/resume-data";

type ProjectState = {
  status: "loading" | "ready" | "error";
  items: LatestItem[];
  /** `curated` = the static fallback in lib/resume-data, not Notion. */
  source: "live" | "curated";
};

/**
 * The CV is a file, not a build step: drop it at `public/cv/resume-v2.pdf` and
 * this link opens it in a new tab, the way v1's `/portfolio` hero does.
 */
const CV_HREF = "/cv/resume-v2.pdf";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Résumé (R1 · Beacon).
 *
 * Layout notes:
 * - One scrollbar. `.resume-app` fills the window, `.window-body` stops scrolling
 *   while it is mounted (`:has()` in globals.css), and `.resume-scroll` is the
 *   only scroller. The aside is `position: sticky` inside it.
 * - Projects come from `GET /api/latest?types=projects` (the same projection the
 *   desktop widget uses). Until that resolves — or if Notion is not configured —
 *   `selectedProjects` renders and the section says which one is on screen.
 */
export function ResumeApp({ onNavigateHome }: { onNavigateHome?: () => void }) {
  const [projects, setProjects] = useState<ProjectState>({
    status: "loading",
    items: [],
    source: "curated",
  });
  // The CV may not be in the repo yet. The probe decides whether a click opens
  // the file or explains, in a toast, that it has not been uploaded — the
  // button stays a button either way.
  const [cvReady, setCvReady] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(CV_HREF, { method: "HEAD", signal: controller.signal })
      .then((response) => setCvReady(response.ok))
      .catch(() => setCvReady(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/latest?types=projects&limit=4", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { items?: LatestItem[]; error?: string | null }) => {
        if (controller.signal.aborted) return;
        const items = data.items ?? [];
        if (items.length) {
          setProjects({ status: "ready", items, source: "live" });
          return;
        }
        setProjects({
          status: data.error === "unavailable" ? "error" : "ready",
          items: selectedProjects,
          source: "curated",
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects({
          status: "error",
          items: selectedProjects,
          source: "curated",
        });
      });
    return () => controller.abort();
  }, []);

  const shown = projects.items.length ? projects.items : selectedProjects;
  const isLoading = projects.status === "loading";

  // Header stats: the project count is the one number that changes as the
  // collection grows, so it leads and replaces the static interest count.
  const stats = [
    { label: "Projects", value: shown.length },
    { label: "Workplaces", value: experience.length },
    { label: "Qualifications", value: education.length },
    { label: "Languages", value: languages.length },
  ];

  return (
    <div className="resume-app">
      <WindowBreadcrumb
        items={[{ label: "Resume" }]}
        onHomeClick={onNavigateHome}
      />

      <div className="resume-scroll">
        <div className="resume-sheet">
          <BeamCard className="resume-hero" intro>
            <div className="resume-hero-top">
              <div className="resume-monogram" aria-hidden="true">
                PM
              </div>
              <div className="resume-identity">
                <p className="resume-eyebrow">{resumeProfile.role}</p>
                <h1>{resumeProfile.name}</h1>
                <p className="resume-status">{resumeProfile.status}</p>
                <p className="resume-tagline">{resumeProfile.tagline}</p>
                <p className="resume-location">
                  <HugeiconsIcon
                    icon={Location01Icon}
                    strokeWidth={2}
                    size={13}
                    aria-hidden
                  />
                  {resumeProfile.location} · {resumeProfile.timezone}
                  <span className="resume-sep" aria-hidden="true" />
                  <span className="resume-availability">
                    <span aria-hidden="true" />
                    {resumeProfile.availability}
                  </span>
                </p>
              </div>
            </div>

            <p className="resume-summary">{resumeProfile.summary}</p>

            <div
              className="resume-contact-links"
              aria-label="Contact and social links"
            >
              <a
                className="resume-cv"
                href={CV_HREF}
                target="_blank"
                rel="noopener noreferrer"
                title="Opens the CV in a new tab"
                onClick={(event) => {
                  if (cvReady === false) {
                    event.preventDefault();
                    toast.error("Unavailable", {
                      description:
                        "CV isn't available at the moment. Please check later.",
                    });
                    return;
                  }
                  toast.success("Opening CV in a new tab…");
                }}
              >
                <HugeiconsIcon
                  icon={FileDownloadIcon}
                  strokeWidth={2}
                  size={13}
                  aria-hidden
                />
                View / Download CV
              </a>
              {contactLinks.map((link) =>
                link.href.startsWith("/") ? (
                  <Link key={link.label} href={link.href}>
                    {link.label === "Contact" ? (
                      <HugeiconsIcon
                        icon={Mail01Icon}
                        strokeWidth={2}
                        size={13}
                        aria-hidden
                      />
                    ) : null}
                    {link.label}
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      size={12}
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label === "GitHub" ? (
                      <HugeiconsIcon
                        icon={Github01Icon}
                        strokeWidth={2}
                        size={13}
                        aria-hidden
                      />
                    ) : link.label === "LinkedIn" ? (
                      <HugeiconsIcon
                        icon={Link01Icon}
                        strokeWidth={2}
                        size={13}
                        aria-hidden
                      />
                    ) : null}
                    {link.label}
                    <HugeiconsIcon
                      icon={ArrowUpRight01Icon}
                      strokeWidth={2}
                      size={12}
                      aria-hidden
                    />
                  </a>
                ),
              )}
            </div>

            <dl className="resume-stat-grid" aria-label="Profile overview">
              {stats.map((stat) => (
                <div className="resume-stat" key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{pad(stat.value)}</dd>
                </div>
              ))}
            </dl>
          </BeamCard>

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
                  <span
                    className="resume-section-count"
                    aria-label={`${shown.length} projects`}
                  >
                    {pad(shown.length)}
                  </span>
                </div>

                <p className="resume-section-source">
                  {isLoading ? (
                    <>
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        strokeWidth={2}
                        size={12}
                        className="resume-spin"
                        aria-hidden
                      />
                      Loading projects…
                    </>
                  ) : projects.source === "live" ? (
                    <>
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        strokeWidth={2}
                        size={12}
                        aria-hidden
                      />
                      Newest published projects, straight from the index
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon
                        icon={Bookmark01Icon}
                        strokeWidth={2}
                        size={12}
                        aria-hidden
                      />
                      Curated selection — the Projects collection is not
                      connected in this environment
                    </>
                  )}
                </p>

                <div className="resume-projects">
                  {isLoading
                    ? [0, 1].map((index) => (
                        <div
                          className="resume-project is-skeleton"
                          key={index}
                          aria-hidden="true"
                        >
                          <span
                            className="resume-skeleton-line"
                            style={{ width: "46%" }}
                          />
                          <span
                            className="resume-skeleton-line"
                            style={{ width: "78%" }}
                          />
                          <span
                            className="resume-skeleton-line"
                            style={{ width: "62%" }}
                          />
                        </div>
                      ))
                    : shown.map((project) => (
                        <BeamCard
                          className="resume-project"
                          key={`${project.type}-${project.id}`}
                        >
                          <div className="resume-project-main">
                            <h3>
                              <Link href={project.href}>{project.title}</Link>
                            </h3>
                            <p className="resume-project-meta">
                              <span className="resume-chip">
                                {project.category || project.typeLabel}
                              </span>
                              {project.dateLabel ? (
                                <span className="resume-project-time">
                                  <HugeiconsIcon
                                    icon={Clock01Icon}
                                    strokeWidth={2}
                                    size={12}
                                    aria-hidden
                                  />
                                  {project.dateLabel}
                                </span>
                              ) : null}
                              {project.readTime ? (
                                <span className="resume-project-time">
                                  {project.readTime} min read
                                </span>
                              ) : null}
                            </p>
                            {project.summary ? (
                              <p className="resume-project-summary">
                                {project.summary}
                              </p>
                            ) : null}
                          </div>
                          <Link
                            className="resume-project-open"
                            href={project.href}
                            aria-label={`Open ${project.title}`}
                          >
                            <HugeiconsIcon
                              icon={ArrowUpRight01Icon}
                              strokeWidth={2}
                              size={14}
                              aria-hidden
                            />
                          </Link>
                        </BeamCard>
                      ))}
                </div>

                {projects.source === "live" ? (
                  <Link className="resume-more" href="/projects">
                    All projects
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      strokeWidth={2}
                      size={13}
                      aria-hidden
                    />
                  </Link>
                ) : null}
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
                  <span className="resume-section-count">
                    {pad(experience.length)}
                  </span>
                </div>
                <div className="resume-timeline">
                  {/* No beam here: experience entries are a timeline, not
                      cards — they have no border for a glow to travel along. */}
                  {experience.map((entry) => (
                    <div
                      className="resume-experience"
                      key={`${entry.org}-${entry.role}`}
                    >
                      <div className="resume-experience-head">
                        <time>{entry.period}</time>
                        <h3>{entry.role}</h3>
                      </div>
                      <p className="resume-experience-org">
                        <HugeiconsIcon
                          icon={Briefcase01Icon}
                          strokeWidth={2}
                          size={12}
                          aria-hidden
                        />
                        {entry.org} · {entry.location}
                      </p>
                      <p className="resume-experience-summary">
                        {entry.summary}
                      </p>
                      <ul>
                        {entry.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="resume-aside" aria-label="Resume details">
              <BeamCard
                as="section"
                className="resume-aside-section"
                id="resume-details"
              >
                <p className="resume-section-index">03 / At a glance</p>
                <h2>Personal details</h2>
                <dl className="resume-details-list">
                  {personalDetails.map((detail) => (
                    <div key={detail.label}>
                      <dt>{detail.label}</dt>
                      <dd>{detail.value}</dd>
                    </div>
                  ))}
                </dl>
              </BeamCard>

              <BeamCard
                as="section"
                className="resume-aside-section"
                id="resume-education"
              >
                <p className="resume-section-index">04 / Learning</p>
                <h2>Education</h2>
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
              </BeamCard>

              <BeamCard
                as="section"
                className="resume-aside-section"
                id="resume-interests"
              >
                <p className="resume-section-index">05 / Areas of interest</p>
                <h2>Interests</h2>
                <ul className="resume-interest-list">
                  {interests.map((interest) => (
                    <li key={interest}>{interest}</li>
                  ))}
                </ul>
              </BeamCard>

              <BeamCard
                as="section"
                className="resume-aside-section"
                id="resume-languages"
              >
                <p className="resume-section-index">06 / Communication</p>
                <h2>Languages</h2>
                <ul className="resume-language-list">
                  {languages.map((language) => (
                    <li key={language.name}>
                      <span>{language.name}</span>
                      <span>{language.level}</span>
                    </li>
                  ))}
                </ul>
              </BeamCard>
            </aside>
          </div>

          <BeamCard className="resume-footer" id="resume-contact">
            <div>
              <p className="resume-section-index">Get in touch</p>
              <h2>Let’s build something together.</h2>
            </div>
            <Link href="/contact">
              Contact Prasad
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                size={13}
                aria-hidden
              />
            </Link>
          </BeamCard>
        </div>
      </div>
    </div>
  );
}
