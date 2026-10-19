import { auth, db, storage } from "./app.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
    const postTextInput = document.getElementById("post-text");
    const imageInput = document.getElementById("image-input");
    const btnSelectImage = document.getElementById("btn-select-image");
    const imagePreview = document.getElementById("image-preview");
    const btnUpload = document.getElementById("btn-upload");
    const loadingOverlay = document.getElementById("loading-overlay");

    let selectedImageFile = null;

    btnSelectImage.addEventListener("click", () => {
        imageInput.click();
    });

    imageInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedImageFile = file;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
            
            btnSelectImage.innerText = "Change Image";
        }
    });

    btnUpload.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to post.");
            return;
        }

        const postText = postTextInput.value.trim();

        if (!postText && !selectedImageFile) {
            alert("Please add some text or select an image to post.");
            return;
        }

        btnUpload.disabled = true;
        postTextInput.disabled = true;
        btnSelectImage.disabled = true;
        loadingOverlay.style.display = "block";

        try {
            let imageUrl = null;

            if (selectedImageFile) {
                const uniqueFilename = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}_${selectedImageFile.name}`;
                const storageRef = ref(storage, uniqueFilename);
                
                const snapshot = await uploadBytes(storageRef, selectedImageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, "posts"), {
                userId: user.uid,
                userName: user.displayName || "Unknown User",
                userProfile: user.photoURL || "https://via.placeholder.com/40", 
                text: postText,
                imageUrl: imageUrl,
                likes: [],
                commentCount: 0,
                timestamp: serverTimestamp()
            });

            window.location.href = "home.html";

        } catch (error) {
            console.error("Error uploading post:", error);
            alert("Failed to upload post. Please try again.");
            
            btnUpload.disabled = false;
            postTextInput.disabled = false;
            btnSelectImage.disabled = false;
            loadingOverlay.style.display = "none";
        }
    });
});