/**
 * Player Focus Component
 * Provides a dropdown in the header to persistently focus on a specific player
 */

import { getFocusedPlayer, setFocusedPlayer, getLeaderboardData, getCurrentView, getCurrentSort, getCurrentDirection } from '../state/app-state.js';
import { renderLeaderboard, getDataForView, applyFilters, sortData } from './Leaderboard.js';
import { renderHorseRace } from './HorseRace.js';
import { setupCombinedPicksView } from './PicksMatrix.js';
import { updateProjectedStandings } from './WhatIf.js';
import { renderSimilarityMatrix, renderSimilarityControls } from './SimilarityMatrix.js';

/**
 * Initialize focused player from localStorage
 */
export function initializeFocusedPlayer() {
    const savedPlayer = localStorage.getItem('gameoftheweek_focusedPlayer');
    if (savedPlayer) {
        setFocusedPlayer(savedPlayer);
    }
}

/**
 * Create and render the player focus dropdown
 */
export function renderPlayerFocusDropdown() {
    const weekSelectorSection = document.querySelector('.week-selector-section');

    if (!weekSelectorSection) return;

    // Check if dropdown already exists
    let dropdown = document.getElementById('playerFocusDropdown');
    if (dropdown) {
        // Update the options and button visibility
        populateDropdownOptions(dropdown);
        const picksBtn = document.getElementById('viewPlayerPicksBtn');
        const focusedPlayer = getFocusedPlayer();
        if (picksBtn) {
            picksBtn.style.display = focusedPlayer ? 'inline-flex' : 'none';
        }
        return;
    }

    // Create dropdown container
    const container = document.createElement('div');
    container.className = 'player-focus-section';
    container.innerHTML = `
        <label for="playerFocusDropdown" class="player-focus-label">
            <i class="fas fa-user-check"></i> Highlight Player:
        </label>
        <div class="player-focus-controls">
            <select id="playerFocusDropdown" class="player-focus-dropdown">
                <option value="">None</option>
            </select>
            <button id="viewPlayerPicksBtn" class="view-picks-btn" style="display: none;" title="View player's picks">
                <i class="fas fa-list-ul"></i>
            </button>
        </div>
    `;

    // Insert after the week selector section
    weekSelectorSection.parentNode.insertBefore(container, weekSelectorSection.nextSibling);

    dropdown = document.getElementById('playerFocusDropdown');
    populateDropdownOptions(dropdown);
    setupDropdownHandler(dropdown);
    setupPicksButtonHandler();
}

/**
 * Populate dropdown with player names
 */
function populateDropdownOptions(dropdown) {
    const leaderboardData = getLeaderboardData();
    const focusedPlayer = getFocusedPlayer();

    // Get sorted list of player names
    const playerNames = leaderboardData
        .map(p => p.name)
        .sort((a, b) => a.localeCompare(b));

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">No player selected</option>';

    // Add player options
    playerNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === focusedPlayer) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

/**
 * Setup dropdown change handler
 */
function setupDropdownHandler(dropdown) {
    dropdown.addEventListener('change', (e) => {
        const selectedPlayer = e.target.value || null;
        setFocusedPlayer(selectedPlayer);

        // Show/hide the view picks button
        const picksBtn = document.getElementById('viewPlayerPicksBtn');
        if (picksBtn) {
            picksBtn.style.display = selectedPlayer ? 'inline-flex' : 'none';
        }

        // Re-render affected components
        refreshFocusedViews();
    });
}

/**
 * Setup picks button handler
 */
function setupPicksButtonHandler() {
    const picksBtn = document.getElementById('viewPlayerPicksBtn');
    const focusedPlayer = getFocusedPlayer();

    if (picksBtn) {
        // Show button if player is selected
        picksBtn.style.display = focusedPlayer ? 'inline-flex' : 'none';

        picksBtn.addEventListener('click', () => {
            const player = getFocusedPlayer();
            if (player && window.showPlayerDetails) {
                window.showPlayerDetails(player);
            }
        });
    }
}

/**
 * Refresh all views that display focused player highlighting
 */
export function refreshFocusedViews() {
    const leaderboardData = getLeaderboardData();
    const currentView = getCurrentView();

    // Get data for the current view (player/team/position)
    const viewData = getDataForView(currentView);

    // Apply filters only for player view
    const filteredData = currentView === 'player' ? applyFilters(viewData) : viewData;

    // Apply current sort
    const currentSort = getCurrentSort();
    const currentDirection = getCurrentDirection();
    const sortedData = sortData(filteredData, currentSort, currentDirection);

    // Re-render leaderboard with highlighting
    renderLeaderboard(sortedData);

    // Re-render horse race to update default active player
    renderHorseRace(leaderboardData);

    // Re-render picks view
    setupCombinedPicksView();

    // Re-render similarity matrix to highlight focused player
    renderSimilarityControls();
    renderSimilarityMatrix();

    // Re-render what-if projected standings
    updateProjectedStandings();

    // Scroll to highlighted player
    scrollToHighlightedPlayer();
}

/**
 * Scroll to the highlighted player in the standings table (within the table container only)
 */
export function scrollToHighlightedPlayer() {
    const focusedPlayer = getFocusedPlayer();
    if (!focusedPlayer) return;

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
        const leaderboardTable = document.getElementById('leaderboardTable');
        if (!leaderboardTable) return;

        // Find the highlighted row
        const highlightedRow = leaderboardTable.querySelector('tbody tr.focused-player, tbody tr.focused-group');

        if (highlightedRow) {
            // Get the scrollable container (the table itself has overflow-y: auto)
            const scrollContainer = leaderboardTable;

            // Calculate positions
            const containerRect = scrollContainer.getBoundingClientRect();
            const rowRect = highlightedRow.getBoundingClientRect();

            // Calculate the scroll position to center the row within the container
            const containerHeight = containerRect.height;
            const rowTop = highlightedRow.offsetTop;
            const rowHeight = rowRect.height;

            // Target scroll position to center the row
            const targetScroll = rowTop - (containerHeight / 2) + (rowHeight / 2);

            // Smooth scroll within the container
            scrollContainer.scrollTo({
                top: targetScroll,
                behavior: 'smooth'
            });
        }
    });
}
