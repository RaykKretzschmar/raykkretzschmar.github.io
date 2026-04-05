const ORCID_API_BASE = 'https://pub.orcid.org/v3.0';
const SEMANTIC_SCHOLAR_API_BASE = 'https://api.semanticscholar.org/graph/v1';
const PUBLICATIONS_CACHE_KEY = 'publications-cache-v1';
const PUBLICATIONS_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const PUBLICATIONS_FETCH_TIMEOUT_MS = 9000;

const MANUAL_PUBLICATIONS = {
    Thesis: [
        {
            title: 'Evaluating pre-training techniques for single-vector encoder models',
            authors: ['Rayk Kretzschmar'],
            topics: ['Information Retrieval', 'Natural Language Processing', 'Machine Learning'],
            year: '2025',
            externalIds: [
                {
                    type: 'DOI',
                    value: '10.22032/dbt.69588',
                    url: 'https://doi.org/10.22032/dbt.69588'
                }
            ]
        }
    ],
};

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setupMobileMenu() {
    const burger = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');

    if (!burger || !navLinks) {
        return;
    }

    burger.addEventListener('click', () => {
        const expanded = burger.getAttribute('aria-expanded') === 'true';
        burger.setAttribute('aria-expanded', String(!expanded));
        navLinks.classList.toggle('nav-active');
    });

    document.querySelectorAll('.nav-link-item').forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('nav-active');
            burger.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', (event) => {
        const clickedInsideNav = navLinks.contains(event.target) || burger.contains(event.target);
        if (!clickedInsideNav) {
            navLinks.classList.remove('nav-active');
            burger.setAttribute('aria-expanded', 'false');
        }
    });
}

function setupGravityModal() {
    const trigger = document.getElementById('open-gravity-sim');
    const modal = document.getElementById('gravity-modal');
    const closeButton = document.getElementById('gravity-modal-close');

    if (!trigger || !modal || !closeButton || typeof GravitySimulation === 'undefined') {
        return;
    }

    let gravitySim = null;

    function openModal(event) {
        event.preventDefault();
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('gravity-modal-open');

        if (!gravitySim) {
            gravitySim = new GravitySimulation('gravity-modal-canvas', {
                containerId: 'gravity-modal-canvas-wrap'
            });
        }

        gravitySim.resizeCanvas();
        gravitySim.start();
        closeButton.focus();
    }

    function closeModal() {
        if (gravitySim) {
            gravitySim.stop();
        }

        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('gravity-modal-open');
        trigger.focus();
    }

    trigger.addEventListener('click', openModal);
    closeButton.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) {
            closeModal();
        }
    });
}

function inferPublicationCategory(workType = '') {
    const normalized = String(workType).toLowerCase();

    if (normalized.includes('conference')) {
        return 'Conference';
    }

    if (normalized.includes('preprint') || normalized.includes('working-paper')) {
        return 'Preprint';
    }

    if (normalized.includes('software') || normalized.includes('database')) {
        return 'Software Paper';
    }

    return 'Journal';
}

function fetchWithTimeout(url, options = {}, timeoutMs = PUBLICATIONS_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        ...options,
        signal: controller.signal
    }).finally(() => {
        window.clearTimeout(timeoutId);
    });
}

function readPublicationsCache(cacheKey) {
    try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed.timestamp || !parsed.payload) {
            return null;
        }

        if (Date.now() - parsed.timestamp > PUBLICATIONS_CACHE_TTL_MS) {
            localStorage.removeItem(cacheKey);
            return null;
        }

        return parsed.payload;
    } catch (error) {
        console.warn('Failed to read publications cache:', error);
        return null;
    }
}

function writePublicationsCache(cacheKey, payload) {
    try {
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            payload
        }));
    } catch (error) {
        console.warn('Failed to write publications cache:', error);
    }
}

function getOrcidFromSemanticExternalIds(externalIds) {
    if (!externalIds || typeof externalIds !== 'object') {
        return '';
    }

    const candidates = externalIds.ORCID || externalIds.orcid || [];
    if (Array.isArray(candidates)) {
        return candidates[0] || '';
    }

    return String(candidates || '');
}

function mapSemanticExternalIds(externalIds) {
    if (!externalIds || typeof externalIds !== 'object') {
        return [];
    }

    const doi = externalIds.DOI || externalIds.doi;
    const arxiv = externalIds.ArXiv || externalIds.ARXIV || externalIds.arxiv;

    if (doi) {
        return [{
            type: 'DOI',
            value: String(doi),
            url: `https://doi.org/${doi}`
        }];
    }

    if (arxiv) {
        return [{
            type: 'ARXIV',
            value: String(arxiv),
            url: `https://arxiv.org/abs/${arxiv}`
        }];
    }

    return [];
}

function inferSemanticPublicationCategory(publicationTypes = []) {
    const normalized = Array.isArray(publicationTypes)
        ? publicationTypes.map((type) => String(type).toLowerCase())
        : [];

    if (normalized.some((type) => type.includes('conference'))) {
        return 'Conference';
    }

    if (normalized.some((type) => type.includes('preprint'))) {
        return 'Preprint';
    }

    if (normalized.some((type) => type.includes('journal'))) {
        return 'Journal';
    }

    return 'Journal';
}

