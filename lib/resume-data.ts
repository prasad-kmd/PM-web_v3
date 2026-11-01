export const resumeProfile = {
  name: "Prasad Madhuranga",
  shortName: "Prasad M.",
  role: "Mechanical + Mechatronics Engineer",
  status:
    "BSc (Hons) Mechatronics — reading at The Open University of Sri Lanka",
  tagline: "Machines, firmware and the seam between them.",
  location: "Kandy, Sri Lanka",
  availability: "Open to collaboration",
  summary:
    "A motivated engineer with a foundation in mechanical engineering and a practical interest in automation and robotics. This is a working record of my education, experience, interests, and selected work.",
};

export const personalDetails = [
  { label: "Name", value: resumeProfile.name },
  { label: "Role", value: resumeProfile.role },
  { label: "Base", value: resumeProfile.location },
  { label: "Availability", value: resumeProfile.availability },
];

export const education = [
  {
    credential: "BSc (Hons) in Mechatronics Engineering",
    institution: "The Open University of Sri Lanka",
    location: "Sri Lanka",
    period: "Reading",
    note: "Undergraduate programme across mechanics, electronics, control, and computing.",
  },
  {
    credential: "National Certificate in Engineering Draftsmanship (NCED)",
    institution: "Technical College, Pathadumbara",
    location: "Kandy, Sri Lanka",
    period: "Completed · 2021",
    note: "Technical drawing to construction-document standard.",
  },
  {
    credential: "G.C.E. Advanced Level",
    institution: "Sri Rahula College",
    location: "Katugasthota, Sri Lanka",
    period: "Completed · 2019",
    note: "Secondary education completed with the Advanced Level examinations.",
  },
];

export const experience = [
  {
    role: "Trainee Draughtsperson",
    org: "Department of Engineering Services",
    location: "Central Province Council, Kandy",
    period: "Jan — Jun 2024",
    summary:
      "Prepared technical drawings for public building work at the provincial engineering office.",
    points: [
      "Created detailed construction drawings and schematics using CAD software.",
      "Worked with engineers to check designs against project requirements and standards.",
      "Assisted with site inspections and field verification of drawings.",
    ],
  },
  {
    role: "Customer Service Assistant",
    org: "People’s Bank",
    location: "Mutwal, Sri Lanka",
    period: "Jun — Oct 2024",
    summary: "Frontline customer service at a state bank branch.",
    points: [
      "Handled customer inquiries, explained products and services, and helped resolve issues.",
    ],
  },
  {
    role: "Cashier",
    org: "Hemantha Glass Center",
    location: "Anamaduwa, Sri Lanka",
    period: "Mar — May 2022",
    summary: "Counter service at a provincial glass and glazing supplier.",
    points: ["Helped customers and processed sales at the counter."],
  },
];

export const interests = [
  "Bio-inspired robotics",
  "Autonomous navigation",
  "Renewable energy systems",
  "Smart materials",
  "Artificial intelligence and machine vision",
  "Mobile robotics",
];

export const languages = [
  { name: "Sinhala", level: "Native" },
  { name: "English", level: "Professional" },
];

export const contactLinks = [
  { label: "GitHub", href: "https://github.com/prasad-kmd" },
  { label: "Twitter", href: "https://twitter.com/prasadmadhuran1" },
  { label: "LinkedIn", href: "https://linkedin.com/in/prasad-madhuranga" },
  { label: "Contact", href: "/contact" },
];
