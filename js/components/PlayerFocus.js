/**
 * Player Focus Component
 * Provides a dropdown in the header to persistently focus on a specific player
 */

import { getFocusedPlayer, setFocusedPlayer, getLeaderboardData } from '../state/app-state.js';
import { renderLeaderboard } from './Leaderboard.js';
import { renderHorseRace } from './HorseRace.js';
import { setupCombinedPicksView } from './PicksMatrix.js';
import { updateProjectedStandings } from './WhatIf.js';

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
    const dashboardGrid = document.getElementById('dashboardGrid');
    const upcomingSection = document.querySelector('.upcoming-section');

    if (!dashboardGrid || !upcomingSection) return;

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
    container.className = 'player-focus-container';
    container.innerHTML = `
        <label for="playerFocusDropdown" class="player-focus-label">Highlight:</label>
        <select id="playerFocusDropdown" class="player-focus-dropdown">
            <option value="">No player selected</option>
        </select>
        <button id="viewPlayerPicksBtn" class="view-picks-btn" style="display: none;" title="View player's picks">
            <i class="fas fa-list-ul"></i>
        </button>
    `;

    // Insert before the upcoming section
    dashboardGrid.insertBefore(container, upcomingSection);

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

    // Re-render leaderboard with highlighting
    renderLeaderboard(leaderboardData);

    // Re-render horse race to update default active player
    renderHorseRace(leaderboardData);

    // Re-render picks view
    setupCombinedPicksView();

    // Re-render what-if projected standings
    updateProjectedStandings();
}
