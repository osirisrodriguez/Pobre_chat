document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        user_name: document.querySelector("[name=user_name]").value,
        user_pass: document.querySelector("[name=user_pass]").value,
        confirm_pass: document.querySelector("[name=confirm_pass]").value,
        color: document.querySelector("[name=color]").value
    };

    const res = await fetch('/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const texto = await res.text();
    alert(texto);
    window.location.href = "/index.html";
});