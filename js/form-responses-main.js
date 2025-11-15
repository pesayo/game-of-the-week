// Main entry point for Form Responses page
import { picksUrl } from './config/constants.js';

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
    const responses = [];

    data.forEach(row => {
        const moneyResponse = row[MONEY_COLUMN];
        const playerName = row["Your Name"];
        const timestamp = row["Timestamp"];

        // Only include rows with a non-empty response
        if (moneyResponse && moneyResponse.trim() !== '') {
            responses.push({
                playerName: playerName || "Unknown",
                timestamp: timestamp || "",
                response: moneyResponse.trim()
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
    `;
}

/**
 * Renders the responses list
 */
function renderResponses(responses) {
    const listContainer = document.getElementById('responsesList');

    if (responses.length === 0) {
        listContainer.innerHTML = `
            <div class="no-responses">
                <i class="fas fa-inbox"></i>
                <p>No responses yet!</p>
            </div>
        `;
        return;
    }

    // Sort by timestamp (most recent first)
    const sortedResponses = [...responses].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const responsesHTML = sortedResponses.map((item, index) => `
        <div class="response-card" style="animation-delay: ${index * 0.05}s">
            <div class="response-header">
                <div class="response-player">
                    <i class="fas fa-user"></i>
                    <strong>${item.playerName}</strong>
                </div>
                <div class="response-timestamp">
                    <i class="fas fa-clock"></i>
                    ${formatTimestamp(item.timestamp)}
                </div>
            </div>
            <div class="response-content">
                ${item.response}
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = responsesHTML;
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
        const responses = processResponses(data);

        // Render the page
        renderSummary(responses);
        renderResponses(responses);

        // Show the content
        showContent();
    } catch (error) {
        console.error("Failed to initialize form responses page:", error);
        showError("Failed to load form responses. Please try refreshing the page.");
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
