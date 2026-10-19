import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Your Giphy API Key (Stored globally for use in chat/posts later)
export const GIPHY_API_KEY = "YOUR_GIPHY_API_KEY";

// 2. Global Authentication State Observer
// This checks if a user is logged in on every page load
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.split("/").pop();
    const isAuthPage = currentPage === "index.html" || currentPage === "" || currentPage === "register.html";

    if (user) {
        console.log("User is signed in:", user.uid);
        // If logged in and trying to access the login page, redirect to home
        if (isAuthPage) {
            window.location.href = "home.html";
        }
    } else {
        console.log("User is signed out.");
        // If logged out and trying to access a secure page, redirect to login
        if (!isAuthPage) {
            window.location.href = "index.html";
        }
    }
});

// 3. Global Logout Function
export const logoutUser = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out: ", error);
        alert("Failed to log out. Please try again.");
    }
};

// 4. Theme Management
export const toggleTheme = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Initialize theme on page load
const applySavedTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    // Default to dark mode if user prefers dark color scheme at OS level, otherwise check saved preference
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
};

// Run immediately on script load
applySavedTheme();

// Expose to window for inline HTML calls (e.g., onclick="toggleTheme()")
window.toggleTheme = toggleTheme;

// Expose logout to the window object so it can be called from HTML buttons easily
window.logoutUser = logoutUser;

