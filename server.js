const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const puerto = 8080;

// Crear servidor HTTP
const server = http.createServer(app);

// ==============================
// SOCKET.IO
// ==============================
const io = socketIO(server);

// ==============================
// CONEXIÓN A MONGODB (SOLO PARA USUARIOS)
// ==============================
mongoose.connect('mongodb://127.0.0.1:27017/Probe_chat')
    .then(() => console.log("✅ MongoDB conectado (solo para usuarios)"))
    .catch(err => console.log("❌ Error MongoDB:", err));

// ==============================
// DIRECTORIO
// ==============================
app.use(express.static(path.join(__dirname, 'publico')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==============================
// FUNCIÓN HASH SHA256
// ==============================
function sha256(texto) {
    return crypto.createHash('sha256').update(texto).digest('hex');
}

// ==============================
// MODELO DE USUARIO (SE GUARDA EN BD)
// ==============================
const UsuarioSchema = new mongoose.Schema({
    user_name: { type: String, unique: true, required: true },
    user_pass: { type: String, required: true },
    color_code: { type: String, default: "#667eea" }
});
const Usuario = mongoose.model('Usuarios', UsuarioSchema);

// ==============================
// RUTA DE REGISTRO
// ==============================
app.post('/registro', async (req, res) => {
    try {
        const { user_name, user_pass, confirm_pass, color } = req.body;
        
        if (!user_name || !user_pass || !confirm_pass) {
            return res.send("Faltan datos");
        }
        if (user_pass !== confirm_pass) {
            return res.send("Las contraseñas no coinciden");
        }
        if (user_name.length < 3) {
            return res.send("El nombre debe tener al menos 3 caracteres");
        }
        
        const existe = await Usuario.findOne({ user_name });
        if (existe) {
            return res.send("El usuario ya existe");
        }
        
        const nuevoUsuario = new Usuario({
            user_name,
            user_pass: sha256(user_pass),
            color_code: color || "#667eea"
        });
        await nuevoUsuario.save();
        
        console.log(`📝 Nuevo usuario registrado: ${user_name}`);
        res.send("Usuario registrado correctamente");
    } catch (error) {
        console.log(error);
        res.send("Error en el servidor");
    }
});

// ==============================
// RUTA DE LOGIN
// ==============================
app.post('/login', async (req, res) => {
    try {
        const { user_name, user_pass } = req.body;
        
        if (!user_name || !user_pass) {
            return res.json({ ok: false, msg: "Faltan datos" });
        }
        
        const usuario = await Usuario.findOne({ user_name });
        if (!usuario) {
            return res.json({ ok: false, msg: "Usuario no encontrado" });
        }
        
        const hash = sha256(user_pass);
        if (usuario.user_pass !== hash) {
            return res.json({ ok: false, msg: "Contraseña incorrecta" });
        }
        
        res.json({
            ok: true,
            msg: "Login correcto",
            user_id: usuario._id,
            user_name: usuario.user_name,
            color: usuario.color_code
        });
    } catch (error) {
        console.log(error);
        res.json({ ok: false, msg: "Error en el servidor" });
    }
});

// ==============================
// RUTA PARA OBTENER TODOS LOS USUARIOS (para mostrar en sidebar)
// ==============================
app.get('/api/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}, '_id user_name color_code');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json([]);
    }
});

// ==============================
// CHAT EN MEMORIA (LOS MENSAJES NO SE GUARDAN EN BD)
// ==============================
// Almacenar usuarios conectados en memoria
const usuariosConectados = new Map(); // socketId -> { userId, userName, userColor }
let mensajesEnMemoria = []; // Solo los últimos 50 mensajes en RAM

