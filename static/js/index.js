let ticking = false;
let currentCard = null;


document.addEventListener("DOMContentLoaded", function () {
    const shouldHover =
        document.body.clientWidth >= 768 && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

    if (shouldHover) {

        const cardGrid = document.querySelector(".cards-grid");
        cardGrid.addEventListener("pointermove", onPointerMove);
        cardGrid.addEventListener("pointerleave", onPointerLeave);
    }
    const acc = document.getElementsByClassName("accordion");
    if (!acc) {
        return;
    }
    for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function () {
            this.classList.toggle("active");
            this.setAttribute("aria-expanded", this.classList.contains("active"));
            const panel = this.nextElementSibling;
            panel.setAttribute("aria-hidden", !this.classList.contains("active"));
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
});





function onPointerMove(e) {
    let newCard = e.target.closest(".card");
    if (!newCard) {
        return;
    }
    if (newCard != currentCard) {
        if (currentCard) {
            handleLeave({ currentTarget: currentCard });
        }
        currentCard = newCard;
        handleMove({ currentTarget: currentCard, clientX: e.clientX, clientY: e.clientY });
    } else {
        handleMove({ currentTarget: currentCard, clientX: e.clientX, clientY: e.clientY });
    }
}
function handleMove(e) {
    const currentCard = e.currentTarget;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateUI(currentCard, clientX, clientY);
            ticking = false;
        });
        ticking = true;
    }
}

function updateUI(card, clientX, clientY) {
    if (!card) {
        return;
    }
    const rect = card.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const px = x / rect.width - 0.5; //this calculates pointer position from center [-0.5 .. +0.5], like on w3 school
    const py = y / rect.height - 0.5;

    const rotMax = 13; //max rotation in degrees, but I think 13 is not that much, it looks similar to github

    const rotY = px * rotMax; //invert Y so moving up tilts toward you
    const rotX = -py * rotMax;

    const scale = 1.03; //slightly scale up on hover

    card.style.transform = `perspective(1000px)
rotateX(${rotX}deg)
rotateY(${rotY}deg)
scale(${scale})`;

    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
}
function onPointerLeave(e) {
    if (currentCard) {
        handleLeave({ currentTarget: currentCard });
        currentCard = null;
    }
}
function handleLeave(e) {
    const card = e.currentTarget.closest(".card");
    if (!card) {
        console.warn("No card!!! found");
        return;
    }
    console.log("mouselSSSeave");
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
}
