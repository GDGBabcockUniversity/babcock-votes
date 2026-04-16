export const DEPARTMENTS = [
  { id: "accounting", name: "Accounting" },
  { id: "agriculture", name: "Agriculture" },
  { id: "biochemistry", name: "Biochemistry" },
  { id: "business_admin", name: "Business Administration" },
  { id: "computer_science", name: "Computer Science" },
  { id: "economics", name: "Economics" },
  { id: "english", name: "English" },
  { id: "history", name: "History" },
  { id: "international_relations", name: "International Relations" },
  { id: "law", name: "Law" },
  { id: "mass_comm", name: "Mass Communication" },
  { id: "mathematics", name: "Mathematics" },
  { id: "microbiology", name: "Microbiology" },
  { id: "nursing", name: "Nursing" },
  { id: "political_science", name: "Political Science" },
  { id: "public_health", name: "Public Health" },
  { id: "software_engineering", name: "Software Engineering" },
] as const;

export const LEVELS = ["100", "200", "300", "400", "500", "600"] as const;

export const SCHOOL_DOMAIN = "babcock.edu.ng";

export const CREDENTIALS = {
  firebase: {
    apiKey: "AIzaSyDIJKNJWVySg7DOSAphkj5Fe_hdfIzLyho",
    authDomain: "babcock-votes.firebaseapp.com",
    projectId: "babcock-votes",
    storageBucket: "babcock-votes.firebasestorage.app",
    messagingSenderId: "386049332302",
    appId: "1:386049332302:web:d037d90c8303a58daa1f1f",
  },
};

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
    users: "/admin/users",
    eligibleVoters: "/admin/eligible-voters",
  },
} as const;
