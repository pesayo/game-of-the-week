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
                    <i class="fas fa-fire"></i> Active Streaks
                </h3>
                <div class="streak-section-content">
                    ${activeStreaks.length > 0 ? renderActiveStreaks(activeStreaks) : '<p class="no-data">No active streaks</p>'}
                </div>
            </div>

            <!-- Longest Win Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-trophy"></i> Longest Win Streaks
                </h3>
                <div class="streak-section-content">
                    ${longestWinStreaks.length > 0 ? renderStreakList(longestWinStreaks, 'win') : '<p class="no-data">No win streaks</p>'}
                </div>
            </div>

            <!-- Longest Loss Streaks -->
            <div class="streak-section">
                <h3 class="streak-section-title">
                    <i class="fas fa-arrow-down"></i> Longest Loss Streaks
                </h3>
                <div class="streak-section-content">
                    ${longestLossStreaks.length > 0 ? renderStreakList(longestLossStreaks, 'loss') : '<p class="no-data">No loss streaks</p>'}
                </div>
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
        // Add ranks with tie handling for win streaks
        const winStreaksWithRanks = [];
        for (let i = 0; i < winStreaks.length; i++) {
            const streak = winStreaks[i];
            let rank;
            if (i === 0) {
                rank = 1;
            } else {
                const prevStreak = winStreaks[i - 1];
                if (streak.count === prevStreak.count) {
                    rank = winStreaksWithRanks[i - 1].rank;
                } else {
                    rank = i + 1;
                }
            }
            winStreaksWithRanks.push({ ...streak, rank });
        }

        html += '<div class="active-streak-group">';
        html += '<h4 class="streak-group-label"><i class="fas fa-fire-flame-curved" style="color: var(--win-color);"></i> Hot Hands</h4>';
        html += '<div class="streak-list">';
        winStreaksWithRanks.forEach((streak) => {
            html += `
                <div class="streak-card active-win" style="border-left-color: ${streak.color}">
                    <div class="streak-rank">${streak.rank}</div>
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
        // Add ranks with tie handling for loss streaks
        const lossStreaksWithRanks = [];
        for (let i = 0; i < lossStreaks.length; i++) {
            const streak = lossStreaks[i];
            let rank;
            if (i === 0) {
                rank = 1;
            } else {
                const prevStreak = lossStreaks[i - 1];
                if (streak.count === prevStreak.count) {
                    rank = lossStreaksWithRanks[i - 1].rank;
                } else {
                    rank = i + 1;
                }
            }
            lossStreaksWithRanks.push({ ...streak, rank });
        }

        html += '<div class="active-streak-group">';
        html += '<h4 class="streak-group-label"><i class="fas fa-snowflake" style="color: var(--loss-color);"></i> Cold Streaks</h4>';
        html += '<div class="streak-list">';
        lossStreaksWithRanks.forEach((streak) => {
            html += `
                <div class="streak-card active-loss" style="border-left-color: ${streak.color}">
                    <div class="streak-rank cold">${streak.rank}</div>
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

    // Assign rank (same count = same rank)
    let currentRank = 1;
    const countToRank = {};
    sortedCounts.forEach((count, index) => {
        countToRank[count] = currentRank;
        currentRank += groupedByCount[count].length;
    });

    return `
        <div class="streak-list-grouped">
            ${sortedCounts.map(count => {
                const group = groupedByCount[count];
                const rank = countToRank[count];

                // Medal for top 3 ranks
                let medal = '';
                if (rank === 1) medal = '<i class="fas fa-medal" style="color: #FFD700;"></i>';
                else if (rank === 2) medal = '<i class="fas fa-medal" style="color: #C0C0C0;"></i>';
                else if (rank === 3) medal = '<i class="fas fa-medal" style="color: #CD7F32;"></i>';

                return `
                    <div class="streak-count-group">
                        <div class="streak-count-header">
                            <div class="streak-count-badge ${isWin ? 'win-badge' : 'loss-badge'}">
                                ${medal ? medal : `<span class="rank-number">#${rank}</span>`}
                                <span class="count-number">${count}</span>
                                <span class="count-label">${isWin ? 'W' : 'L'}</span>
                            </div>
                        </div>
                        <div class="streak-players-grid">
                            ${group.map(streak => {
                                const gameRange = streak.startGame && streak.endGame
                                    ? `G${streak.startGame}-${streak.endGame}`
                                    : '';
                                return `
                                    <div class="streak-player-card ${isWin ? 'win-card' : 'loss-card'}" style="border-left-color: ${streak.color}">
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
