


let currentTheme = localStorage.getItem("theme");
if (!currentTheme) {
    currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
applyTheme(currentTheme);

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
        const newColorScheme = e.matches ? "dark" : "light";
        applyTheme(newColorScheme);
    }
});

function applyTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.setAttribute("data-theme", "light");
    }
}
function saveThemePreference(theme) {
    localStorage.setItem("theme", theme);
}

document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById("theme-checkbox");
    if (themeToggle) {
        const currentTheme = localStorage.getItem("theme");
        if (document.documentElement.getAttribute("data-theme") === "dark" || currentTheme === "dark") {
            themeToggle.checked = true;
        }
        themeToggle.addEventListener("change", function () {
            if (this.checked) {
                applyTheme("dark");
                saveThemePreference("dark");
                this.checked = true;
            } else {
                applyTheme("light");
                saveThemePreference("light");
                this.checked = false;
            }
        });
    }
});
