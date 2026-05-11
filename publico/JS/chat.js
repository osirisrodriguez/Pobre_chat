// ========================
// VARIABLES GLOBALES
// ========================
let currentUser = {
    id: null,
    name: null,
    color: null
};

let socket = null;
let typingTimeout = null;

// ========================
// CARGAR DATOS DEL USUARIO DESDE LOCALSTORAGE
// ========================
function loadUser() {
    const userId = localStorage.getItem('user_id');
    const userName = localStorage.getItem('user_name');
    const userColor = localStorage.getItem('user_color');

    if (!userId || !userName) {
        window.location.href = '/';
        return false;
    }

    currentUser.id = userId;
    currentUser.name = userName;
    currentUser.color = userColor || '#667eea';

    const userNameDisplay = document.getElementById('userNameDisplay');
    const userColorDisplay = document.getElementById('userColorDisplay');
    
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
    if (userColorDisplay) userColorDisplay.style.backgroundColor = currentUser.color;
    
    return true;
}

// ========================
// CONECTAR SOCKET.IO
// ========================
function connectSocket() {
    socket = io();
    
    // Escuchar eventos de conexión
    socket.on('connect', () => {
        console.log('✅ Conectado al servidor');
        
        // Identificarse con los datos del usuario
        socket.emit('user-connected', {
            userId: currentUser.id,
            userName: currentUser.name,
            userColor: currentUser.color
        });
    });
    
    // Mensaje de bienvenida personal
    socket.on('welcome', (data) => {
        addSystemMessage(data.message);
        addSystemMessage(`👥 Hay ${data.usersCount} usuario(s) conectado(s) ahora mismo`);
    });
    
    // Recibir historial de mensajes (últimos 50 en memoria)
    socket.on('chat-history', (history) => {
        console.log('📜 Historial recibido:', history.length, 'mensajes');
        if (history.length === 0) {
            addSystemMessage('💬 No hay mensajes recientes. ¡Escribe el primero!');
        } else {
            renderMessages(history);
        }
    });
    
    // Escuchar nuevos mensajes
    socket.on('new-message', (message) => {
        addMessageToChat(message);
    });
    
    // Escuchar cuando alguien se conecta
    socket.on('user-joined', (data) => {
        addSystemMessage(`✨ ${data.userName} se ha unido al chat (${data.usersCount} conectados)`);
    });
    
    // Escuchar cuando alguien se desconecta
    socket.on('user-left', (data) => {
        addSystemMessage(`👋 ${data.userName} ha salido del chat (${data.usersCount} conectados)`);
    });
    
    // Recibir lista actualizada de usuarios conectados
    socket.on('online-users', (data) => {
        updateUsersList(data.users, data.count);
    });
    
    // Escuchar cuando alguien está escribiendo
    socket.on('user-typing', (data) => {
        const typingDiv = document.getElementById('typingIndicator');
        if (data.isTyping && data.userId !== currentUser.id) {
            typingDiv.textContent = `✍️ ${data.userName} está escribiendo...`;
        } else if (!data.isTyping) {
            typingDiv.textContent = '';
        }
    });
    
    // Manejar errores
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        addSystemMessage(`❌ Error: ${error}`);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Desconectado del servidor');
        addSystemMessage('❌ Desconectado del servidor. Reconectando...');
    });
}

// ========================
// RENDERIZAR MENSAJES INICIALES
// ========================
function renderMessages(messages) {
    const chatDiv = document.getElementById('chat');
    chatDiv.innerHTML = '';
    
    messages.forEach(msg => {
        addMessageToChat(msg, false);
    });
    
    scrollToBottom();
}

