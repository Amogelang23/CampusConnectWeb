import { auth, db } from "./app.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const myFriendsList = document.getElementById("my-friends-list");
    const searchInput = document.getElementById("search-input");
    const btnSearch = document.getElementById("btn-search");
    const searchResultsList = document.getElementById("search-results-list");
    const requestsList = document.getElementById("requests-list");

    let currentUserId = null;

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(btn.getAttribute("data-target")).classList.add("active");
        });
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            listenToUserData();
        }
    });

    function listenToUserData() {
        onSnapshot(doc(db, "users", currentUserId), (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                renderMyFriends(userData.friends || []);
                renderRequests(userData.friendRequests || []);
            }
        });
    }

    async function renderMyFriends(friendIds) {
        myFriendsList.innerHTML = "";
        if (friendIds.length === 0) {
            myFriendsList.innerHTML = "<p style='color: var(--text-secondary);'>You have no friends yet.</p>";
            return;
        }

        for (const friendId of friendIds) {
            const friendDoc = await getDoc(doc(db, "users", friendId));
            if (friendDoc.exists()) {
                const friendData = friendDoc.data();
                const item = document.createElement("div");
                item.className = "friend-list-item";
                
                const profileImg = friendData.profileImage || "https://via.placeholder.com/48";
                const name = friendData.name || "Unknown";

                item.innerHTML = `
                    <img src="${profileImg}" class="friend-list-img" alt="${name}">
                    <div class="friend-list-info">
                        <div class="friend-list-name">${name}</div>
                    </div>
                    <button class="btn-outline btn-small" style="color: var(--color-red); border-color: var(--color-red);" data-id="${friendId}">Remove</button>
                `;

                item.querySelector("button").addEventListener("click", () => removeFriend(friendId));
                myFriendsList.appendChild(item);
            }
        }
    }

    async function removeFriend(friendId) {
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                friends: arrayRemove(friendId)
            });
            await updateDoc(doc(db, "users", friendId), {
                friends: arrayRemove(currentUserId)
            });
        } catch (error) {
            alert("Failed to remove friend.");
        }
    }

    btnSearch.addEventListener("click", async () => {
        const queryText = searchInput.value.trim().toLowerCase();
        if (!queryText) return;

        searchResultsList.innerHTML = "<p>Searching...</p>";

        try {
            const emailQ = query(collection(db, "users"), where("email", "==", queryText));
            const nameQ = query(collection(db, "users"), where("name_lowercase", ">=", queryText), where("name_lowercase", "<=", queryText + "\uf8ff"));

            const [emailSnap, nameSnap] = await Promise.all([getDocs(emailQ), getDocs(nameQ)]);
            
            const resultsMap = new Map();
            
            emailSnap.forEach(doc => {
                if (doc.id !== currentUserId) resultsMap.set(doc.id, doc.data());
            });
            nameSnap.forEach(doc => {
                if (doc.id !== currentUserId) resultsMap.set(doc.id, doc.data());
            });

            searchResultsList.innerHTML = "";

            if (resultsMap.size === 0) {
                searchResultsList.innerHTML = "<p style='color: var(--text-secondary);'>No users found.</p>";
                return;
            }

            const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
            const currentUserData = currentUserDoc.data();
            const myFriends = currentUserData.friends || [];

            resultsMap.forEach((userData, userId) => {
                const item = document.createElement("div");
                item.className = "friend-list-item";
                
                const profileImg = userData.profileImage || "https://via.placeholder.com/48";
                const name = userData.name || "Unknown";
                const isFriend = myFriends.includes(userId);

                let actionHtml = "";
                if (isFriend) {
                    actionHtml = `<span style="color: var(--text-secondary); font-size: 12px; font-weight: bold;">Already Friends</span>`;
                } else {
                    actionHtml = `<button class="btn-primary btn-small" data-id="${userId}">Send Request</button>`;
                }

                item.innerHTML = `
                    <img src="${profileImg}" class="friend-list-img" alt="${name}">
                    <div class="friend-list-info">
                        <div class="friend-list-name">${name}</div>
                    </div>
                    ${actionHtml}
                `;

                if (!isFriend) {
                    const sendBtn = item.querySelector("button");
                    sendBtn.addEventListener("click", () => {
                        sendFriendRequest(userId, sendBtn);
                    });
                }

                searchResultsList.appendChild(item);
            });

        } catch (error) {
            searchResultsList.innerHTML = "<p style='color: var(--color-red);'>Search failed.</p>";
        }
    });

    async function sendFriendRequest(targetId, btnElement) {
        try {
            await updateDoc(doc(db, "users", targetId), {
                friendRequests: arrayUnion(currentUserId)
            });
            btnElement.innerText = "Sent";
            btnElement.disabled = true;
            btnElement.style.backgroundColor = "var(--text-secondary)";
        } catch (error) {
            alert("Failed to send request.");
        }
    }

    async function renderRequests(requestIds) {
        requestsList.innerHTML = "";
        if (requestIds.length === 0) {
            requestsList.innerHTML = "<p style='color: var(--text-secondary);'>No pending requests.</p>";
            return;
        }

        for (const senderId of requestIds) {
            const senderDoc = await getDoc(doc(db, "users", senderId));
            if (senderDoc.exists()) {
                const senderData = senderDoc.data();
                const item = document.createElement("div");
                item.className = "friend-list-item";
                
                const profileImg = senderData.profileImage || "https://via.placeholder.com/48";
                const name = senderData.name || "Unknown";

                item.innerHTML = `
                    <img src="${profileImg}" class="friend-list-img" alt="${name}">
                    <div class="friend-list-info">
                        <div class="friend-list-name">${name}</div>
                    </div>
                    <div class="action-group">
                        <button class="btn-primary btn-small btn-accept">Accept</button>
                        <button class="btn-outline btn-small btn-decline" style="color: var(--color-red); border-color: var(--color-red);">Decline</button>
                    </div>
                `;

                item.querySelector(".btn-accept").addEventListener("click", () => acceptRequest(senderId));
                item.querySelector(".btn-decline").addEventListener("click", () => declineRequest(senderId));
                
                requestsList.appendChild(item);
            }
        }
    }

    async function acceptRequest(senderId) {
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                friendRequests: arrayRemove(senderId),
                friends: arrayUnion(senderId)
            });
            await updateDoc(doc(db, "users", senderId), {
                friends: arrayUnion(currentUserId)
            });
        } catch (error) {
            alert("Failed to accept request.");
        }
    }

    async function declineRequest(senderId) {
        try {
            await updateDoc(doc(db, "users", currentUserId), {
                friendRequests: arrayRemove(senderId)
            });
        } catch (error) {
            alert("Failed to decline request.");
        }
    }
});