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
    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Check for saved user preference, if any, on load of the website
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        body.classList.add(currentTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        // If no preference, check system preference
        body.classList.add('dark-mode');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');

            let theme = 'light';
            if (body.classList.contains('dark-mode')) {
                theme = 'dark-mode';
            }
            localStorage.setItem('theme', theme);
        });
    }

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

    // --- Event Listeners for Interactive Elements ---

    // Burger Menu
    const burger = document.getElementById('burger-menu');
    if (burger) {
        burger.addEventListener('click', toggleMenu);
    }

    // Nav Links (Close menu on click)
    const navLinkItems = document.querySelectorAll('.nav-link-item');
    navLinkItems.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Gravity Simulation
    const playGravityBtn = document.getElementById('play-gravity-btn');
    if (playGravityBtn) {
        playGravityBtn.addEventListener('click', openGravitySimulation);
    }

    const closeGravityBtn = document.getElementById('close-gravity-btn');
    if (closeGravityBtn) {
        closeGravityBtn.addEventListener('click', closeGravitySimulation);
    }

    // Chat Widget
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', toggleChat);
    }

    const chatCloseBtn = document.getElementById('chat-close-btn');
    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', toggleChat);
    }

    const chatSendBtn = document.getElementById('chat-send-btn');
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendMessage);
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleKeyPress);
    }

    // Overlay Backdrop
    const overlayBackdrop = document.getElementById('overlay-backdrop');
    if (overlayBackdrop) {
        overlayBackdrop.addEventListener('click', (e) => {
            const card = document.getElementById('gravity-project-card');
            if (card && card.classList.contains('expanded')) {
                closeGravitySimulation(e);
            }
        });
    }
});

/* Menu Logic */
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

/* Chat Widget Logic */
function toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
        document.getElementById('chat-input').focus();
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    if (!message) return;

    // Add User Message
    addMessage(message, 'user');
    input.value = '';

    // Show Typing Indicator
    typingIndicator.style.display = 'block';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Call Serverless API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Hide Typing Indicator
        typingIndicator.style.display = 'none';

        if (response.ok) {
            addMessage(data.reply, 'bot');
        } else {
            addMessage("Sorry, I'm having trouble connecting right now. Please try again later.", 'bot');
            console.error('Chat Error:', data.error);
        }

    } catch (error) {
        typingIndicator.style.display = 'none';
        addMessage("Network error. Please check your connection.", 'bot');
        console.error('Network Error:', error);
    }
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;

    // Insert before typing indicator
    messagesContainer.insertBefore(messageDiv, typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/* Contact Form Handling */
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Message sent successfully!');
                    contactForm.reset();
                } else {
                    alert('Failed to send message: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while sending the message.');
            } finally {
                submitButton.textContent = originalButtonText;
            }
        });
    }
});

/* Gravity Simulation Inline Handling */
let gravitySimInstance = null;

function openGravitySimulation(event) {
    // Stop propagation to prevent any parent handlers (though we removed onclick from card, it's good practice)
    event.stopPropagation();

    const card = document.getElementById('gravity-project-card');
    const container = document.getElementById('gravity-sim-container');
    const overlay = document.getElementById('overlay-backdrop');

    if (!card.classList.contains('expanded')) {
        card.classList.add('expanded');
        container.style.display = 'block';
        overlay.classList.add('active');

        // Initialize simulation if not already done
        if (!gravitySimInstance) {
            // Ensure gravity.js is loaded. It is included in index.html but we need to make sure the class is available.
            // Since it's a script tag at the end of body, it should be fine.
            if (typeof GravitySimulation !== 'undefined') {
                gravitySimInstance = new GravitySimulation('inlineSimCanvas');
            } else {
                console.error("GravitySimulation class not found");
                return;
            }
        }

        // Use requestAnimationFrame to ensure the display:block has triggered a layout update
        requestAnimationFrame(() => {
            gravitySimInstance.start();
        });
    }
}

function closeGravitySimulation(event) {
    event.stopPropagation(); // Prevent bubbling to the card click handler

    const card = document.getElementById('gravity-project-card');
    const container = document.getElementById('gravity-sim-container');
    const overlay = document.getElementById('overlay-backdrop');

    card.classList.remove('expanded');
    container.style.display = 'none';
    overlay.classList.remove('active');

    if (gravitySimInstance) {
        gravitySimInstance.stop();
    }
}
