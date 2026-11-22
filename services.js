// Add scrolled state to nav
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
});

// Add active state to current nav link
const navLinks = document.querySelectorAll(".nav-links a");
navLinks.forEach((link) => {
    if (link.getAttribute("href") === "services.html") {
        link.style.color = "var(--gold)";
    }
});