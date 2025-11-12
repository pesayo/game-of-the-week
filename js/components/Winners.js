// Winners component - displays current holders and pantheon history

import { getWinnersData } from '../state/app-state.js';

/**
 * Render current holder cards in the header
 */
export function renderCurrentHolders() {
    const winnersData = getWinnersData();
    if (!winnersData) return;

    const container = document.getElementById('currentHoldersContainer');
    if (!container) return;

    container.innerHTML = '';

    // Create Goblet holder card
    if (winnersData.currentGobletHolder) {
        const gobletCard = createHolderCard(
            'Game of the Week Goblet',
            winnersData.currentGobletHolder,
            'goblet'
        );
        container.appendChild(gobletCard);
    }

    // Create Funk-Eng Cup holder card
    if (winnersData.currentFunkEngHolder) {
        const funkEngCard = createHolderCard(
            'Funk-Eng Cup',
            winnersData.currentFunkEngHolder,
            'funk-eng'
        );
        container.appendChild(funkEngCard);
    }
}

/**
 * Create a holder card element
 * @param {string} title - Trophy title
 * @param {string} holder - Current holder name
 * @param {string} type - Trophy type ('goblet' or 'funk-eng')
 * @returns {HTMLElement} Card element
 */
function createHolderCard(title, holder, type) {
    const card = document.createElement('div');
    card.className = 'holder-card';
    card.innerHTML = `
        <div class="holder-trophy-icon ${type}">
            <i class="fas ${type === 'goblet' ? 'fa-trophy' : 'fa-medal'}"></i>
        </div>
        <div class="holder-info">
            <div class="holder-title">${title}</div>
            <div class="holder-name">${holder}</div>
        </div>
    `;
    return card;
}

/**
 * Show the Pantheon modal with winners history
 */
export function showPantheonModal() {
    const winnersData = getWinnersData();
    if (!winnersData) return;

    const modal = document.getElementById('pantheonModal');
    if (!modal) return;

    // Populate Goblet history
    const gobletList = document.getElementById('gobletHistoryList');
    gobletList.innerHTML = '';
    winnersData.history.forEach(entry => {
        if (entry.goblet) {
            const item = createHistoryItem(entry.season, entry.subseason, entry.goblet);
            gobletList.appendChild(item);
        }
    });

    // Populate Funk-Eng Cup history
    const funkEngList = document.getElementById('funkEngHistoryList');
    funkEngList.innerHTML = '';
    winnersData.history.forEach(entry => {
        if (entry.funkEng) {
            const item = createHistoryItem(entry.season, entry.subseason, entry.funkEng);
            funkEngList.appendChild(item);
        }
    });

    modal.classList.add('active');
}

/**
 * Create a history item element
 * @param {string} season - Season string
 * @param {string} subseason - Subseason string (optional)
 * @param {string} winner - Winner name
 * @returns {HTMLElement} History item element
 */
function createHistoryItem(season, subseason, winner) {
    const item = document.createElement('div');
    item.className = 'pantheon-history-item';

    const seasonText = subseason ? `${season} (${subseason})` : season;

    item.innerHTML = `
        <div class="pantheon-season">${seasonText}</div>
        <div class="pantheon-winner">${winner}</div>
    `;
    return item;
}

/**
 * Close the Pantheon modal
 */
export function closePantheonModal() {
    const modal = document.getElementById('pantheonModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Setup event handlers for Pantheon modal
 */
export function setupPantheonModal() {
    // Close modal on overlay click
    const modal = document.getElementById('pantheonModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'pantheonModal') {
                closePantheonModal();
            }
        });
    }

    // Close button
    const closeBtn = document.getElementById('closePantheon');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePantheonModal);
    }

    // Pantheon link
    const pantheonLink = document.getElementById('pantheonLink');
    if (pantheonLink) {
        pantheonLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPantheonModal();
        });
    }
}

// Make showPantheonModal available globally for inline onclick handlers
if (typeof window !== 'undefined') {
    window.showPantheonModal = showPantheonModal;
}
