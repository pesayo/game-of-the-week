// WhatIf component - handles what-if scenario analysis

import {
    getAllGames,
    getLeaderboardData,
    getMatchupsData,
    getRawPicksData,
    getPickAnalysis,
    getWhatifSelections,
    setWhatifSelections,
    updateWhatifSelection,
    removeWhatifSelection,
    clearWhatifSelections
} from '../state/app-state.js';
import { createGameKey, parseGameColumn } from '../utils/parsers.js';
import { processData } from '../data/data-processor.js';

/**
 * Get upcoming (unplayed) games
 * @returns {Array} List of upcoming games
 */
export function getUpcomingGames() {
    const allGames = getAllGames();
    return allGames.filter(game => !game.winner);
}

/**
 * Get player's picks for upcoming games
 * @param {string} playerName - Player name
 * @returns {Object} Map of gameKey -> pick
 */
export function getPlayerPicks(playerName) {
    const rawPicksData = getRawPicksData();
    const playerRow = rawPicksData.find(row => {
        const headers = Object.keys(row);
        const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
        const rowName = row[nameHeader] ? row[nameHeader].trim() : '';
        return rowName === playerName;
    });

    if (!playerRow) return {};

    const picks = {};
    const upcomingGames = getUpcomingGames();
    const headers = Object.keys(playerRow);

    upcomingGames.forEach(game => {
        // Find the matching header for this game
        headers.forEach(header => {
            const gameInfo = parseGameColumn(header);
            if (gameInfo) {
                const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
                if (gameKey === game.gameKey) {
                    const pick = playerRow[header];
                    if (pick) {
                        picks[gameKey] = pick;
                    }
                }
            }
        });
    });

    return picks;
}

/**
 * Render what-if analysis panel
 */
