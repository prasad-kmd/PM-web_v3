"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Briefcase01Icon,
  Clock01Icon,
  FileDownloadIcon,
  Folder01Icon,
  Github01Icon,
  Linkedin01Icon,
  NewTwitterIcon,
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
} from "@/lib/resume-data";

const RESUME_PROJECTS_LIMIT = 3;

type ProjectState = {
  status: "loading" | "ready" | "error";
  items: LatestItem[];
  total: number;
  configured: boolean;
};

/**
 * The CV is a file, not a build step: drop it at `public/cv/resume-v2.pdf` and
 * this link opens it in a new tab, the way v1's `/portfolio` hero does.
 */
const CV_HREF = "/cv/resume-v2.pdf";

const pad = (value: number) => String(value).padStart(2, "0");

let cachedProjectsState: ProjectState | null = null;
let cachedCvReadyState: boolean | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("pm:content-cache-purged", () => {
    cachedProjectsState = null;
  });
}

/**
 * Résumé (R1 · Beacon).
 *
 * Layout notes:
 * - One scrollbar. `.resume-app` fills the window, `.window-body` stops scrolling
 *   while it is mounted (`:has()` in globals.css), and `.resume-scroll` is the
 *   only scroller. The aside is `position: sticky` inside it.
 * - Projects come directly from `/projects` via `GET /api/latest?types=projects&limit=3`
 *   (up to the latest 3 published items), and the header project counter reflects
 *   the live total count in `/projects`.
 */
export function ResumeApp({ onNavigateHome }: { onNavigateHome?: () => void }) {
  const [projects, setProjects] = useState<ProjectState>(
    () =>
      cachedProjectsState ?? {
        status: "loading",
        items: [],
        total: 0,
        configured: true,
      },
  );
  // The CV may not be in the repo yet. The probe decides whether a click opens
  // the file or explains, in a toast, that it has not been uploaded — the
  // button stays a button either way.
  const [cvReady, setCvReady] = useState<boolean | null>(cachedCvReadyState);

  useEffect(() => {
    if (cachedCvReadyState !== null) {
      setCvReady(cachedCvReadyState);
      return;
    }
    const controller = new AbortController();
    fetch(CV_HREF, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        cachedCvReadyState = response.ok;
        setCvReady(response.ok);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          cachedCvReadyState = false;
          setCvReady(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (cachedProjectsState) {
      setProjects(cachedProjectsState);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/latest?types=projects&limit=${RESUME_PROJECTS_LIMIT}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(
        (data: {
          items?: LatestItem[];
          total?: number;
          configured?: boolean;
          error?: string | null;
        }) => {
          if (controller.signal.aborted) return;
          const items = (data.items ?? []).slice(0, RESUME_PROJECTS_LIMIT);
          const total =
            typeof data.total === "number" && Number.isFinite(data.total)
              ? data.total
              : items.length;
          const configured = data.configured !== false;
          const nextState: ProjectState = {
            status: data.error === "unavailable" ? "error" : "ready",
            items,
            total,
            configured,
          };
          if (nextState.status === "ready") {
            cachedProjectsState = nextState;
          }
          setProjects(nextState);
        },
      )
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects({
          status: "error",
          items: [],
          total: 0,
          configured: true,
        });
      });
    return () => controller.abort();
  }, []);

  const shown = projects.items;
  const isLoading = projects.status === "loading";

  // Header stats: the project count reflects the live total published items in `/projects`.
  const stats = [
    {
      label: "Projects",
      display: isLoading ? "—" : pad(projects.total),
    },
    { label: "Workplaces", display: pad(experience.length) },
    { label: "Qualifications", display: pad(education.length) },
    { label: "Languages", display: pad(languages.length) },
  ];

  return (
    <div className="resume-app">
      <WindowBreadcrumb
        items={[{ label: "Resume" }]}
        onHomeClick={onNavigateHome}
      />

      <div className="resume-scroll">
        <div className="resume-sheet">
          <BeamCard className="resume-hero" tone="spectrum" intro>
            <div className="resume-hero-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="resume-portrait"
                src="/images/profile-placeholder.jpg"
                alt="Portrait of Prasad Madhuranga"
                width={76}
                height={76}
              />
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
                    ) : link.label === "Twitter" ? (
                      <HugeiconsIcon
                        icon={NewTwitterIcon}
                        strokeWidth={2}
                        size={13}
                        aria-hidden
                      />
                    ) : link.label === "LinkedIn" ? (
                      <HugeiconsIcon
                        icon={Linkedin01Icon}
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
                  <dd>{stat.display}</dd>
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
                    aria-label={
                      isLoading
                        ? "Loading project count"
                        : `${projects.total} projects`
                    }
                  >
                    {isLoading ? "—" : pad(projects.total)}
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
                  ) : shown.length > 0 ? (
                    <>
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        strokeWidth={2}
                        size={12}
                        aria-hidden
                      />
                      {projects.total > shown.length
                        ? `Latest ${shown.length} of ${projects.total} published projects`
                        : "Newest published projects from the index"}
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        strokeWidth={2}
                        size={12}
                        aria-hidden
                      />
                      {!projects.configured
                        ? "Projects collection is not connected yet"
                        : projects.status === "error"
                          ? "Projects are temporarily unavailable"
                          : "No published projects yet"}
                    </>
                  )}
                </p>

                <div className="resume-projects">
                  {isLoading ? (
                    [0, 1, 2].map((index) => (
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
                  ) : shown.length > 0 ? (
                    shown.map((project) => (
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
                    ))
                  ) : (
                    <div className="resume-project resume-project-empty">
                      <div className="resume-project-main">
                        <h3>
                          {!projects.configured
                            ? "Collection not connected"
                            : projects.status === "error"
                              ? "Content is temporarily unavailable"
                              : "No projects published yet"}
                        </h3>
                        <p className="resume-project-summary">
                          {!projects.configured
                            ? "Published items in /projects will appear here automatically once the collection is connected."
                            : projects.status === "error"
                              ? "We couldn’t reach the projects index right now. Open /projects to try again."
                              : "New engineering builds and experiments will appear here as soon as they are published in /projects."}
                        </p>
                      </div>
                      <Link
                        className="resume-project-open"
                        href="/projects"
                        aria-label="Open Projects"
                      >
                        <HugeiconsIcon
                          icon={ArrowUpRight01Icon}
                          strokeWidth={2}
                          size={14}
                          aria-hidden
                        />
                      </Link>
                    </div>
                  )}
                </div>

                {shown.length > 0 ? (
                  <Link className="resume-more" href="/projects">
                    {projects.total > shown.length
                      ? `All ${projects.total} projects`
                      : "All projects"}
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
