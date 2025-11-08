// StreakTracker component - displays current streaks and historical streak records

import { getLeaderboardData, getPlayerColors } from '../state/app-state.js';

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
        .map(p => ({
            name: p.name,
            type: p.currentStreak.type,
            count: p.currentStreak.count,
            color: playerColors[p.name] || '#888'
        }))
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
                    <i class="fas fa-fire"></i> Active Streaks (3+)
                </h3>
                ${activeStreaks.length > 0 ? renderActiveStreaks(activeStreaks) : '<p class="no-data">No active streaks of 3+ games</p>'}
            </div>

            <!-- Longest Win Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-trophy"></i> Longest Win Streaks (3+)
                </h3>
                ${longestWinStreaks.length > 0 ? renderStreakList(longestWinStreaks, 'win') : '<p class="no-data">No win streaks of 3+ games</p>'}
            </div>

            <!-- Longest Loss Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-arrow-down"></i> Longest Loss Streaks (3+)
                </h3>
                ${longestLossStreaks.length > 0 ? renderStreakList(longestLossStreaks, 'loss') : '<p class="no-data">No loss streaks of 3+ games</p>'}
            </div>
        </div>
    `;

    document.getElementById('streakTrackerContent').innerHTML = html;
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
        html += '<h4 class="streak-group-label"><i class="fas fa-fire-flame-curved" style="color: var(--win-color);"></i> Hot Hands</h4>';
        html += '<div class="streak-list">';
        winStreaks.forEach((streak, index) => {
            html += `
                <div class="streak-card active-win" style="border-left-color: ${streak.color}">
                    <div class="streak-rank">${index + 1}</div>
                    <div class="streak-info">
                        <div class="streak-player">${streak.name}</div>
                        <div class="streak-count">
                            <span class="streak-number">${streak.count}</span>
                            <span class="streak-label">${streak.count === 1 ? 'win' : 'wins'} in a row</span>
                        </div>
                    </div>
                    <div class="streak-icon win">
                        ${'<i class="fas fa-bolt"></i>'.repeat(Math.min(streak.count, 5))}
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    if (lossStreaks.length > 0) {
        html += '<div class="active-streak-group">';
        html += '<h4 class="streak-group-label"><i class="fas fa-snowflake" style="color: var(--loss-color);"></i> Cold Streaks</h4>';
        html += '<div class="streak-list">';
        lossStreaks.forEach((streak, index) => {
            html += `
                <div class="streak-card active-loss" style="border-left-color: ${streak.color}">
                    <div class="streak-rank cold">${index + 1}</div>
                    <div class="streak-info">
                        <div class="streak-player">${streak.name}</div>
                        <div class="streak-count">
                            <span class="streak-number">${streak.count}</span>
                            <span class="streak-label">${streak.count === 1 ? 'loss' : 'losses'} in a row</span>
                        </div>
                    </div>
                    <div class="streak-icon loss">
                        ${'<i class="fas fa-icicles"></i>'.repeat(Math.min(streak.count, 5))}
                    </div>
                </div>
            `;
        });
        html += '</div></div>';
    }

    return html || '<p class="no-data">No active streaks</p>';
}

/**
 * Render historical streak list
 * @param {Array} streaks - Array of streak objects with game ranges
 * @param {string} type - 'win' or 'loss'
 * @returns {string} HTML string
 */
function renderStreakList(streaks, type) {
    const isWin = type === 'win';
    const maxStreak = streaks[0].count;

    return `
        <div class="streak-list historical">
            ${streaks.map((streak, index) => {
                const percentage = (streak.count / maxStreak) * 100;
                const gameRange = streak.startGame && streak.endGame
                    ? `G${streak.startGame}-G${streak.endGame}`
                    : '';

                // Medal for top 3
                let medal = '';
                if (index === 0) medal = '<i class="fas fa-medal" style="color: #FFD700;"></i>';
                else if (index === 1) medal = '<i class="fas fa-medal" style="color: #C0C0C0;"></i>';
                else if (index === 2) medal = '<i class="fas fa-medal" style="color: #CD7F32;"></i>';

                return `
                    <div class="streak-row ${isWin ? 'win-row' : 'loss-row'}">
                        <div class="streak-row-rank">
                            ${medal ? medal : `<span class="rank-number">${index + 1}</span>`}
                        </div>
                        <div class="streak-row-content">
                            <div class="streak-row-header">
                                <span class="streak-row-player" style="color: ${streak.color}">${streak.name}</span>
                                <span class="streak-row-count">${streak.count} ${isWin ? 'W' : 'L'}</span>
                            </div>
                            <div class="streak-row-bar-container">
                                <div class="streak-row-bar ${isWin ? 'win-bar' : 'loss-bar'}" style="width: ${percentage}%"></div>
                            </div>
                            ${gameRange ? `<div class="streak-row-games">${gameRange}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
