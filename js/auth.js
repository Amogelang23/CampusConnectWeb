import { auth, db } from "./app.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("sliding-auth-container");
    const slideToRegisterBtn = document.getElementById("slide-to-register");
    const slideToLoginBtn = document.getElementById("slide-to-login");
    
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const btnGoogleSignIn = document.getElementById("btn-google-signin");

    slideToRegisterBtn.addEventListener("click", () => {
        container.classList.add("right-panel-active");
    });

    slideToLoginBtn.addEventListener("click", () => {
        container.classList.remove("right-panel-active");
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "home.html";
        } catch (error) {
            alert(error.message);
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value.trim();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: email.toLowerCase(),
                name: name,
                name_lowercase: name.toLowerCase(),
                profileImage: null,
                friends: [],
                friendRequests: []
            });
            
            window.location.href = "home.html";
        } catch (error) {
            alert(error.message);
        }
    });

    btnGoogleSignIn.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            const userRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userRef);
            
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email.toLowerCase(),
                    name: user.displayName || "Unknown User",
                    name_lowercase: (user.displayName || "Unknown User").toLowerCase(),
                    profileImage: user.photoURL || null,
                    friends: [],
                    friendRequests: []
                });
            }
            
            window.location.href = "home.html";
        } catch (error) {
            alert(error.message);
        }
    });
});