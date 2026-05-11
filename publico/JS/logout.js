document.addEventListener('DOMContentLoaded', () => {
    const boton = document.getElementById('logout');
    if (boton) {
        boton.addEventListener('click', () => {
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_name');
            localStorage.removeItem('color');
            alert('sesion cerrada con exito');
            window.location.href = '/index.html';
        });
    }
});