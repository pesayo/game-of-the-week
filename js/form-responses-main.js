// Main entry point for Form Responses page
import { picksUrl } from './config/constants.js';

// Global state
let allResponses = [];
let currentFilter = 'serious';

/**
 * Fetches form responses data from Google Sheets CSV
 */
async function fetchFormResponses() {
    try {
        const data = await d3.csv(picksUrl);
        return data;
    } catch (error) {
        console.error("Error fetching form responses:", error);
        throw new Error(`Failed to fetch form responses: ${error.message}`);
    }
}

/**
 * Processes and filters responses for the "What should we do with the money?" column
 */
function processResponses(data) {
    const MONEY_COLUMN = "What should we do with the money? (optional)";
    const CATEGORY_COLUMN = "Money Response Category"; // New column for silly/serious
    const responses = [];

    data.forEach(row => {
        const moneyResponse = row[MONEY_COLUMN];
        const playerName = row["Your Name"];
        const timestamp = row["Timestamp"];
        const category = row[CATEGORY_COLUMN];

        // Only include rows with a non-empty response
        if (moneyResponse && moneyResponse.trim() !== '') {
            responses.push({
                playerName: playerName || "Unknown",
                timestamp: timestamp || "",
                response: moneyResponse.trim(),
                category: (category && category.trim().toLowerCase()) || "uncategorized"
            });
        }
    });

    return responses;
}

/**
 * Formats a timestamp for display
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return "";

    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return timestamp;
    }
}

/**
 * Renders the summary statistics
 */
function renderSummary(responses) {
    const summaryContainer = document.getElementById('responsesSummary');

    const totalResponses = responses.length;
    const uniquePlayers = new Set(responses.map(r => r.playerName)).size;
    const sillyCount = responses.filter(r => r.category === 'silly').length;
    const seriousCount = responses.filter(r => r.category === 'serious').length;

    summaryContainer.innerHTML = `
        <div class="summary-card">
            <div class="summary-icon">
                <i class="fas fa-comment-dots"></i>
            </div>
            <div class="summary-details">
                <div class="summary-value">${totalResponses}</div>
                <div class="summary-label">Total Responses</div>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="summary-details">
                <div class="summary-value">${uniquePlayers}</div>
                <div class="summary-label">Players</div>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">
                <i class="fas fa-laugh"></i>
            </div>
            <div class="summary-details">
                <div class="summary-value">${sillyCount}</div>
                <div class="summary-label">Silly</div>
            </div>
        </div>
        <div class="summary-card">
            <div class="summary-icon">
                <i class="fas fa-lightbulb"></i>
            </div>
            <div class="summary-details">
                <div class="summary-value">${seriousCount}</div>
                <div class="summary-label">Serious</div>
            </div>
        </div>
    `;
}

/**
 * Gets the category badge HTML
 */
function getCategoryBadge(category) {
    const badges = {
        'silly': '<span class="category-badge silly"><i class="fas fa-laugh"></i> Silly</span>',
        'serious': '<span class="category-badge serious"><i class="fas fa-lightbulb"></i> Serious</span>',
        'uncategorized': '<span class="category-badge uncategorized"><i class="fas fa-question"></i> Uncategorized</span>'
    };
    return badges[category] || badges['uncategorized'];
}

/**
 * Shuffles an array randomly (Fisher-Yates shuffle)
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Renders the responses list
 */
function renderResponses(responses) {
    const listContainer = document.getElementById('responsesList');

    // Filter responses based on current filter
    let filteredResponses = responses;
    if (currentFilter !== 'all') {
        filteredResponses = responses.filter(r => r.category === currentFilter);
    }

    if (filteredResponses.length === 0) {
        const message = currentFilter === 'all'
            ? 'No responses yet!'
            : `No ${currentFilter} responses yet!`;
        listContainer.innerHTML = `
            <div class="no-responses">
                <i class="fas fa-inbox"></i>
                <p>${message}</p>
            </div>
        `;
        return;
    }

    // Randomize order
    const randomizedResponses = shuffleArray(filteredResponses);

    const responsesHTML = randomizedResponses.map((item, index) => `
        <div class="response-card" style="animation-delay: ${index * 0.02}s">
            <div class="response-header">
                <div class="response-player">
                    <i class="fas fa-user"></i>
                    <strong>${item.playerName}</strong>
                </div>
                ${getCategoryBadge(item.category)}
            </div>
            <div class="response-content">
                ${item.response}
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = responsesHTML;
}

/**
 * Sets up filter button event listeners
 */
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update current filter
            currentFilter = button.dataset.filter;

            // Re-render responses
            renderResponses(allResponses);
        });
    });
}

/**
 * Shows the loading indicator
 */
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('responsesContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Shows the content
 */
function showContent() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('responsesContent').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Shows an error message
 */
function showError(message) {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('responsesContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorText').textContent = message;
}

/**
 * Main initialization function
 */
async function init() {
    showLoading();

    try {
        // Fetch the form responses data
        const data = await fetchFormResponses();

        // Process the responses
        allResponses = processResponses(data);

        // Render the page
        renderSummary(allResponses);
        renderResponses(allResponses);

        // Setup filter buttons
        setupFilters();

        // Show the content
        showContent();
    } catch (error) {
        console.error("Failed to initialize form responses page:", error);
        showError("Failed to load form responses. Please try refreshing the page.");
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
