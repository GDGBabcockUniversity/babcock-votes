import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDIJKNJWVySg7DOSAphkj5Fe_hdfIzLyho",
  authDomain: "babcock-votes.firebaseapp.com",
  projectId: "babcock-votes",
  storageBucket: "babcock-votes.firebasestorage.app",
  messagingSenderId: "386049332302",
  appId: "1:386049332302:web:d037d90c8303a58daa1f1f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const users = [
  {
    email: "admin@student.babcock.edu.ng",
    password: "admin123",
    profile: {
      email: "admin@student.babcock.edu.ng",
      fullName: "Admin User",
      matricNumber: "20/0001",
      sex: "male",
      department: "Computer Science",
      level: "400",
      role: "admin",
      createdAt: Timestamp.now(),
    },
  },
  {
    email: "voter@student.babcock.edu.ng",
    password: "voter123",
    profile: {
      email: "voter@student.babcock.edu.ng",
      fullName: "John Doe",
      matricNumber: "22/2847",
      sex: "male",
      department: "Software Engineering",
      level: "300",
      role: "voter",
      createdAt: Timestamp.now(),
    },
  },
];

for (const user of users) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, user.email, user.password);
    await setDoc(doc(db, "users", cred.user.uid), user.profile);
    console.log(`Created ${user.profile.role}: ${user.email}`);
  } catch (err) {
    console.error(`Failed for ${user.email}:`, err.message);
  }
}

console.log("\nDone! Credentials:");
console.log("  Admin: admin@student.babcock.edu.ng / admin123");
console.log("  Voter: voter@student.babcock.edu.ng / voter123");

process.exit(0);
