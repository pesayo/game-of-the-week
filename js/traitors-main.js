/**
 * Traitor Tracker - Main application entry point
 * Identifies players who picked against their own team
 */

// Import data layer
import { fetchAllData } from './data/data-fetcher.js';

// Import utilities
import { parsePlayerInfo, parseMatchups } from './utils/parsers.js';
import { createGameKey, parseGameColumn } from './utils/parsers.js';

/**
 * Find the skip name for a given team
 * @param {string} teamName - Team name (e.g., "Funk-Eng Challengers")
 * @param {Object} playerMap - Map of player name to {team, position}
 * @returns {string|null} Skip's full name or null if not found
 */
function findTeamSkip(teamName, playerMap) {
    for (const [playerName, info] of Object.entries(playerMap)) {
        if (info.team === teamName && info.position === 'Skip') {
            return playerName;
        }
    }
    return null;
}

/**
 * Identify all traitors - players who picked against their own team
 * @param {Array} rawPicks - Raw picks data from CSV
 * @param {Object} gameMap - Map of gameKey -> game info
 * @param {Object} playerMap - Map of player name to {team, position}
 * @returns {Array} Array of traitor records
 */
function identifyTraitors(rawPicks, gameMap, playerMap) {
    const traitors = [];
    const traitorsByPlayer = new Map();

    // Get all game column headers from picks CSV
    const headers = Object.keys(rawPicks[0] || {});
    const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // For each player
    rawPicks.forEach(row => {
        const playerName = row[nameHeader] ? row[nameHeader].trim() : '';
        if (!playerName) return;

        const playerInfo = playerMap[playerName];
        if (!playerInfo || !playerInfo.team) return;

        const playerTeam = playerInfo.team;
        const teamSkip = findTeamSkip(playerTeam, playerMap);
        if (!teamSkip) return;

        // For each game
        gameHeaders.forEach(gameHeader => {
            const gameInfo = parseGameColumn(gameHeader);
            if (!gameInfo) return;

            const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
            const game = gameMap[gameKey];
            if (!game) return;

            const playerPick = row[gameHeader];
            if (!playerPick) return; // Player didn't make a pick

            // Check if player's team is participating in this game
            const isTeamInGame = (game.team1 === teamSkip || game.team2 === teamSkip);
            if (!isTeamInGame) return;

            // Determine if player picked against their own team
            const didPickAgainstTeam = playerPick !== teamSkip;
            if (!didPickAgainstTeam) return;

            // This is a traitor pick!
            const traitorRecord = {
                playerName: playerName,
                playerTeam: playerTeam,
                playerPosition: playerInfo.position,
                teamSkip: teamSkip,
                gameNumber: game.gameNumber,
                week: game.week,
                date: game.date,
                time: game.time,
                sheet: game.sheet,
                opponent: playerPick,
                team1: game.team1,
                team2: game.team2,
                winner: game.winner,
                result: game.winner ? (playerPick === game.winner ? 'W' : 'L') : 'Pending'
            };

            traitors.push(traitorRecord);

            // Track per player
            if (!traitorsByPlayer.has(playerName)) {
                traitorsByPlayer.set(playerName, {
                    playerName: playerName,
                    playerTeam: playerTeam,
                    playerPosition: playerInfo.position,
                    teamSkip: teamSkip,
                    traitorPicks: [],
                    totalTraitorPicks: 0,
                    traitorWins: 0,
                    traitorLosses: 0,
                    traitorPending: 0
                });
            }

            const playerStats = traitorsByPlayer.get(playerName);
            playerStats.traitorPicks.push(traitorRecord);
            playerStats.totalTraitorPicks++;

            if (traitorRecord.result === 'W') {
                playerStats.traitorWins++;
            } else if (traitorRecord.result === 'L') {
                playerStats.traitorLosses++;
            } else {
                playerStats.traitorPending++;
            }
        });
    });

    return {
        allTraitors: traitors,
        traitorsByPlayer: Array.from(traitorsByPlayer.values())
    };
}

/**
 * Render summary statistics
 * @param {Object} traitorData - Processed traitor data
 */
