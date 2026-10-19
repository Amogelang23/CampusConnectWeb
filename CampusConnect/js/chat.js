import { auth, db } from "./app.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const friendsListContainer = document.getElementById("friends-list");
    const messagesArea = document.getElementById("messages-area");
    const chatInput = document.getElementById("chat-input");
    const btnSend = document.getElementById("btn-send");
    
    const noChatSelectedView = document.getElementById("no-chat-selected");
    const chatInterfaceView = document.getElementById("chat-interface");
    const chatHeaderName = document.getElementById("chat-header-name");

    let currentUserId = null;
    let activeChatUserId = null;
    let unsubscribeMessages = null;

    // 1. Verify Authentication & Load Friends
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            loadFriends();
        }
    });

    // 2. Load Friends List
    async function loadFriends() {
        try {
            // Get current user's document to find their friends array
            const userDoc = await getDoc(doc(db, "users", currentUserId));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();
            const friendsArray = userData.friends || [];

            friendsListContainer.innerHTML = ""; // Clear loading text

            if (friendsArray.length === 0) {
                friendsListContainer.innerHTML = "<p style='color: var(--text-secondary); font-size: 14px;'>No friends yet. Add some friends to start chatting!</p>";
                return;
            }

            // Fetch details for each friend
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

    // 3. Render a friend in the sidebar
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
            // Highlight active friend
            document.querySelectorAll(".friend-item").forEach(el => el.classList.remove("active"));
            friendItem.classList.add("active");

            openPrivateChat(friendId, name);
        });

        friendsListContainer.appendChild(friendItem);
    }

    // 4. Generate a unique, consistent Room ID for two users
    function getChatRoomId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    }

    // 5. Open Private Chat and Listen for Messages
    function openPrivateChat(friendId, friendName) {
        activeChatUserId = friendId;
        
        // Update UI
        noChatSelectedView.style.display = "none";
        chatInterfaceView.style.display = "flex";
        chatHeaderName.innerText = friendName;
        messagesArea.innerHTML = ""; // Clear old messages

        // Unsubscribe from previous chat listener if exists
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        const roomId = getChatRoomId(currentUserId, activeChatUserId);
        
        // Listen only to messages in this specific room
        const chatsRef = collection(db, "Chats");
        const q = query(chatsRef, where("chatRoomId", "==", roomId), orderBy("timestamp", "asc"));

        unsubscribeMessages = onSnapshot(q, (snapshot) => {
            messagesArea.innerHTML = ""; // Clear and re-render
            
            snapshot.forEach((doc) => {
                renderMessage(doc.data());
            });
            
            // Auto-scroll to bottom
            messagesArea.scrollTop = messagesArea.scrollHeight;
        });
    }

    // 6. Render Individual Message Bubbles
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
        
        msgDiv.innerHTML = `
            <span>${chat.message}</span>
            <span class="chat-time">${timeString}</span>
        `;
        
        messagesArea.appendChild(msgDiv);
    }

    // 7. Send Message Logic
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
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error sending message: ", error);
            alert("Failed to send message.");
        }
    }

    btnSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });
});