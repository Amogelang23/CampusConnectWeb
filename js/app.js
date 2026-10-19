import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { GIPHY_API_KEY } from "./app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRNyK7msfQjIwU4OJK6KBVgYNv-o0i1Qw",
  authDomain: "campusconnect-204b1.firebaseapp.com",
  databaseURL: "https://campusconnect-204b1-default-rtdb.firebaseio.com",
  projectId: "campusconnect-204b1",
  storageBucket: "campusconnect-204b1.firebasestorage.app",
  messagingSenderId: "506111635793",
  appId: "1:506111635793:web:8b8ae6033183d8813be370",
  measurementId: "G-X232DCE3QG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const GIPHY_API_KEY = "KYzS8QA4rPxKpA8TZO7ADVPRdqC2C0LA";

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split("/").pop();
    const isAuthPage = currentPage === "index.html" || currentPage === "" || currentPage === "register.html";

    if (user) {
        console.log("User is signed in:", user.uid);
        if (isAuthPage) {
            window.location.href = "home.html";
        }
    } else {
        console.log("User is signed out.");
        if (!isAuthPage) {
            window.location.href = "index.html";
        }
    }
});

export const logoutUser = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out: ", error);
        alert("Failed to log out. Please try again.");
    }
};

export const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

const applySavedTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
};

applySavedTheme();

window.toggleTheme = toggleTheme;

window.logoutUser = logoutUser;