function renderSummary(traitorData) {
    const summaryContainer = document.getElementById('traitorsSummary');
    if (!summaryContainer) return;

    const totalTraitors = traitorData.traitorsByPlayer.length;
    const totalTraitorPicks = traitorData.allTraitors.length;
    const completedTraitorPicks = traitorData.allTraitors.filter(t => t.result !== 'Pending');
    const successfulTraitorPicks = traitorData.allTraitors.filter(t => t.result === 'W').length;
    const failedTraitorPicks = traitorData.allTraitors.filter(t => t.result === 'L').length;
    const successRate = completedTraitorPicks.length > 0
        ? ((successfulTraitorPicks / completedTraitorPicks.length) * 100).toFixed(1)
        : 0;

    summaryContainer.innerHTML = `
        <div class="summary-grid">
            <div class="summary-stat">
                <div class="stat-value">${totalTraitors}</div>
                <div class="stat-label">Total Traitors</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">${totalTraitorPicks}</div>
                <div class="stat-label">Traitor Picks</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">${successfulTraitorPicks}</div>
                <div class="stat-label">Successful Betrayals</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">${failedTraitorPicks}</div>
                <div class="stat-label">Failed Betrayals</div>
            </div>
            <div class="summary-stat">
                <div class="stat-value">${successRate}%</div>
                <div class="stat-label">Betrayal Success Rate</div>
            </div>
        </div>
    `;
}

/**
 * Parse date string for sorting
 * @param {string} dateString - Date in MM/DD/YYYY format
 * @param {string} timeString - Time in H:MM PM format
 * @returns {Date} Date object
 */
function parseDateTime(dateString, timeString) {
    const [month, day, year] = dateString.split('/').map(Number);
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Render unified betrayals table
 * @param {Object} traitorData - Processed traitor data
 */
function renderTraitorsTable(traitorData) {
    const tableContainer = document.getElementById('traitorsTable');
    if (!tableContainer) return;

    if (traitorData.allTraitors.length === 0) {
        tableContainer.innerHTML = `
            <div class="no-traitors">
                <i class="fas fa-trophy"></i>
                <p>No traitors found! All players remain loyal to their teams.</p>
            </div>
        `;
        return;
    }

    // Sort all betrayals by date and time
    const sortedBetrayal = [...traitorData.allTraitors].sort((a, b) => {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return dateA - dateB;
    });

    let tableHTML = `
        <table class="traitors-table">
            <thead>
                <tr>
                    <th>Game</th>
                    <th>Week</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Traitor</th>
                    <th>Position</th>
                    <th>Team</th>
                    <th>Matchup</th>
                    <th>Picked</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedBetrayal.forEach((betrayal) => {
        const resultClass = betrayal.result === 'W' ? 'result-win' :
                           betrayal.result === 'L' ? 'result-loss' :
                           'result-pending';
        const resultIcon = betrayal.result === 'W' ? '<i class="fas fa-check-circle"></i>' :
                          betrayal.result === 'L' ? '<i class="fas fa-times-circle"></i>' :
                          '<i class="fas fa-clock"></i>';

        tableHTML += `
            <tr>
                <td class="game-number">${betrayal.gameNumber}</td>
                <td>${betrayal.week}</td>
                <td>${betrayal.date}</td>
                <td>${betrayal.time}</td>
                <td class="player-name">${betrayal.playerName}</td>
                <td>${betrayal.playerPosition}</td>
                <td class="team-name">${betrayal.playerTeam}</td>
                <td class="matchup-cell">
                    <span class="${betrayal.team1 === betrayal.teamSkip ? 'own-team' : ''}">${betrayal.team1}</span>
                    vs
                    <span class="${betrayal.team2 === betrayal.teamSkip ? 'own-team' : ''}">${betrayal.team2}</span>
                </td>
                <td class="picked-team">${betrayal.opponent}</td>
                <td class="${resultClass}">${resultIcon} ${betrayal.result}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;
}


/**
 * Initialize the application
 */
async function init() {
    try {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const errorMessage = document.getElementById('errorMessage');
        const traitorsContent = document.getElementById('traitorsContent');

        // Show loading
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';
        if (traitorsContent) traitorsContent.style.display = 'none';

        // Fetch all data
        const { matchups, picks, playerInfo } = await fetchAllData();

        // Parse data
        const { playerMap } = parsePlayerInfo(playerInfo);
        const { gameMap } = parseMatchups(matchups);

        // Identify traitors
        const traitorData = identifyTraitors(picks, gameMap, playerMap);

        // Hide loading, show content
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (traitorsContent) traitorsContent.style.display = 'block';

        // Render everything
        renderSummary(traitorData);
        renderTraitorsTable(traitorData);

    } catch (error) {
        console.error('Error initializing traitor tracker:', error);

        const loadingIndicator = document.getElementById('loadingIndicator');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'block';
        if (errorText) errorText.textContent = `Error loading data: ${error.message}`;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
