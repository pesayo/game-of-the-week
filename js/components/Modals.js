// Modals component - handles tooltips and player detail modal

import {
    getLeaderboardData,
    getRawPicksData,
    getMatchupsData,
    getAllGames,
    getTeamLineups
} from '../state/app-state.js';
import { createGameKey, parseGameColumn } from '../utils/parsers.js';
import { createTooltipMemberElement } from './Matchups.js';

/**
 * Show tooltip for game cell
 * @param {Event} event - Mouse event
 * @param {string} playerName - Player name
 * @param {Object} gameData - Game data object
 */
export function showTooltip(event, playerName, gameData) {
    const tooltip = document.getElementById('tooltip');
    const allGames = getAllGames();
    const teamLineups = getTeamLineups();

    // Find the game from allGames using matchup info
    let game = null;
    if (gameData.matchup) {
        game = allGames.find(g =>
            g.week === gameData.matchup.week &&
            g.date === gameData.matchup.date &&
            g.time === gameData.matchup.time &&
            g.sheet === gameData.matchup.sheet
        );
    }

    if (!game) {
        // Fallback to simple tooltip if game not found
        tooltip.innerHTML = `<div style="padding: 10px; color: var(--text-primary);">
            <strong>${playerName}</strong><br>
            Game ${gameData.game}: <strong>${gameData.result === 'W' ? 'Win ✓' : 'Loss ✗'}</strong><br>
            Record: ${gameData.cumulativeWins}-${gameData.cumulativeLosses}
        </div>`;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 15) + 'px';
        tooltip.style.top = (event.pageY - 10) + 'px';
        return;
    }

    // Get team lineups
    const team1Lineup = teamLineups[game.team1] || [];
    const team2Lineup = teamLineups[game.team2] || [];

    // Determine team order and divider text based on whether game has been decided
    let firstTeam, secondTeam, firstTeamLineup, secondTeamLineup;
    let dividerText = 'VS';

    if (game.winner) {
        // Game decided: winner first, loser second
        if (game.winner === game.team1) {
            firstTeam = game.team1;
            secondTeam = game.team2;
            firstTeamLineup = team1Lineup;
            secondTeamLineup = team2Lineup;
        } else {
            firstTeam = game.team2;
            secondTeam = game.team1;
            firstTeamLineup = team2Lineup;
            secondTeamLineup = team1Lineup;
        }
        dividerText = 'DEFEATED';
    } else {
        // Game not decided: keep original order
        firstTeam = game.team1;
        secondTeam = game.team2;
        firstTeamLineup = team1Lineup;
        secondTeamLineup = team2Lineup;
    }

    // Build tooltip with matchup structure
    const rootStyles = getComputedStyle(document.documentElement);
    const successColor = rootStyles.getPropertyValue('--success').trim();
    const successHoverColor = rootStyles.getPropertyValue('--success-hover').trim();
    const errorColor = rootStyles.getPropertyValue('--error').trim();
    const headerGradient = gameData.result === 'W'
        ? `linear-gradient(135deg, ${successColor} 0%, ${successHoverColor} 100%)`
        : `linear-gradient(135deg, ${errorColor} 0%, #e53935 100%)`;

    let tooltipContent = `
        <div class="matchup-tooltip-header" style="background: ${headerGradient};">
            <div class="matchup-tooltip-title">
                <strong>${playerName}</strong>: ${gameData.result === 'W' ? 'Win ✓' : 'Loss ✗'}
            </div>
            <div class="matchup-tooltip-info">
                Week ${game.week} | ${game.date} | ${game.time} | Sheet ${game.sheet}
            </div>`;

    if (gameData.pick) {
        tooltipContent += `
            <div class="matchup-tooltip-info">
                Picked: ${gameData.pick}
            </div>`;
    }

    tooltipContent += `
        </div>
        <div class="matchup-tooltip-body">`;

    // First Team - members above team name
    if (game.winner && game.winner === firstTeam) {
        // Winner
        tooltipContent += `
            <div class="tooltip-team-section winner-section">
                <div class="tooltip-members-row" id="formFirstTeamMembers"></div>
                <div class="tooltip-team-name winner">
                    Team ${firstTeam}
                </div>
            </div>
        `;
    } else {
        // Non-winner or undecided
        tooltipContent += `
            <div class="tooltip-team-section winner-section">
                <div class="tooltip-members-row" id="formFirstTeamMembers"></div>
                <div class="tooltip-team-name">
                    Team ${firstTeam}
                </div>
            </div>
        `;
    }

    tooltipContent += `<div class="tooltip-vs-divider">${dividerText}</div>`;

    // Second Team - team name above members
    if (game.winner && game.winner === secondTeam) {
        // Winner
        tooltipContent += `
            <div class="tooltip-team-section">
                <div class="tooltip-team-name winner">
                    Team ${secondTeam}
                </div>
                <div class="tooltip-members-row" id="formSecondTeamMembers"></div>
            </div>
        `;
    } else {
        // Non-winner or undecided
        tooltipContent += `
            <div class="tooltip-team-section">
                <div class="tooltip-team-name">
                    Team ${secondTeam}
                </div>
                <div class="tooltip-members-row" id="formSecondTeamMembers"></div>
            </div>
        `;
    }

    tooltipContent += '</div>';
    tooltip.innerHTML = tooltipContent;

    // Add members after HTML is in DOM
    const firstTeamContainer = tooltip.querySelector('#formFirstTeamMembers');
    const secondTeamContainer = tooltip.querySelector('#formSecondTeamMembers');

    if (firstTeamLineup.length > 0) {
        firstTeamLineup.forEach(member => {
            firstTeamContainer.appendChild(createTooltipMemberElement(member));
        });
    } else {
        firstTeamContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No lineup data</div>';
    }

    if (secondTeamLineup.length > 0) {
        secondTeamLineup.forEach(member => {
            secondTeamContainer.appendChild(createTooltipMemberElement(member));
        });
    } else {
        secondTeamContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No lineup data</div>';
    }

    // Position tooltip near cursor
    tooltip.style.display = 'block';
    const tooltipRect = tooltip.getBoundingClientRect();
    const x = event.pageX + 15;
    const y = event.pageY - tooltipRect.height / 2;

    // Keep tooltip on screen
    const maxX = window.innerWidth + window.scrollX - tooltipRect.width - 20;
    const maxY = window.innerHeight + window.scrollY - tooltipRect.height - 20;

    tooltip.style.left = Math.min(x, maxX) + 'px';
    tooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
}

