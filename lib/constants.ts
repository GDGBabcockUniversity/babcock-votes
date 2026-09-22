export const DEPARTMENTS = [
  { id: "accounting", name: "Accounting" },
  { id: "anatomy", name: "Anatomy" },
  { id: "agriculture", name: "Agriculture" },
  { id: "biochemistry", name: "Biochemistry" },
  { id: "business_admin", name: "Business Administration" },
  { id: "computer_science", name: "Computer Science" },
  { id: "economics", name: "Economics" },
  { id: "education", name: "Education" },
  { id: "english", name: "English" },
  { id: "history", name: "History" },
  { id: "international_relations", name: "International Relations" },
  { id: "law", name: "Law" },
  { id: "mass_comm", name: "Mass Communication" },
  { id: "mathematics", name: "Mathematics" },
  { id: "medicine", name: "Medicine" },
  { id: "microbiology", name: "Microbiology" },
  { id: "nursing", name: "Nursing" },
  { id: "political_science", name: "Political Science" },
  { id: "public_health", name: "Public Health" },
  { id: "software_engineering", name: "Software Engineering" },
] as const;

export const LEVELS = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "Part-Time",
  "Post-Graduate",
] as const;

export const SCHOOL_DOMAIN = "student.babcock.edu.ng";

/** XX/XXXX, or AA/XX/XXXX for part-time (e.g. 21/0456, PT/22/2222). */
export const MATRIC_REGEX = /^([a-zA-Z]{2}\/)?\d{2}\/\d{4}$/;

/** Domain used for fabricated part-time student accounts (email/password login). */
export const PART_TIME_EMAIL_DOMAIN = "parttime.babcockvotes.com";

export const PAGES = {
  auth: {
    login: "/login",
    register: "/register",
  },
  main: {
    home: "/",
    elections: "/elections",
    electionDetail: (id: string) => `/elections/${id}`,
    vote: (id: string) => `/elections/${id}/vote`,
    confirmation: (id: string) => `/elections/${id}/confirmation`,
  },
  admin: {
    dashboard: "/admin",
    elections: "/admin/elections",
    newElection: "/admin/elections/new",
    electionDetail: (id: string) => `/admin/elections/${id}`,
    electionResults: (id: string) => `/admin/elections/${id}/results`,
    electionAnalytics: (id: string) => `/admin/elections/${id}/analytics`,
    users: "/admin/users",
    eligibleVoters: "/admin/eligible-voters",
    liveResults: "/admin/live-results",
  },
} as const;