// ========================
// AÑADIR MENSAJE AL CHAT
// ========================
function addMessageToChat(msg, scroll = true) {
    const chatDiv = document.getElementById('chat');
    const isOwn = msg.userId === currentUser.id;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'message-sent' : 'message-received'}`;
    
    const nameSpan = document.createElement('div');
    nameSpan.className = 'message-name';
    nameSpan.innerHTML = `<span style="color: ${msg.userColor || '#667eea'};">${escapeHtml(msg.userName)}</span>`;
    
    const textSpan = document.createElement('div');
    textSpan.className = 'message-text';
    textSpan.innerHTML = parseEmojis(escapeHtml(msg.text));
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    const date = new Date(msg.timestamp);
    timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.appendChild(nameSpan);
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeSpan);
    chatDiv.appendChild(messageDiv);
    
    if (scroll) {
        scrollToBottom();
    }
}

// ========================
// AÑADIR MENSAJE DE SISTEMA
// ========================
function addSystemMessage(text) {
    const chatDiv = document.getElementById('chat');
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.textContent = text;
    chatDiv.appendChild(sysDiv);
    scrollToBottom();
}

// ========================
// ACTUALIZAR LISTA DE USUARIOS CONECTADOS
// ========================
function updateUsersList(users, count) {
    const usersListDiv = document.getElementById('usersList');
    const onlineCountSpan = document.getElementById('onlineCount');
    
    if (onlineCountSpan) {
        onlineCountSpan.textContent = `Conectados: ${count}`;
    }
    
    if (!usersListDiv) return;
    
    if (count === 0) {
        usersListDiv.innerHTML = '<div class="system-message">No hay usuarios conectados</div>';
        return;
    }
    
    usersListDiv.innerHTML = '';
    users.forEach(user => {
        const isCurrentUser = user.userId === currentUser.id;
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-color-dot" style="background-color: ${user.userColor};"></div>
            <div class="user-name">${escapeHtml(user.userName)}</div>
            ${isCurrentUser ? '<span class="current-user-badge">tú</span>' : ''}
        `;
        usersListDiv.appendChild(userItem);
    });
}

// ========================
// FUNCIONES UTILITARIAS
// ========================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function parseEmojis(text) {
    return text;
}

function scrollToBottom() {
    const chatDiv = document.getElementById('chat');
    if (chatDiv) {
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}

// ========================
// ENVIAR MENSAJE
// ========================
function sendMessage() {
    const input = document.getElementById('mensaje');
    if (!input) return;
    
    let text = input.value.trim();
    
    if (text === "") {
        alert("No puedes enviar un mensaje vacío");
        return;
    }
    
    if (text.length > 200) {
        alert("El mensaje excede los 200 caracteres");
        return;
    }
    
    const messageData = {
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    socket.emit('send-message', messageData);
    
    input.value = "";
    updateCharCount();
    notifyTyping(false);
}

// ========================
// NOTIFICAR QUE ESTÁ ESCRIBIENDO
// ========================
function notifyTyping(isTyping) {
    if (socket) {
        socket.emit('typing', { isTyping: isTyping });
    }
}

function handleTyping() {
    notifyTyping(true);
    
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    typingTimeout = setTimeout(() => {
        notifyTyping(false);
    }, 1500);
}

// ========================
// CONTADOR DE CARACTERES
// ========================
function updateCharCount() {
    const input = document.getElementById('mensaje');
    if (!input) return;
    
    const count = input.value.length;
    const max = 200;
    const counterDiv = document.getElementById('charCounter');
    
    if (counterDiv) {
        counterDiv.textContent = `${count} / ${max}`;
        
        counterDiv.classList.remove('warning', 'danger');
        if (count > max * 0.9) {
            counterDiv.classList.add('danger');
        } else if (count > max * 0.7) {
            counterDiv.classList.add('warning');
        }
    }
}

// ========================
// INSERTAR EMOJIS
// ========================
function addEmoji(emoji) {
    const input = document.getElementById('mensaje');
    if (!input) return;
    
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    if (newText.length <= 200) {
        input.value = newText;
        input.setSelectionRange(start + emoji.length, start + emoji.length);
        updateCharCount();
        input.focus();
        handleTyping();
    } else {
        alert("No se puede añadir el emoji, se excede el límite de 200 caracteres");
    }
}

// ========================
// CERRAR SESIÓN
// ========================
function logout() {
    if (socket) {
        socket.disconnect();
    }
    localStorage.clear();
    window.location.href = '/';
}

// ========================
// INICIALIZAR
// ========================
document.addEventListener('DOMContentLoaded', () => {
    if (!loadUser()) return;
    
    connectSocket();
    
    const sendBtn = document.getElementById('enviar');
    const msgInput = document.getElementById('mensaje');
    const logoutBtn = document.getElementById('logoutBtn');
    const toggleEmoji = document.getElementById('toggleEmoji');
    const emojiPanel = document.getElementById('emojiPanel');
    
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    
    if (msgInput) {
        msgInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
        
        msgInput.addEventListener('input', () => {
            updateCharCount();
            handleTyping();
        });
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    if (toggleEmoji && emojiPanel) {
        toggleEmoji.addEventListener('click', () => {
            emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'flex' : 'none';
        });
    }
    
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => addEmoji(btn.textContent));
    });
    
    updateCharCount();
});