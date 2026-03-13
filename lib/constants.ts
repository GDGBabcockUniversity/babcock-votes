export const SCHOOL_EMAIL_DOMAIN = "@student.babcock.edu.ng";

export const DEPARTMENTS = [
  "Accounting",
  "Agriculture",
  "Biochemistry",
  "Business Administration",
  "Computer Science",
  "Economics",
  "English",
  "History",
  "International Relations",
  "Law",
  "Mass Communication",
  "Mathematics",
  "Microbiology",
  "Nursing",
  "Political Science",
  "Public Health",
  "Software Engineering",
] as const;

export const LEVELS = ["100", "200", "300", "400", "500", "600"] as const;

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
  },
} as const;