export function renderWhatIfPanel() {
    const upcomingGames = getUpcomingGames();

    if (upcomingGames.length === 0) {
        document.getElementById('whatifSection').style.display = 'none';
        return;
    }

    document.getElementById('whatifSection').style.display = 'block';

    const whatifSelections = getWhatifSelections();
    const pickAnalysis = getPickAnalysis();

    // Update summary
    const selectionCount = Object.keys(whatifSelections).length;
    document.getElementById('selectionCount').textContent = selectionCount;
    document.getElementById('totalGamesCount').textContent = upcomingGames.length;

    const container = document.getElementById('upcomingGames');
    container.innerHTML = '';

    upcomingGames.forEach(game => {
        const analysis = pickAnalysis[game.gameKey];
        const card = document.createElement('div');
        card.className = 'game-card';

        const team1IsChalk = analysis && analysis.chalkPick === game.team1;
        const team2IsChalk = analysis && analysis.chalkPick === game.team2;

        card.innerHTML = `
            <div class="game-card-header">
                Week ${game.week} | ${game.date} | ${game.time} | Sheet ${game.sheet}
            </div>
            <div class="game-matchup">
                <div class="team-option ${team1IsChalk ? 'chalk' : ''} ${whatifSelections[game.gameKey] === game.team1 ? 'selected' : ''}"
                     data-gamekey="${game.gameKey}" data-team="${game.team1}">
                    <input type="radio" name="game-${game.gameKey}" value="${game.team1}"
                           ${whatifSelections[game.gameKey] === game.team1 ? 'checked' : ''}>
                    <span class="team-name">${game.team1}</span>
                    ${analysis ? `<span class="pick-count">${analysis.team1Picks} picks</span>` : ''}
                </div>
                <div class="team-option ${team2IsChalk ? 'chalk' : ''} ${whatifSelections[game.gameKey] === game.team2 ? 'selected' : ''}"
                     data-gamekey="${game.gameKey}" data-team="${game.team2}">
                    <input type="radio" name="game-${game.gameKey}" value="${game.team2}"
                           ${whatifSelections[game.gameKey] === game.team2 ? 'checked' : ''}>
                    <span class="team-name">${game.team2}</span>
                    ${analysis ? `<span class="pick-count">${analysis.team2Picks} picks</span>` : ''}
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    // Add click handlers
    document.querySelectorAll('.team-option').forEach(option => {
        option.addEventListener('click', function() {
            const gameKey = this.dataset.gamekey;
            const team = this.dataset.team;
            selectWhatIfWinner(gameKey, team);
        });

        // Add hover handlers to highlight players who picked this team
        option.addEventListener('mouseenter', function() {
            const gameKey = this.dataset.gamekey;
            const team = this.dataset.team;
            highlightPlayersWithPick(gameKey, team);
        });

        option.addEventListener('mouseleave', function() {
            clearPlayerHighlights();
        });
    });
}

/**
 * Handle what-if winner selection (toggle if same team clicked)
 * @param {string} gameKey - Game key
 * @param {string} team - Team name
 */
export function selectWhatIfWinner(gameKey, team) {
    const whatifSelections = getWhatifSelections();

    // Toggle: if clicking the already selected team, unset it
    if (whatifSelections[gameKey] === team) {
        removeWhatifSelection(gameKey);
    } else {
        updateWhatifSelection(gameKey, team);
    }

    renderWhatIfPanel(); // Re-render to update UI
    updateProjectedStandings();
}

/**
 * Calculate projected standings based on what-if selections
 * @returns {Array} Projected leaderboard data
 */
export function calculateProjectedStandings() {
    const matchupsData = getMatchupsData();
    const rawPicksData = getRawPicksData();
    const allGames = getAllGames();
    const whatifSelections = getWhatifSelections();
    const pickAnalysis = getPickAnalysis();

    // Create a copy of matchups data with what-if winners applied
    const whatifGameMap = {};
    Object.keys(matchupsData).forEach(key => {
        whatifGameMap[key] = { ...matchupsData[key] };
        if (whatifSelections[key]) {
            whatifGameMap[key].winner = whatifSelections[key];
        }
    });

    // Recalculate standings with what-if results
    return processData(rawPicksData, whatifGameMap, allGames, pickAnalysis);
}

/**
 * Update projected standings display
 */
export function updateProjectedStandings() {
    const whatifSelections = getWhatifSelections();
    const hasSelections = Object.keys(whatifSelections).length > 0;
    const leaderboardData = getLeaderboardData();

    if (!hasSelections) {
        // Show current standings without comparison
        renderComparisonTable('projectedStandingsTable', leaderboardData, null);
    } else {
        // Show projected standings with comparison to current
        const projectedData = calculateProjectedStandings();
        renderComparisonTable('projectedStandingsTable', projectedData, leaderboardData);
    }

    // Match the matchup list height to the standings height
    syncColumnHeights();
}

/**
 * Sync the height of the matchup list to match the standings height
 */
function syncColumnHeights() {
    // Use requestAnimationFrame to ensure DOM has updated after render
    requestAnimationFrame(() => {
        const standingsContainer = document.querySelector('.whatif-results');
        const matchupContainer = document.querySelector('.upcoming-games');

        if (standingsContainer && matchupContainer) {
            const standingsHeight = standingsContainer.offsetHeight;

            // Apply the height to the matchup list
            if (standingsHeight > 0) {
                matchupContainer.style.maxHeight = `${standingsHeight}px`;
                matchupContainer.style.overflowY = 'auto';
            }
        }
    });
}

/**
 * Render comparison table showing current vs projected standings
 * @param {string} tableId - Table element ID
 * @param {Array} data - Current data to display
 * @param {Array} compareData - Data to compare against (null for no comparison)
 */
export function renderComparisonTable(tableId, data, compareData) {
    const table = document.getElementById(tableId);

    let html = `
        <thead>
            <tr>
                <th class="center">Rank</th>
                <th>Player</th>
                <th class="center">W</th>
                <th class="center">L</th>
                <th class="center">Win %</th>
            </tr>
        </thead>
        <tbody>
    `;

    data.forEach((player, index) => {
        let rankClass = 'rank';
        if (player.rank === 1) rankClass += ' gold';
        else if (player.rank === 2) rankClass += ' silver';
        else if (player.rank === 3) rankClass += ' bronze';

        let winPctClass = 'win-percentage';
        if (player.winPct >= 60) winPctClass += ' high';
        else if (player.winPct >= 40) winPctClass += ' medium';
        else winPctClass += ' low';

        // Calculate rank change if comparing
        let rankChange = '';
        let winsChange = 0;
        let lossesChange = 0;

        if (compareData) {
            const oldPlayer = compareData.find(p => p.name === player.name);
            if (oldPlayer) {
                const change = oldPlayer.rank - player.rank;
                if (change > 0) {
                    rankChange = `<span class="rank-change up">▲${change}</span>`;
                } else if (change < 0) {
                    rankChange = `<span class="rank-change down">▼${Math.abs(change)}</span>`;
                } else {
                    rankChange = `<span class="rank-change same">―</span>`;
                }

                // Calculate win/loss changes
                winsChange = player.wins - oldPlayer.wins;
                lossesChange = player.losses - oldPlayer.losses;
            }
        }

        // Always show win/loss indicators
        const winsClass = winsChange > 0 ? '' : 'neutral';
        const lossesClass = lossesChange > 0 ? 'losses' : 'neutral';
        const winsDisplay = `${player.wins}<span class="record-change ${winsClass}">+${winsChange}</span>`;
        const lossesDisplay = `${player.losses}<span class="record-change ${lossesClass}">+${lossesChange}</span>`;

        html += `
            <tr data-player-name="${player.name.replace(/"/g, '&quot;')}">
                <td class="center ${rankClass}">${player.rank}${rankChange}</td>
                <td class="player-name">${player.name}</td>
                <td class="center">${winsDisplay}</td>
                <td class="center">${lossesDisplay}</td>
                <td class="center ${winPctClass}">${player.winPct.toFixed(1)}%</td>
            </tr>
        `;
    });

    html += '</tbody>';
    table.innerHTML = html;
}

/**
 * Highlight players in the standings table who picked a specific team
 * @param {string} gameKey - Game key
 * @param {string} team - Team name
 */
function highlightPlayersWithPick(gameKey, team) {
    const rawPicksData = getRawPicksData();
    const allGames = getAllGames();

    // Find the game to get the column header
    const game = allGames.find(g => g.gameKey === gameKey);
    if (!game) return;

    // Find players who picked this team
    const playersPicked = [];
    const headers = Object.keys(rawPicksData[0] || {});
    const nameHeader = headers.find(h => h.toLowerCase().includes('name'));

    // Find the game column header
    const gameHeaders = headers.filter(h => h.includes('Week'));
    let gameColumn = null;

    gameHeaders.forEach(header => {
        const gameInfo = parseGameColumn(header);
        if (gameInfo) {
            const key = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
            if (key === gameKey) {
                gameColumn = header;
            }
        }
    });

    if (!gameColumn) return;

    // Find all players who picked this team
    rawPicksData.forEach(row => {
        const playerName = row[nameHeader] ? row[nameHeader].trim() : '';
        const pick = row[gameColumn];
        if (pick === team && playerName) {
            playersPicked.push(playerName);
        }
    });

    // Highlight rows in the standings table
    const table = document.getElementById('projectedStandingsTable');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const playerName = row.dataset.playerName;
        if (playersPicked.includes(playerName)) {
            row.classList.add('pick-highlighted');
        }
    });
}

/**
 * Clear all player highlights in the standings table
 */
function clearPlayerHighlights() {
    const table = document.getElementById('projectedStandingsTable');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.classList.remove('pick-highlighted');
    });
}

/**
 * Setup what-if controls (player selector, reset, chalk picker)
 */
export function setupWhatIfControls() {
    const leaderboardData = getLeaderboardData();
    const pickAnalysis = getPickAnalysis();

    // Populate player dropdown
    const playerSelect = document.getElementById('playerSelect');
    const copyPlayerPicksBtn = document.getElementById('copyPlayerPicks');

    playerSelect.innerHTML = '<option value="">-- Select Player --</option>';
    leaderboardData.forEach(player => {
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = player.name;
        playerSelect.appendChild(option);
    });

    // Enable/disable Apply button based on player selection
    playerSelect.addEventListener('change', () => {
        copyPlayerPicksBtn.disabled = !playerSelect.value;
    });

    // Reset all selections
    document.getElementById('resetWhatif').addEventListener('click', () => {
        clearWhatifSelections();
        playerSelect.value = '';
        copyPlayerPicksBtn.disabled = true;
        renderWhatIfPanel();
        updateProjectedStandings();
    });

    // Pick all chalk
    document.getElementById('pickAllChalk').addEventListener('click', () => {
        // Reset all selections first
        clearWhatifSelections();
        playerSelect.value = '';
        copyPlayerPicksBtn.disabled = true;

        // Then apply chalk picks
        const upcomingGames = getUpcomingGames();
        upcomingGames.forEach(game => {
            const analysis = pickAnalysis[game.gameKey];
            if (analysis && analysis.chalkPick) {
                updateWhatifSelection(game.gameKey, analysis.chalkPick);
            }
        });

        renderWhatIfPanel();
        updateProjectedStandings();
    });

    // Copy player picks
    copyPlayerPicksBtn.addEventListener('click', () => {
        const selectedPlayer = playerSelect.value;
        if (!selectedPlayer) {
            return;
        }

        const playerPicks = getPlayerPicks(selectedPlayer);
        // Apply all of this player's picks to whatif selections
        Object.keys(playerPicks).forEach(gameKey => {
            updateWhatifSelection(gameKey, playerPicks[gameKey]);
        });

        renderWhatIfPanel();
        updateProjectedStandings();
    });
}
