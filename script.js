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
