import { auth, db } from "./app.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const nameField = document.getElementById("name-field");
    const emailField = document.getElementById("email-field");
    const passwordField = document.getElementById("password-field");
    const btnMainAction = document.getElementById("btn-main-action");
    const btnToggleAuth = document.getElementById("btn-toggle-auth");
    const btnGoogleSignIn = document.getElementById("btn-google-signin");

    let isLoginMode = true;

    btnToggleAuth.addEventListener("click", () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            nameField.classList.add("hidden");
            btnMainAction.innerText = "Login";
            btnToggleAuth.innerText = "Need an account? Register";
        } else {
            nameField.classList.remove("hidden");
            btnMainAction.innerText = "Register";
            btnToggleAuth.innerText = "Already have an account? Login";
        }
    });

    btnMainAction.addEventListener("click", async () => {
        const email = emailField.value.trim();
        const password = passwordField.value.trim();
        const name = nameField.value.trim();

        if (!email || !password) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = "home.html"; 
            } else {
                if (!name) {
                    alert("Please enter your full name.");
                    return;
                }
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
            }
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