import { auth, db } from "./app.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const profileImage = document.getElementById("profile-image");
    const profileEmail = document.getElementById("profile-email");
    const profilePostCount = document.getElementById("profile-post-count");
    const editName = document.getElementById("edit-name");
    const editBio = document.getElementById("edit-bio");
    const btnSaveProfile = document.getElementById("btn-save-profile");
    const userPostsGrid = document.getElementById("user-posts-grid");
    const btnLogout = document.getElementById("btn-logout");
    const btnSettings = document.getElementById("btn-settings");

    let currentUserId = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            profileEmail.innerText = user.email;
            loadUserData();
            loadUserPosts();
        }
    });

    async function loadUserData() {
        if (!currentUserId) return;
        try {
            const userDoc = await getDoc(doc(db, "users", currentUserId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                editName.value = data.name || "";
                editBio.value = data.bio || "";
                if (data.profileImage) {
                    profileImage.src = data.profileImage;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    btnSaveProfile.addEventListener("click", async () => {
        if (!currentUserId) return;
        const newName = editName.value.trim();
        const newBio = editBio.value.trim();

        if (!newName) {
            alert("Name cannot be empty");
            return;
        }

        btnSaveProfile.disabled = true;
        btnSaveProfile.innerText = "Saving...";

        try {
            await updateDoc(doc(db, "users", currentUserId), {
                name: newName,
                name_lowercase: newName.toLowerCase(),
                bio: newBio
            });
            alert("Profile updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to update profile.");
        } finally {
            btnSaveProfile.disabled = false;
            btnSaveProfile.innerText = "Save Profile";
        }
    });

    async function loadUserPosts() {
        if (!currentUserId) return;
        try {
            const q = query(collection(db, "posts"), where("userId", "==", currentUserId));
            const querySnapshot = await getDocs(q);
            
            userPostsGrid.innerHTML = "";
            let count = 0;

            querySnapshot.forEach((docSnap) => {
                count++;
                const post = docSnap.data();
                
                const imgElement = document.createElement("img");
                imgElement.className = "post-thumbnail";
                imgElement.src = post.imageUrl || "https://via.placeholder.com/150?text=Text+Post";
                
                userPostsGrid.appendChild(imgElement);
            });

            profilePostCount.innerText = `${count} posts`;
        } catch (error) {
            console.error(error);
        }
    }

    btnLogout.addEventListener("click", () => {
        if (window.logoutUser) {
            window.logoutUser();
        }
    });

    btnSettings.addEventListener("click", () => {
        if (window.toggleTheme) {
            window.toggleTheme();
        } else {
            alert("Settings / Theme toggle clicked");
        }
    });
});