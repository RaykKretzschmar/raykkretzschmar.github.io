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

document.addEventListener('DOMContentLoaded', () => {
    const textElement = document.getElementById('welcome-text');
    const text = textElement.textContent;
    textElement.textContent = ''; // Clear text initially

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.classList.add('cursor');
    textElement.appendChild(cursor);

    let index = 0;

    function typeWriter() {
        if (index < text.length) {
            // Insert character before the cursor
            cursor.before(text.charAt(index));
            index++;
            setTimeout(typeWriter, 100); // Adjust typing speed here
        } else {
            // Optional: Remove cursor after typing is done
            // cursor.remove(); 
        }
    }

    // Start typing after a small delay
    setTimeout(typeWriter, 500);

    // Scroll Animation for Timeline Items
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Animate only once
            }
        });
    }, observerOptions);

    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        observer.observe(item);
    });
});