io.on('connection', (socket) => {
    console.log(`🔌 Nuevo socket conectado: ${socket.id}`);
    
    // Usuario se identifica después de login
    socket.on('user-connected', (userData) => {
        // Guardar usuario en memoria (conectados)
        usuariosConectados.set(socket.id, {
            userId: userData.userId,
            userName: userData.userName,
            userColor: userData.userColor,
            socketId: socket.id,
            connectedAt: new Date()
        });
        
        socket.userId = userData.userId;
        socket.userName = userData.userName;
        socket.userColor = userData.userColor;
        
        console.log(`✅ ${socket.userName} se ha conectado (Total conectados: ${usuariosConectados.size})`);
        
        // Enviar historial de mensajes recientes (solo los últimos 50 en memoria)
        socket.emit('chat-history', mensajesEnMemoria.slice(-50));
        
        // Notificar a TODOS los usuarios (incluyendo el nuevo) la lista actualizada
        broadcastOnlineUsers();
        
        // Anunciar a los demás que alguien se unió
        socket.broadcast.emit('user-joined', {
            userId: userData.userId,
            userName: userData.userName,
            userColor: userData.userColor,
            message: `${userData.userName} se ha unido al chat`,
            usersCount: usuariosConectados.size
        });
        
        // Enviar mensaje de bienvenida al usuario que se conecta
        socket.emit('welcome', {
            message: `¡Bienvenido ${userData.userName}! Los mensajes NO se guardan, solo duran mientras hay usuarios conectados.`,
            usersCount: usuariosConectados.size
        });
    });
    
    // Recibir nuevo mensaje
    socket.on('send-message', (messageData) => {
        console.log(`💬 [${socket.userName}]: ${messageData.text.substring(0, 50)}`);
        
        const nuevoMensaje = {
            id: Date.now(),
            userId: messageData.userId,
            userName: messageData.userName,
            userColor: messageData.userColor,
            text: messageData.text,
            timestamp: new Date().toISOString()
        };
        
        // Guardar en memoria RAM (solo los últimos 50 mensajes)
        mensajesEnMemoria.push(nuevoMensaje);
        if (mensajesEnMemoria.length > 50) {
            mensajesEnMemoria.shift(); // Eliminar el más antiguo
        }
        
        // Emitir a TODOS los clientes conectados
        io.emit('new-message', nuevoMensaje);
    });
    
    // Usuario está escribiendo
    socket.on('typing', (data) => {
        socket.broadcast.emit('user-typing', {
            userId: socket.userId,
            userName: socket.userName,
            isTyping: data.isTyping
        });
    });
    
    // Usuario se desconecta
    socket.on('disconnect', () => {
        if (socket.userName) {
            console.log(`👋 ${socket.userName} se ha desconectado (Total conectados: ${usuariosConectados.size - 1})`);
            
            // Eliminar de la lista de conectados
            usuariosConectados.delete(socket.id);
            
            // Notificar a todos que alguien salió
            io.emit('user-left', {
                userId: socket.userId,
                userName: socket.userName,
                message: `${socket.userName} ha salido del chat`,
                usersCount: usuariosConectados.size
            });
            
            // Actualizar lista de usuarios conectados
            broadcastOnlineUsers();
        }
    });
});

// Función para transmitir lista de usuarios conectados a todos
function broadcastOnlineUsers() {
    const usersList = Array.from(usuariosConectados.values()).map(user => ({
        userId: user.userId,
        userName: user.userName,
        userColor: user.userColor,
        connectedAt: user.connectedAt
    }));
    
    io.emit('online-users', {
        count: usuariosConectados.size,
        users: usersList
    });
}

// ==============================
// SERVIDOR
// ==============================
server.listen(puerto, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🚀 CHAT EN LÍNEA - SERVIDOR ACTIVO          ║
╠══════════════════════════════════════════════════╣
║  📍 Puerto: http://localhost:${puerto}              ║
║  💾 Usuarios: Guardados en MongoDB               ║
║  💬 Mensajes: Solo en memoria (NO se guardan)    ║
║  👥 Máximo mensajes en RAM: 50                   ║
╚══════════════════════════════════════════════════╝
    `);
});