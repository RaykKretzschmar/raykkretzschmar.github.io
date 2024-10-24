function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    navLinks.classList.toggle('nav-active');
}

function closeMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks.classList.contains('nav-active')) {
        navLinks.classList.remove('nav-active');
    }
}
