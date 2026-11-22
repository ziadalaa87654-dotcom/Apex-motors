// NAV SCROLL EFFECT
window.addEventListener("scroll", function() {
    const nav = document.querySelector("nav");
    if (window.scrollY > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
});

// SMOOTH SCROLL FOR NAV LINKS
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute("href"));
        if (target) {
            target.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    });
});

// REVEAL ANIMATIONS
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, observerOptions);

// Observe all elements with .reveal class
document.querySelectorAll(".reveal").forEach((el) => {
    observer.observe(el);
});

// TIMELINE ANIMATIONS
const timelineObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animationDelay = "0s";
                }, index * 200);
            }
        });
    }, { threshold: 0.1 },
);

document.querySelectorAll(".timeline-item").forEach((item) => {
    timelineObserver.observe(item);
});

// STORY CARD HOVER EFFECTS
document.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("mouseenter", function() {
        this.style.transform = "translateY(-5px)";
    });
    card.addEventListener("mouseleave", function() {
        this.style.transform = "translateY(0)";
    });
});

// PHILOSOPHY ITEM HOVER
document.querySelectorAll(".philosophy-item").forEach((item) => {
    item.addEventListener("mouseenter", function() {
        this.style.borderColor = "var(--gold)";
    });
    item.addEventListener("mouseleave", function() {
        this.style.borderColor = "var(--border)";
    });
});

// EXPERTISE ITEM HOVER
document.querySelectorAll(".expertise-item").forEach((item) => {
    item.addEventListener("mouseenter", function() {
        this.style.borderLeftColor = "var(--gold)";
    });
    item.addEventListener("mouseleave", function() {
        this.style.borderLeftColor = "transparent";
    });
});