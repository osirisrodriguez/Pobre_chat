document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        user_name: document.querySelector("[name=user_name]").value,
        user_pass: document.querySelector("[name=user_pass]").value
    };
    
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const resultado = await res.json();
        
        if (!resultado.ok) {
            alert(resultado.msg);
            return;
        }
        
        // Guardar en localStorage (importante: usar 'user_color' para que coincida con chat.js)
        localStorage.setItem("user_id", resultado.user_id);
        localStorage.setItem("user_name", resultado.user_name);
        localStorage.setItem("user_color", resultado.color);  // ← Cambiar de "color" a "user_color"
        
        window.location.href = "/chat.html";
        
    } catch (error) {
        console.error(error);
        alert("Error al conectar con el servidor");
    }
});