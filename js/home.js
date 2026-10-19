import { auth, db } from "./app.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const postsContainer = document.getElementById("posts-container");
    const emptyState = document.getElementById("empty-state");

    auth.onAuthStateChanged(user => {
        if (user) {
            loadPosts(user.uid);
        }
    });

    function loadPosts(currentUserId) {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("timestamp", "desc"));

        onSnapshot(q, (snapshot) => {
            postsContainer.innerHTML = ""; 
            
            if (snapshot.empty) {
                emptyState.style.display = "block";
                return;
            } else {
                emptyState.style.display = "none";
            }

            snapshot.forEach((postDoc) => {
                const post = postDoc.data();
                const postId = postDoc.id;
                renderPost(post, postId, currentUserId);
            });
        }, (error) => {
            console.error("Error loading posts: ", error);
        });
    }

    function renderPost(post, postId, currentUserId) {
        const userName = post.userName || "Unknown User";
        const userProfile = post.userProfile || "https://via.placeholder.com/40"; 
        const postText = post.text || "";
        const imageUrl = post.imageUrl || null;
        const likes = post.likes || [];
        const commentCount = post.commentCount || 0;
        
        const hasLiked = likes.includes(currentUserId);
        const likeColor = hasLiked ? "var(--color-blue)" : "var(--text-secondary)";

        const postElement = document.createElement("div");
        postElement.style.cssText = `
            background-color: var(--surface);
            border: 1px solid #E0E0E0;
            margin-bottom: 16px;
            border-radius: 8px;
            overflow: hidden;
        `;

        postElement.innerHTML = `
            <div style="display: flex; align-items: center; padding: 12px;">
                <img src="${userProfile}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <span style="margin-left: 12px; font-weight: bold; font-size: 14px;">${userName}</span>
            </div>
            ${imageUrl ? `<img src="${imageUrl}" alt="Post Image" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; background-color: var(--color-gray);">` : ''}
            <div style="padding: 12px 16px 8px;">
                <p style="font-size: 14px; color: var(--text-primary); margin-bottom: 8px;">${postText}</p>
            </div>
            <div style="display: flex; padding: 0 16px 8px; gap: 16px;">
                <button class="like-btn" data-id="${postId}" style="background: none; border: none; cursor: pointer; color: ${likeColor}; display: flex; align-items: center; gap: 4px;">
                    <svg style="width: 24px; height: 24px; fill: currentColor;" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <button class="comment-btn" data-id="${postId}" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
                    <svg style="width: 24px; height: 24px; fill: currentColor;" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                </button>
            </div>
            <div style="padding: 0 16px 16px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${likes.length} likes</div>
                <div style="font-size: 12px; color: var(--text-secondary); cursor: pointer;">
                    ${commentCount > 0 ? `View all ${commentCount} comments` : 'No comments yet'}
                </div>
            </div>
        `;

        const likeBtn = postElement.querySelector('.like-btn');
        likeBtn.addEventListener('click', async () => {
            const postRef = doc(db, "posts", postId);
            try {
                if (hasLiked) {
                    await updateDoc(postRef, { likes: arrayRemove(currentUserId) });
                } else {
                    await updateDoc(postRef, { likes: arrayUnion(currentUserId) });
                }
            } catch (error) {
                console.error("Error toggling like:", error);
            }
        });

        const commentBtn = postElement.querySelector('.comment-btn');
        commentBtn.addEventListener('click', () => {
            alert(`Open comments for post: ${postId}. We will build the comments modal later!`);
        });

        postsContainer.appendChild(postElement);
    }
});