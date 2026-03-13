import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, updateDoc, Timestamp } from "firebase/firestore";

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
      role: "super_admin",
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
    if (err.code === "auth/email-already-in-use") {
      // User exists, update their profile (especially role)
      const cred = await signInWithEmailAndPassword(auth, user.email, user.password);
      await updateDoc(doc(db, "users", cred.user.uid), { role: user.profile.role });
      console.log(`Updated ${user.email} role to ${user.profile.role}`);
    } else {
      console.error(`Failed for ${user.email}:`, err.message);
    }
  }
}

console.log("\nDone! Credentials:");
console.log("  Super Admin: admin@student.babcock.edu.ng / admin123");
console.log("  Voter:       voter@student.babcock.edu.ng / voter123");

process.exit(0);