function normalizeAuthorNames(authors = []) {
    if (!Array.isArray(authors)) {
        return [];
    }

    return authors
        .map((author) => {
            if (!author) {
                return '';
            }

            if (typeof author === 'string') {
                return author.trim();
            }

            if (typeof author.name === 'string') {
                return author.name.trim();
            }

            return '';
        })
        .filter(Boolean);
}

function normalizeTopics(topics = []) {
    if (!Array.isArray(topics)) {
        return [];
    }

    const uniqueTopics = new Set();

    topics.forEach((topic) => {
        const normalizedTopic = String(topic || '').trim();
        if (!normalizedTopic) {
            return;
        }

        uniqueTopics.add(normalizedTopic);
    });

    return Array.from(uniqueTopics);
}

function pickPrimaryExternalId(externalIds = []) {
    if (!Array.isArray(externalIds) || externalIds.length === 0) {
        return null;
    }

    const priorityOrder = ['DOI', 'ARXIV'];
    for (const priorityType of priorityOrder) {
        const match = externalIds.find((id) => String(id.type || '').toUpperCase() === priorityType);
        if (match) {
            return match;
        }
    }

    return externalIds[0];
}

function renderPublicationGroups(publicationsByType) {
    return Object.entries(publicationsByType)
        .map(([type, entries]) => {
            const items = entries
                .map((entry) => {
                    const externalId = pickPrimaryExternalId(entry.externalIds);
                    const externalLabel = externalId
                        ? `${escapeHtml(externalId.type)}: ${escapeHtml(externalId.value)}`
                        : 'No DOI/arXiv listed';
                    const externalLink = externalId && externalId.url
                        ? `<a href="${escapeHtml(externalId.url)}" target="_blank" rel="noopener noreferrer">${externalLabel}</a>`
                        : externalLabel;
                    const authorsText = entry.authors && entry.authors.length > 0
                        ? entry.authors.join(', ')
                        : 'Authors not listed';
                    const topicsText = entry.topics && entry.topics.length > 0
                        ? entry.topics.join(', ')
                        : 'Topic not listed';

                    return `
                        <li>
                            <span class="pub-title">${escapeHtml(entry.title)}</span>
                            <span class="pub-authors">Authors: ${escapeHtml(authorsText)}</span>
                            <span class="pub-topics">Topics: ${escapeHtml(topicsText)}</span>
                            <span class="pub-meta">${escapeHtml(entry.year || 'Year not provided')}</span>
                            <span class="status published">Published</span>
                            <p class="contribution-note">${externalLink}</p>
                        </li>
                    `;
                })
                .join('');

            return `
                <article class="publication-group">
                    <h3>${type}</h3>
                    <ul>${items}</ul>
                </article>
            `;
        })
        .join('');
}

