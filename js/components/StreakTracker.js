// StreakTracker component - displays current streaks and historical streak records

import { getLeaderboardData, getPlayerColors } from '../state/app-state.js';
import { highlightPlayerOnChart, unhighlightChart } from './HorseRace.js';

/**
 * Render the streak tracker section with current and longest streaks
 * @param {Array} data - Leaderboard data (can be filtered)
 */
export function renderStreakTracker(data) {
    // If no data passed, get from state (for backwards compatibility)
    if (!data) {
        data = getLeaderboardData();
    }
    const playerColors = getPlayerColors();

    if (!data || data.length === 0) {
        document.getElementById('streakTrackerContent').innerHTML = '<p>No streak data available</p>';
        return;
    }

    // Filter players who have played at least one game
    const activePlayers = data.filter(p => p.games > 0);

    // Get current active streaks (3+ games)
    const activeStreaks = activePlayers
        .filter(p => p.currentStreak && p.currentStreak.count >= 3)
        .map(p => {
            // Calculate game range for active streak (last N games)
            const endGame = p.games; // Total games played
            const startGame = endGame - p.currentStreak.count + 1;
            return {
                name: p.name,
                type: p.currentStreak.type,
                count: p.currentStreak.count,
                startGame: startGame,
                endGame: endGame,
                color: playerColors[p.name] || '#888'
            };
        })
        .sort((a, b) => b.count - a.count);

    // Get longest winning streaks (3+ games only)
    const longestWinStreaks = activePlayers
        .filter(p => p.longestWinStreak && p.longestWinStreak.count >= 3)
        .map(p => ({
            name: p.name,
            count: p.longestWinStreak.count,
            startGame: p.longestWinStreak.startGame,
            endGame: p.longestWinStreak.endGame,
            color: playerColors[p.name] || '#888'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

    // Get longest losing streaks (3+ games only)
    const longestLossStreaks = activePlayers
        .filter(p => p.longestLossStreak && p.longestLossStreak.count >= 3)
        .map(p => ({
            name: p.name,
            count: p.longestLossStreak.count,
            startGame: p.longestLossStreak.startGame,
            endGame: p.longestLossStreak.endGame,
            color: playerColors[p.name] || '#888'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

    const html = `
        <div class="streak-grid">
            <!-- Current Active Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-fire"></i> Active Streaks
                </h3>
                <div class="streak-section-content">
                    ${activeStreaks.length > 0 ? renderActiveStreaks(activeStreaks) : '<p class="no-data">No active streaks</p>'}
                </div>
            </div>

            <!-- Longest Win Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-trophy"></i> Longest Winning Streaks
                </h3>
                <div class="streak-section-content">
                    ${longestWinStreaks.length > 0 ? renderStreakList(longestWinStreaks, 'win') : '<p class="no-data">No win streaks</p>'}
                </div>
            </div>

            <!-- Longest Loss Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-arrow-down"></i> Longest Losing Streaks
                </h3>
                <div class="streak-section-content">
                    ${longestLossStreaks.length > 0 ? renderStreakList(longestLossStreaks, 'loss') : '<p class="no-data">No loss streaks</p>'}
                </div>
            </div>
        </div>
    `;

    document.getElementById('streakTrackerContent').innerHTML = html;

    // Add event listeners to all player cards to highlight on horse race chart
    const playerCards = document.querySelectorAll('.streak-card[data-player-name], .streak-player-card[data-player-name]');
    playerCards.forEach(card => {
        const playerName = card.getAttribute('data-player-name');
        const startGame = parseInt(card.getAttribute('data-start-game'));
        const endGame = parseInt(card.getAttribute('data-end-game'));

        card.addEventListener('mouseenter', () => {
            highlightPlayerOnChart(playerName, startGame, endGame);
        });

        card.addEventListener('mouseleave', () => {
            unhighlightChart();
        });
    });
}

/**
 * Render current active streaks section
 * @param {Array} streaks - Array of active streak objects
 * @returns {string} HTML string
 */
function renderActiveStreaks(streaks) {
    const winStreaks = streaks.filter(s => s.type === 'W');
    const lossStreaks = streaks.filter(s => s.type === 'L');

    let html = '';

    if (winStreaks.length > 0) {
        html += '<div class="active-streak-group">';
        html += '<h4 class="streak-group-label"><i class="fas fa-fire-flame-curved" style="color: #FF8C42;"></i> Hot</h4>';
        html += '<div class="streak-list">';
        winStreaks.forEach((streak) => {
            // Determine intensity class based on streak count
            let intensityClass = 'intensity-3';
            let iconClass = 'fa-fire';
            if (streak.count === 4) {
                intensityClass = 'intensity-4';
            } else if (streak.count === 5) {
                intensityClass = 'intensity-5';
            } else if (streak.count > 5) {
                intensityClass = 'intensity-6plus';
                iconClass = 'fa-fire-flame-curved';
            }

            html += `
                <div class="streak-card active-win" style="border-left-color: ${streak.color}"
                     data-player-name="${streak.name}"
                     data-start-game="${streak.startGame}"
                     data-end-game="${streak.endGame}">
                    <div class="streak-rank win-count">${streak.count}</div>
                    <div class="streak-info">
                        <div class="streak-player">${streak.name}</div>
                    </div>
                    <div class="streak-icon win ${intensityClass}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    if (lossStreaks.length > 0) {
        html += '<div class="active-streak-group">';
        html += '<h4 class="streak-group-label"><i class="fas fa-snowflake" style="color: #29B6F6;"></i> Cold</h4>';
        html += '<div class="streak-list">';
        lossStreaks.forEach((streak) => {
            // Determine intensity class based on streak count
            let intensityClass = 'intensity-3';
            let iconClass = 'fa-snowflake';
            if (streak.count === 4) {
                intensityClass = 'intensity-4';
            } else if (streak.count === 5) {
                intensityClass = 'intensity-5';
            } else if (streak.count > 5) {
                intensityClass = 'intensity-6plus';
                iconClass = 'fa-icicles';
            }

            html += `
                <div class="streak-card active-loss" style="border-left-color: ${streak.color}"
                     data-player-name="${streak.name}"
                     data-start-game="${streak.startGame}"
                     data-end-game="${streak.endGame}">
                    <div class="streak-rank loss-count">${streak.count}</div>
                    <div class="streak-info">
                        <div class="streak-player">${streak.name}</div>
                    </div>
                    <div class="streak-icon loss ${intensityClass}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    return html || '<p class="no-data">No active streaks</p>';
}

/**
 * Render historical streak list grouped by count
 * @param {Array} streaks - Array of streak objects with game ranges
 * @param {string} type - 'win' or 'loss'
 * @returns {string} HTML string
 */
function renderStreakList(streaks, type) {
    const isWin = type === 'win';

    // Group streaks by count
    const groupedByCount = {};
    streaks.forEach(streak => {
        if (!groupedByCount[streak.count]) {
            groupedByCount[streak.count] = [];
        }
        groupedByCount[streak.count].push(streak);
    });

    // Sort counts descending
    const sortedCounts = Object.keys(groupedByCount).map(Number).sort((a, b) => b - a);

    return `
        <div class="streak-list-grouped">
            ${sortedCounts.map(count => {
                const group = groupedByCount[count];

                return `
                    <div class="streak-count-group">
                        <div class="streak-count-header">
                            <div class="streak-count-badge ${isWin ? 'win-badge' : 'loss-badge'}">
                                <span class="count-number">${count}</span>
                            </div>
                        </div>
                        <div class="streak-players-grid">
                            ${group.map(streak => {
                                const gameRange = streak.startGame && streak.endGame
                                    ? `G${streak.startGame}-${streak.endGame}`
                                    : '';
                                return `
                                    <div class="streak-player-card ${isWin ? 'win-card' : 'loss-card'}" style="border-left-color: ${streak.color}"
                                         data-player-name="${streak.name}"
                                         data-start-game="${streak.startGame}"
                                         data-end-game="${streak.endGame}">
                                        <div class="streak-player-name">${streak.name}</div>
                                        ${gameRange ? `<div class="streak-player-games">${gameRange}</div>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
