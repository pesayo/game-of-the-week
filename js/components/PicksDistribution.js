// PicksDistribution component - handles pick distribution view

import { getAllGames, getPickAnalysis } from '../state/app-state.js';
import { getSharedPicksFilters } from './PicksMatrix.js';

/**
 * Render pick distribution view with horizontal bars
 */
export function renderPickDistribution() {
    const container = document.getElementById('distributionList');
    container.innerHTML = '';

    const allGames = getAllGames();
    const pickAnalysis = getPickAnalysis();
    const sharedPicksFilters = getSharedPicksFilters();

    // Get all games in order
    let filteredGames = [...allGames];

    // Apply filters
    if (sharedPicksFilters.week !== 'all') {
        filteredGames = filteredGames.filter(g => g.week == sharedPicksFilters.week);
    }
    if (sharedPicksFilters.gameStatus === 'completed') {
        filteredGames = filteredGames.filter(g => g.winner !== null);
    } else if (sharedPicksFilters.gameStatus === 'upcoming') {
        filteredGames = filteredGames.filter(g => g.winner === null);
    }
    if (sharedPicksFilters.team !== 'all') {
        filteredGames = filteredGames.filter(g => g.team1 === sharedPicksFilters.team || g.team2 === sharedPicksFilters.team);
    }

    // Render each game's distribution
    filteredGames.forEach(game => {
        const analysis = pickAnalysis[game.gameKey];
        if (!analysis) return;

        const item = document.createElement('div');
        item.className = 'distribution-item';

        // If a specific team is selected and it's team2, swap teams to keep selected team first
        let team1 = game.team1;
        let team2 = game.team2;
        let team1Pct = analysis.team1Percentage || 0;
        let team2Pct = analysis.team2Percentage || 0;
        let team1Count = analysis.team1Picks || 0;
        let team2Count = analysis.team2Picks || 0;
        let winner = game.winner;
        let isWinnerLoserOrdered = false;

        // For decided games with no active team filter, order winner first (green), loser second (red)
        if (game.winner && sharedPicksFilters.team === 'all') {
            isWinnerLoserOrdered = true;
            // Determine if teams need swapping to put winner first
            if (game.winner === game.team2) {
                // Winner is team2, so swap to make winner team1
                [team1, team2] = [team2, team1];
                [team1Pct, team2Pct] = [team2Pct, team1Pct];
                [team1Count, team2Count] = [team2Count, team1Count];
            }
            // If winner is already team1, no swap needed
        } else if (sharedPicksFilters.team !== 'all' && sharedPicksFilters.team === game.team2) {
            // Swap teams so selected team is always first
            [team1, team2] = [team2, team1];
            [team1Pct, team2Pct] = [team2Pct, team1Pct];
            [team1Count, team2Count] = [team2Count, team1Count];
        }

        const totalPicks = team1Count + team2Count;

        // Determine trophy position based on winner
        let trophyIcon = '';
        if (winner) {
            const trophyPosition = winner === team1 ? 'left' : 'right';
            trophyIcon = `<i class="fas fa-trophy distribution-trophy ${trophyPosition}"></i>`;
        }

        // Add winner/loser classes if applicable
        const team1Class = isWinnerLoserOrdered ? 'team1 winner' : 'team1';
        const team2Class = isWinnerLoserOrdered ? 'team2 loser' : 'team2';

        item.innerHTML = `
            <div class="distribution-header">
                <div class="distribution-game-info">
                    Week ${game.week} • ${game.date} • ${game.time} • Sheet ${game.sheet}
                </div>
            </div>
            <div class="distribution-matchup">${team1} vs ${team2}</div>
            <div class="distribution-bar-container">
                ${trophyIcon}
                <div class="distribution-bar ${team1Class}" style="width: ${team1Pct}%" title="${team1}: ${team1Count} picks (${team1Pct}%)">
                    ${team1Pct >= 15 ? team1Pct + '%' : ''}
                </div>
                <div class="distribution-bar ${team2Class}" style="width: ${team2Pct}%" title="${team2}: ${team2Count} picks (${team2Pct}%)">
                    ${team2Pct >= 15 ? team2Pct + '%' : ''}
                </div>
            </div>
            <div class="distribution-labels">
                <div class="distribution-label">
                    <div class="distribution-label-color ${team1Class}"></div>
                    <span class="distribution-label-text">${team1}</span>
                    <span class="distribution-label-count">${team1Count} picks (${team1Pct}%)</span>
                </div>
                <div class="distribution-label">
                    <span class="distribution-label-count">(${team2Pct}%) ${team2Count} picks</span>
                    <span class="distribution-label-text">${team2}</span>
                    <div class="distribution-label-color ${team2Class}"></div>
                </div>
            </div>
        `;

        container.appendChild(item);
    });

    if (filteredGames.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No games match the selected filters.</p>';
    }
}
