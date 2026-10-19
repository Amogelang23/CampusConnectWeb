import { auth, db, GIPHY_API_KEY } from "./app.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const friendsListContainer = document.getElementById("friends-list");
    const messagesArea = document.getElementById("messages-area");
    const chatInput = document.getElementById("chat-input");
    const btnSend = document.getElementById("btn-send");
    
    const noChatSelectedView = document.getElementById("no-chat-selected");
    const chatInterfaceView = document.getElementById("chat-interface");
    const chatHeaderName = document.getElementById("chat-header-name");

    // GIF elements
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

            const userData = userDoc.data();
            const friendsArray = userData.friends || [];

            friendsListContainer.innerHTML = "";

            if (friendsArray.length === 0) {
                friendsListContainer.innerHTML = "<p style='color: var(--text-secondary); font-size: 14px;'>No friends yet. Add some friends to start chatting!</p>";
                return;
            }

            friendsArray.forEach(async (friendId) => {
                const friendDoc = await getDoc(doc(db, "users", friendId));
                if (friendDoc.exists()) {
                    renderFriendItem(friendDoc.data(), friendId);
                }
            });

        } catch (error) {
            console.error("Error loading friends:", error);
        }
    }

    function renderFriendItem(friendData, friendId) {
        const friendItem = document.createElement("div");
        friendItem.className = "friend-item";
        
        const profileImage = friendData.profileImage || "https://via.placeholder.com/40";
        const name = friendData.name || "Unknown User";

        friendItem.innerHTML = `
            <img src="${profileImage}" alt="${name}" class="friend-img">
            <span style="font-weight: bold; color: var(--text-primary);">${name}</span>
        `;

        friendItem.addEventListener("click", () => {
            document.querySelectorAll(".friend-item").forEach(el => el.classList.remove("active"));
            friendItem.classList.add("active");
            openPrivateChat(friendId, name);
        });

        friendsListContainer.appendChild(friendItem);
    }

    function getChatRoomId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    function openPrivateChat(friendId, friendName) {
        activeChatUserId = friendId;
        
        noChatSelectedView.style.display = "none";
        chatInterfaceView.style.display = "flex";
        chatHeaderName.innerText = friendName;
        messagesArea.innerHTML = ""; 
        gifPicker.style.display = "none"; // Hide GIF picker when switching chats

        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        const roomId = getChatRoomId(currentUserId, activeChatUserId);
        const chatsRef = collection(db, "Chats");
        const q = query(chatsRef, where("chatRoomId", "==", roomId), orderBy("timestamp", "asc"));

        unsubscribeMessages = onSnapshot(q, (snapshot) => {
            messagesArea.innerHTML = ""; 
            
            snapshot.forEach((doc) => {
                renderMessage(doc.data());
            });
            
            messagesArea.scrollTop = messagesArea.scrollHeight;
        });
    }

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
        
        // Check if message is a GIF or text
        let contentHtml = "";
        if (chat.imageUrl) {
            contentHtml = `<img src="${chat.imageUrl}" alt="GIF" style="width: 100%; border-radius: 8px;">`;
        } else {
            contentHtml = `<span>${chat.message}</span>`;
        }
        
        msgDiv.innerHTML = `
            ${contentHtml}
            <span class="chat-time">${timeString}</span>
        `;
        
        messagesArea.appendChild(msgDiv);
    }

    // --- STANDARD TEXT SENDING ---
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
                imageUrl: null, // Null for text messages
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }

    btnSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

    // --- GIPHY API INTEGRATION ---
    
    // Toggle GIF Picker visibility
    btnGif.addEventListener("click", () => {
        if (gifPicker.style.display === "none" || gifPicker.style.display === "") {
            gifPicker.style.display = "flex";
            fetchGifs("trending"); // Load trending GIFs initially
        } else {
            gifPicker.style.display = "none";
        }
    });

    // Search GIFs when typing
    let searchTimeout;
    gifSearch.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            fetchGifs(query ? query : "trending");
        }, 500); // Debounce to prevent too many API calls
    });

    async function fetchGifs(searchQuery) {
        if (!GIPHY_API_KEY || GIPHY_API_KEY === "YOUR_GIPHY_API_KEY") {
            gifResults.innerHTML = "<p style='color: var(--color-red); grid-column: span 3; text-align: center;'>Please configure your Giphy API Key in app.js</p>";
            return;
        }

        const endpoint = searchQuery === "trending" 
            ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`
            : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20`;

        try {
            const response = await fetch(endpoint);
            const data = await response.json();
            displayGifs(data.data);
        } catch (error) {
            console.error("Error fetching GIFs:", error);
            gifResults.innerHTML = "<p style='color: var(--text-secondary); grid-column: span 3;'>Failed to load GIFs.</p>";
        }
    }

    function displayGifs(gifs) {
        gifResults.innerHTML = ""; 
        
        gifs.forEach(gif => {
            const imgUrl = gif.images.fixed_height_small.url;
            
            const img = document.createElement("img");
            img.src = imgUrl;
            img.className = "gif-item";
            
            img.addEventListener("click", () => {
                sendGifMessage(imgUrl);
            });
            
            gifResults.appendChild(img);
        });
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