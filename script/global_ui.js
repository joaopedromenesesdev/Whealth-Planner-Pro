// =========================
// REVEAL ANIMATION (Intersection Observer)
// =========================
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            // Dispara um evento customizado para gráficos saberem que devem animar
            entry.target.dispatchEvent(new CustomEvent('revealed'));
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach(el => {
        observer.observe(el);
    });
});

// =========================
// EFEITO PARALLAX SUAVE
// =========================
window.addEventListener('scroll', () => {
    const scroll = window.pageYOffset;
    document.body.style.backgroundPosition = `0px ${scroll * 0.1}px`;
});

// =========================
// LIMPAR TUDO (RESET GLOBAL)
// =========================
function limparTudo() {
    if (confirm("Tem certeza que deseja limpar todos os dados da simulação?")) {
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}

// =========================
// ESCAPE HTML (XSS PREVENTION)
// =========================
window.escapeHTML = function(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

