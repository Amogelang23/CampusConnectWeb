import { auth, db, GIPHY_API_KEY } from "./app.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const desktopFriendsList = document.getElementById("desktop-friends-list");
    const mobileFriendsList = document.getElementById("mobile-friends-list");
    const messagesArea = document.getElementById("messages-area");
    const chatInput = document.getElementById("chat-input");
    const btnSend = document.getElementById("btn-send");
    
    // Views
    const mobileFriendsView = document.getElementById("mobile-friends-view");
    const noChatSelectedView = document.getElementById("no-chat-selected");
    const chatInterfaceView = document.getElementById("chat-interface");
    const chatHeaderName = document.getElementById("chat-header-name");
    const btnBack = document.getElementById("btn-back");

    // GIF Elements
    const btnGif = document.getElementById("btn-gif");
    const gifPicker = document.getElementById("gif-picker");
    const gifSearch = document.getElementById("gif-search");
    const gifResults = document.getElementById("gif-results");

    let currentUserId = null;
    let activeChatUserId = null;
    let unsubscribeMessages = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            loadFriends();
        }
    });

    async function loadFriends() {
        try {
            const userDoc = await getDoc(doc(db, "users", currentUserId));
            if (!userDoc.exists()) return;

            const friendsArray = userDoc.data().friends || [];

            desktopFriendsList.innerHTML = "";
            mobileFriendsList.innerHTML = "";

            if (friendsArray.length === 0) {
                const emptyMsg = "<p style='color: var(--text-secondary); font-size: 14px;'>No friends yet. Add some friends to start chatting!</p>";
                desktopFriendsList.innerHTML = emptyMsg;
                mobileFriendsList.innerHTML = emptyMsg;
                return;
            }

            friendsArray.forEach(async (friendId) => {
                const friendDoc = await getDoc(doc(db, "users", friendId));
                if (friendDoc.exists()) {
                    const friendData = friendDoc.data();
                    // Append to both desktop and mobile lists
                    desktopFriendsList.appendChild(createFriendElement(friendData, friendId));
                    mobileFriendsList.appendChild(createFriendElement(friendData, friendId));
                }
            });

        } catch (error) {
            console.error("Error loading friends:", error);
        }
    }

    function createFriendElement(friendData, friendId) {
        const item = document.createElement("div");
        item.className = "friend-item";
        
        const profileImage = friendData.profileImage || "https://via.placeholder.com/40";
        const name = friendData.name || "Unknown User";

        item.innerHTML = `
            <img src="${profileImage}" alt="${name}" class="friend-img">
            <span style="font-weight: bold; color: var(--text-primary);">${name}</span>
        `;

        item.addEventListener("click", () => {
            // Highlight active in both lists
            document.querySelectorAll(".friend-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            openPrivateChat(friendId, name);
        });

        return item;
    }

    function getChatRoomId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    function openPrivateChat(friendId, friendName) {
        activeChatUserId = friendId;
        
        // Update UI logic for mobile/desktop toggles
        mobileFriendsView.style.display = "none";
        noChatSelectedView.style.display = "none";
        chatInterfaceView.style.display = "flex";
        
        chatHeaderName.innerText = friendName;
        messagesArea.innerHTML = ""; 
        gifPicker.style.display = "none";

        if (unsubscribeMessages) unsubscribeMessages();

        const roomId = getChatRoomId(currentUserId, activeChatUserId);
        const chatsRef = collection(db, "Chats");
        const q = query(chatsRef, where("chatRoomId", "==", roomId), orderBy("timestamp", "asc"));

        unsubscribeMessages = onSnapshot(q, (snapshot) => {
            messagesArea.innerHTML = ""; 
            snapshot.forEach((doc) => renderMessage(doc.data()));
            messagesArea.scrollTop = messagesArea.scrollHeight;
        });
    }

    btnBack.addEventListener("click", () => {
        // Return to mobile friends list
        chatInterfaceView.style.display = "none";
        mobileFriendsView.style.display = "block";
        document.querySelectorAll(".friend-item").forEach(el => el.classList.remove("active"));
        if (unsubscribeMessages) unsubscribeMessages();
        activeChatUserId = null;
    });

    function renderMessage(chat) {
        const isSentByMe = chat.senderId === currentUserId;
        const bubbleClass = isSentByMe ? "chat-sent" : "chat-received";
        
        let timeString = "";
        if (chat.timestamp) {
            const date = chat.timestamp.toDate();
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-bubble ${bubbleClass}`;
        
        let contentHtml = chat.imageUrl 
            ? `<img src="${chat.imageUrl}" alt="GIF" style="width: 100%; border-radius: 8px;">` 
            : `<span>${chat.message}</span>`;
        
        msgDiv.innerHTML = `
            ${contentHtml}
            <span class="chat-time">${timeString}</span>
        `;
        
        messagesArea.appendChild(msgDiv);
    }

    // --- Message Sending Logic ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !currentUserId || !activeChatUserId) return;

        chatInput.value = ""; 
        const roomId = getChatRoomId(currentUserId, activeChatUserId);
        
        try {
            await addDoc(collection(db, "Chats"), {
                senderId: currentUserId,
                receiverId: activeChatUserId,
                chatRoomId: roomId,
                message: text,
                imageUrl: null,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }

    btnSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // --- Giphy Integration ---
    btnGif.addEventListener("click", () => {
        if (gifPicker.style.display === "none" || gifPicker.style.display === "") {
            gifPicker.style.display = "flex";
            fetchGifs("trending");
        } else {
            gifPicker.style.display = "none";
        }
    });

    let searchTimeout;
    gifSearch.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            fetchGifs(query ? query : "trending");
        }, 500);
    });

    async function fetchGifs(searchQuery) {
        if (!GIPHY_API_KEY || GIPHY_API_KEY === "YOUR_API_KEY_HERE") {
            gifResults.innerHTML = "<p style='color: var(--color-red); grid-column: span 3; text-align: center;'>Configure API Key</p>";
            return;
        }

        const isTrending = !searchQuery || searchQuery.trim() === "trending";
        const endpoint = isTrending 
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`
            : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20`;

        try {
            gifResults.innerHTML = "<p style='grid-column: span 3; text-align: center;'>Loading GIFs...</p>";

            const response = await fetch(endpoint);
        
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            gifResults.innerHTML = ""; 
        
            if (!data.data || data.data.length === 0) {
                gifResults.innerHTML = "<p style='grid-column: span 3; text-align: center;'>No GIFs found.</p>";
                return;
            }

            data.data.forEach(gif => {
                const imgUrl = gif.images?.fixed_height_small?.url;
                if (!imgUrl) return;
                    const img = document.createElement("img");
                    img.src = imgUrl;
                    img.className = "gif-item";
                    img.alt = gif.title || "GIF image";
                    img.addEventListener("click", () => sendGifMessage(imgUrl));
                    gifResults.appendChild(img);
            });
        } catch (error) {
            console.error("Error fetching GIFs:", error);
            gifResults.innerHTML = "<p style='color: var(--color-red); grid-column: span 3; text-align: center;'>Failed to load GIFs.</p>";
        }
    }

    async function sendGifMessage(gifUrl) {
        if (!currentUserId || !activeChatUserId) return;

        gifPicker.style.display = "none";
        gifSearch.value = "";
        
        const roomId = getChatRoomId(currentUserId, activeChatUserId);
        
        try {
            await addDoc(collection(db, "Chats"), {
                senderId: currentUserId,
                receiverId: activeChatUserId,
                chatRoomId: roomId,
                message: "Sent a GIF",
                imageUrl: gifUrl,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending GIF: ", error);
        }
    }
});