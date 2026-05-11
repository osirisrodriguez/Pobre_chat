// ==============================
// cargar datos
// ==============================
const user_id = localStorage.getItem("user_id");
const user_name = localStorage.getItem("user_name");
const color = localStorage.getItem("color");

// Si no hay sesión → regresar al login
if (!user_id) {
    window.location.href = "/index.html";
}

// ==============================
// insertar los datos
// ==============================
const inputId = document.querySelector("[name=user_id]");
const inputUser = document.querySelector("[name=user_name]");
const inputColor = document.querySelector("[name=color]");

inputId.value = user_id;
inputUser.value = user_name;
inputColor.value = color;