/**
 * Hide tooltip
 */
export function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

/**
 * Get player's picks for all games
 * @param {string} playerName - Player name
 * @returns {Array} Array of pick objects
 */
export function getPlayerPicks(playerName) {
    const rawPicksData = getRawPicksData();
    const matchupsData = getMatchupsData();

    // Get all picks for this player from rawPicksData
    const headers = Object.keys(rawPicksData[0]);
    const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
    const playerRow = rawPicksData.find(row => {
        const rowName = row[nameHeader] ? row[nameHeader].trim() : '';
        return rowName === playerName;
    });
    if (!playerRow) return [];

    // Get all game headers
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // Build picks data with full game information
    const allPicks = [];
    gameHeaders.forEach(gameHeader => {
        const gameInfo = parseGameColumn(gameHeader);
        if (!gameInfo) return;

        const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
        const game = matchupsData[gameKey];
        if (!game) return;

        const playerPick = playerRow[gameHeader];
        if (!playerPick) return;

        let result = null;
        if (game.winner) {
            result = (playerPick === game.winner) ? 'W' : 'L';
        }

        allPicks.push({
            gameNumber: game.gameNumber,
            week: game.week,
            date: game.date,
            time: game.time,
            sheet: game.sheet,
            team1: game.team1,
            team2: game.team2,
            pick: playerPick,
            winner: game.winner,
            result: result
        });
    });

    // Sort by game number
    allPicks.sort((a, b) => a.gameNumber - b.gameNumber);

    return allPicks;
}

/**
 * Show player details modal with all picks
 * @param {string} playerName - Player name
 */
export function showPlayerDetails(playerName) {
    const leaderboardData = getLeaderboardData();

    // Find player data
    const player = leaderboardData.find(p => p.name === playerName);
    if (!player) return;

    const allPicks = getPlayerPicks(playerName);

    // Update modal content
    document.getElementById('modalPlayerName').textContent = playerName;
    document.getElementById('modalPlayerStats').textContent =
        `${player.wins}-${player.losses} (${player.winPct.toFixed(1)}%) • Rank: ${player.rank}`;

    const picksList = document.getElementById('modalPicksList');
    picksList.innerHTML = '';

    allPicks.forEach(pick => {
        const pickItem = document.createElement('div');
        let statusClass = 'pick-pending';
        if (pick.result === 'W') statusClass = 'pick-win';
        else if (pick.result === 'L') statusClass = 'pick-loss';

        pickItem.className = `pick-item ${statusClass}`;

        let resultBadge = '';
        if (pick.result === 'W') {
            resultBadge = '<span class="pick-result-badge win">WIN</span>';
        } else if (pick.result === 'L') {
            resultBadge = '<span class="pick-result-badge loss">LOSS</span>';
        } else {
            resultBadge = '<span class="pick-result-badge pending">TBD</span>';
        }

        pickItem.innerHTML = `
            <div class="pick-game-number">Game ${pick.gameNumber}</div>
            <div class="pick-details">
                <div class="pick-matchup">
                    <span class="pick-matchup-teams">${pick.team1} vs ${pick.team2}</span>
                </div>
                <div class="pick-info">
                    Week ${pick.week} • ${pick.date} • ${pick.time} • Sheet ${pick.sheet}
                </div>
                <div class="pick-choice">
                    <span class="pick-choice-label">Picked:</span>
                    <span class="pick-choice-team">${pick.pick}</span>
                </div>
                ${pick.winner ? `<div class="pick-info">Winner: <strong>${pick.winner}</strong></div>` : ''}
            </div>
            <div class="pick-result">
                ${resultBadge}
            </div>
        `;

        picksList.appendChild(pickItem);
    });

    // Show modal
    document.getElementById('playerModal').classList.add('active');
}

/**
 * Close player modal
 */
export function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('active');
}

/**
 * Setup modal event handlers
 */
export function setupModalHandlers() {
    // Close modal on overlay click
    document.getElementById('playerModal').addEventListener('click', (e) => {
        if (e.target.id === 'playerModal') {
            closePlayerModal();
        }
    });

    document.getElementById('closeModal').addEventListener('click', closePlayerModal);
}

// Make showPlayerDetails available globally for inline onclick handlers
if (typeof window !== 'undefined') {
    window.showPlayerDetails = showPlayerDetails;
    window.showTooltip = showTooltip;
    window.hideTooltip = hideTooltip;
}