async function fetchOrcidWorks(orcidId) {
    const response = await fetchWithTimeout(`${ORCID_API_BASE}/${orcidId}/works`, {
        headers: {
            Accept: 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`ORCID summary request failed with status ${response.status}`);
    }

    const data = await response.json();
    const groups = data.group || [];

    const putCodes = groups
        .map((group) => group['work-summary'] || [])
        .flat()
        .map((summary) => summary['put-code'])
        .filter(Boolean)
        .slice(0, 12);

    const workRequests = putCodes.map(async (putCode) => {
        const workResponse = await fetchWithTimeout(`${ORCID_API_BASE}/${orcidId}/work/${putCode}`, {
            headers: {
                Accept: 'application/json'
            }
        });

        if (!workResponse.ok) {
            return null;
        }

        const work = await workResponse.json();
        const title = work.title?.title?.value || 'Untitled work';
        const year = work['publication-date']?.year?.value || '';
        const type = inferPublicationCategory(work.type);
        const authors = normalizeAuthorNames((work.contributors?.contributor || []).map((contributor) => (
            contributor?.['credit-name']?.value || contributor?.['contributor-attributes']?.['contributor-role'] || ''
        )));

        const externalIds = (work['external-ids']?.['external-id'] || [])
            .map((id) => {
                const value = id['external-id-value'];
                const idType = id['external-id-type'];
                const url = id['external-id-url']?.value || '';

                if (!value || !idType) {
                    return null;
                }

                if (url) {
                    return { type: idType.toUpperCase(), value, url };
                }

                if (idType.toLowerCase() === 'doi') {
                    return { type: 'DOI', value, url: `https://doi.org/${value}` };
                }

                if (idType.toLowerCase() === 'arxiv') {
                    return { type: 'ARXIV', value, url: `https://arxiv.org/abs/${value}` };
                }

                return { type: idType.toUpperCase(), value, url: '' };
            })
            .filter(Boolean);

        return {
            title,
            year,
            type,
            externalIds,
            citationCount: null,
            authors,
            topics: normalizeTopics([type])
        };
    });

    const works = (await Promise.all(workRequests)).filter(Boolean);

    return works.reduce((acc, work) => {
        if (!acc[work.type]) {
            acc[work.type] = [];
        }
        acc[work.type].push(work);
        return acc;
    }, {});
}

async function fetchSemanticScholarWorks(orcidId) {
    const searchUrl = `${SEMANTIC_SCHOLAR_API_BASE}/author/search?query=${encodeURIComponent(orcidId)}&limit=5&fields=authorId,name,externalIds`;
    const searchResponse = await fetchWithTimeout(searchUrl, {
        headers: {
            Accept: 'application/json'
        }
    });

    if (!searchResponse.ok) {
        throw new Error(`Semantic Scholar author search failed with status ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const authors = searchData.data || [];
    const normalizedOrcid = String(orcidId).trim();

    const matchingAuthor = authors.find((author) => {
        const authorOrcid = getOrcidFromSemanticExternalIds(author.externalIds);
        return authorOrcid === normalizedOrcid;
    }) || authors[0];

    if (!matchingAuthor || !matchingAuthor.authorId) {
        throw new Error('Semantic Scholar author not found for ORCID id');
    }

    const papersUrl = `${SEMANTIC_SCHOLAR_API_BASE}/author/${encodeURIComponent(matchingAuthor.authorId)}/papers?limit=100&fields=title,year,publicationTypes,externalIds,citationCount,authors,fieldsOfStudy,s2FieldsOfStudy`;
    const papersResponse = await fetchWithTimeout(papersUrl, {
        headers: {
            Accept: 'application/json'
        }
    });

    if (!papersResponse.ok) {
        throw new Error(`Semantic Scholar papers request failed with status ${papersResponse.status}`);
    }

    const papersData = await papersResponse.json();
    const papers = papersData.data || [];

    const works = papers
        .filter((paper) => paper && paper.title)
        .map((paper) => {
            const semanticTopics = Array.isArray(paper.s2FieldsOfStudy)
                ? paper.s2FieldsOfStudy.map((entry) => entry?.category).filter(Boolean)
                : [];

            return {
                title: paper.title,
                year: paper.year || '',
                type: inferSemanticPublicationCategory(paper.publicationTypes),
                externalIds: mapSemanticExternalIds(paper.externalIds),
                citationCount: typeof paper.citationCount === 'number' ? paper.citationCount : null,
                authors: normalizeAuthorNames(paper.authors),
                topics: normalizeTopics([
                    ...semanticTopics,
                    ...(Array.isArray(paper.fieldsOfStudy) ? paper.fieldsOfStudy : []),
                    ...(Array.isArray(paper.publicationTypes) ? paper.publicationTypes : [])
                ])
            };
        });

    works.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));

    return works.reduce((acc, work) => {
        if (!acc[work.type]) {
            acc[work.type] = [];
        }
        acc[work.type].push(work);
        return acc;
    }, {});
}

async function loadPublications() {
    const container = document.getElementById('publications-list');

    if (!container) {
        return;
    }

    container.innerHTML = renderPublicationGroups(MANUAL_PUBLICATIONS);
}

function setupPublicationsRefresh() {
    const refreshButton = document.getElementById('refresh-publications');

    if (!refreshButton) {
        return;
    }

    refreshButton.addEventListener('click', () => {
        loadPublications();
    });
}

function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (!contactForm) {
        return;
    }

    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        if (formStatus) {
            formStatus.textContent = 'Sending your message...';
        }

        const data = Object.fromEntries(new FormData(contactForm).entries());

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Unknown error');
            }

            contactForm.reset();
            if (formStatus) {
                formStatus.textContent = 'Message sent successfully. Thank you for reaching out.';
            }
        } catch (error) {
            console.error('Failed to submit contact form:', error);
            if (formStatus) {
                formStatus.textContent = 'Could not send message right now. Please try again later.';
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

function setupChatWidget() {
    const chatWindow = document.getElementById('chat-window');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');

    if (!chatWindow || !chatToggleBtn || !chatCloseBtn || !chatSendBtn || !chatInput) {
        return;
    }

    const toggleChat = () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            chatInput.focus();
        }
    };

    chatToggleBtn.addEventListener('click', toggleChat);
    chatCloseBtn.addEventListener('click', toggleChat);

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendChatMessage();
        }
    });
}

function addChatMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    if (!messagesContainer || !typingIndicator) {
        return;
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;

    messagesContainer.insertBefore(messageDiv, typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    if (!input || !messagesContainer || !typingIndicator) {
        return;
    }

    const message = input.value.trim();
    if (!message) {
        return;
    }

    addChatMessage(message, 'user');
    input.value = '';

    typingIndicator.style.display = 'block';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        typingIndicator.style.display = 'none';

        if (!response.ok) {
            addChatMessage('Sorry, I am having trouble connecting right now. Please try again later.', 'bot');
            console.error('Chat API error:', data.error || response.statusText);
            return;
        }

        addChatMessage(data.reply || 'Sorry, I could not generate a response.', 'bot');
    } catch (error) {
        typingIndicator.style.display = 'none';
        addChatMessage('Network error. Please check your connection and try again.', 'bot');
        console.error('Chat network error:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupGravityModal();
    setupPublicationsRefresh();
    setupContactForm();
    setupChatWidget();
    loadPublications();
});
