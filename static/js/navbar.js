const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const navIcon = document.querySelector(".nav-toggle i");
navToggle.addEventListener("click", function () {
    const isOpen = navMenu.classList.toggle("nav-menu_visible");

    document.body.classList.toggle("menu-open", isOpen);
    if (isOpen) {
        this.setAttribute("aria-expanded", "true");
        this.setAttribute("aria-label", "Close menu");
        navIcon.classList.remove("fa-bars");
        navIcon.classList.add("fa-times");
    }
    else {
        this.setAttribute("aria-expanded", "false");
        this.setAttribute("aria-label", "Open menu");
        navIcon.classList.remove("fa-times");
        navIcon.classList.add("fa-bars");
    }
});