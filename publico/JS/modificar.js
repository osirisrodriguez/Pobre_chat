const form = document.querySelector("form");
// CARGAR USER_ID EN INPUT HIDDEN
document.querySelector("[name=user_id]").value =
    localStorage.getItem("user_id");
// MODIFICAR PERFIL
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        user_id: document.querySelector("[name=user_id]").value,
        user_name: document.querySelector("[name=user_name]").value,
        user_pass: document.querySelector("[name=user_pass]").value,
        color: document.querySelector("[name=color]").value
    };
    try {
        const res = await fetch('/editar', {
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
        // ACTUALIZAR LOCALSTORAGE
        localStorage.setItem("user_name", resultado.user_name);
        localStorage.setItem("color", resultado.color);
        alert("Perfil actualizado");
        // Redirigir
        window.location.href = "/perfil.html";
    } catch (error) {
        console.log(error);
        alert("Error al actualizar");
    }
});