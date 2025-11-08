// Leaderboard component - handles leaderboard table rendering and controls

import {
    getLeaderboardData,
    getPlayerInfoMap,
    getActiveFilters,
    getCurrentSort,
    getCurrentDirection,
    getAllGames,
    getIsExpanded,
    updateActiveFilter,
    setCurrentSort,
    setCurrentDirection,
    setIsExpanded
} from '../state/app-state.js';
import { showTooltip, hideTooltip } from './Modals.js';
import { renderStreakTracker } from './StreakTracker.js';

/**
 * Render statistics summary cards at top of dashboard
 * @param {Array} data - Leaderboard data
 */
export function renderStatsSummary(data) {
    // Count actual curling games that have been played (have a winner)
    const allGames = getAllGames();
    const gamesPlayed = allGames.filter(game => game.winner).length;

    // Calculate total wins and losses across all players
    const totalWins = data.reduce((sum, p) => sum + p.wins, 0);
    const totalLosses = data.reduce((sum, p) => sum + p.losses, 0);
    const totalGames = totalWins + totalLosses;

    // Calculate average win rate
    const avgWinPct = totalGames > 0 ? (totalWins / totalGames * 100) : 0;

    const totalPlayers = data.length;

    const html = `
        <div class="stat-card">
            <div class="stat-label">Total Players</div>
            <div class="stat-value">${totalPlayers}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Games Played</div>
            <div class="stat-value">${gamesPlayed}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Record</div>
            <div class="stat-value" style="font-size: 20px;">${totalWins}-${totalLosses}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Win Rate</div>
            <div class="stat-value">${avgWinPct.toFixed(1)}%</div>
        </div>
    `;

    document.getElementById('statsSummary').innerHTML = html;
}

/**
 * Render leaderboard table with player stats
 * @param {Array} data - Leaderboard data to render
 */
export function renderLeaderboard(data) {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';

    const isExpanded = getIsExpanded();

    data.forEach((player, playerIndex) => {
        const row = document.createElement('tr');

        // Rank with medal colors
        let rankClass = 'rank';
        if (player.rank === 1) rankClass += ' gold';
        else if (player.rank === 2) rankClass += ' silver';
        else if (player.rank === 3) rankClass += ' bronze';

        // Win percentage color
        let winPctClass = 'win-percentage';
        if (player.winPct >= 60) winPctClass += ' high';
        else if (player.winPct >= 40) winPctClass += ' medium';
        else winPctClass += ' low';

        // Show either recent form or all games based on expanded state
        const gamesToShow = isExpanded ? player.allResults : player.recentForm;
        const gameHistoryHtml = gamesToShow.map(gameData =>
            renderGameCell(gameData, player)
        ).join('');

        row.innerHTML = `
            <td class="center ${rankClass}">${player.rank}</td>
            <td class="player-name" onclick="showPlayerDetails('${player.name.replace(/'/g, "\\'")}')" title="Click to view all picks">
                ${player.name}
                <i class="fas fa-list-ul picks-icon"></i>
            </td>
            <td class="center">${player.wins}</td>
            <td class="center">${player.losses}</td>
            <td class="center ${winPctClass}">${player.winPct.toFixed(1)}%</td>
            <td class="center game-history-cell ${isExpanded ? 'expanded' : 'collapsed'}">
                <div class="recent-form">${gameHistoryHtml}</div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Render a single game cell in the leaderboard
 * @param {Object} gameData - Game result data
 * @param {Object} player - Player data
 * @returns {string} HTML string for game cell
 */
export function renderGameCell(gameData, player) {
    const cellClass = gameData.result === 'W' ? 'win' : 'loss';

    return `<span class="form-indicator ${cellClass}"
        data-player="${player.name}"
        data-game="${gameData.game}"
        onmouseenter="showTooltip(event, '${player.name.replace(/'/g, "\\'")}', ${JSON.stringify(gameData).replace(/"/g, '&quot;')})"
        onmouseleave="hideTooltip()">${gameData.result}</span>`;
}

/**
 * Toggle expand/collapse for all players
 */
export function toggleExpandCollapse() {
    const isExpanded = getIsExpanded();
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    const expandBtn = document.getElementById('expandHeaderBtn');
    const label = document.getElementById('gameHistoryLabel');

    if (newExpanded) {
        expandBtn.textContent = '−';
        expandBtn.title = 'Collapse to show recent games';
        label.textContent = 'All Games';
    } else {
        expandBtn.textContent = '+';
        expandBtn.title = 'Expand to show all games';
        label.textContent = 'Recent Games';
    }

    // Re-render the leaderboard with the new state
    const leaderboardData = getLeaderboardData();
    const currentSort = getCurrentSort();
    const currentDirection = getCurrentDirection();
    const sortedData = sortData(leaderboardData, currentSort, currentDirection);
    renderLeaderboard(sortedData);
}

/**
 * Setup sortable table headers
 */
export function setupHeaderSort() {
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const sortBy = header.dataset.sort;
            const currentSort = getCurrentSort();
            const currentDirection = getCurrentDirection();

            // Toggle direction if clicking the same header
            let newDirection;
            if (sortBy === currentSort) {
                newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
            } else {
                // Default direction based on column type
                newDirection = sortBy === 'name' ? 'asc' : 'desc';
            }

            setCurrentSort(sortBy);
            setCurrentDirection(newDirection);

            // Update header classes
            headers.forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            header.classList.add(`sorted-${newDirection}`);

            // Re-render with new sort
            const leaderboardData = getLeaderboardData();
            const sortedData = sortData(leaderboardData, sortBy, newDirection);
            renderLeaderboard(sortedData);
        });
    });
}

/**
 * Setup expand/collapse button
 */
export function setupExpandCollapse() {
    const expandBtn = document.getElementById('expandHeaderBtn');
    const gameHistoryHeader = document.getElementById('gameHistoryHeader');

    // Click on either the button or the header to toggle
    const toggleHandler = (e) => {
        // Prevent sorting if clicking on the game history header
        e.stopPropagation();
        toggleExpandCollapse();
    };

    expandBtn.addEventListener('click', toggleHandler);
    gameHistoryHeader.addEventListener('click', toggleHandler);
}

/**
 * Apply filters to leaderboard data
 * @param {Array} data - Leaderboard data
 * @returns {Array} Filtered data
 */
export function applyFilters(data) {
    const playerInfoMap = getPlayerInfoMap();
    const activeFilters = getActiveFilters();

    const filtered = data.filter(player => {
        const playerInfo = playerInfoMap[player.name];

        // If no player info, show them by default (unless filters are active)
        if (!playerInfo) {
            // If any filter is active, exclude players without info
            if (activeFilters.team || activeFilters.position || activeFilters.funkEngChallengers) {
                return false;
            }
            return true;
        }

        // Apply team filter
        if (activeFilters.team && playerInfo.team !== activeFilters.team) {
            return false;
        }

        // Apply position filter
        if (activeFilters.position && playerInfo.position !== activeFilters.position) {
            return false;
        }

        // Apply Funk-Eng Challengers filter (Lead or Second)
        if (activeFilters.funkEngChallengers) {
            const isFunkEng = playerInfo.position === 'Lead' || playerInfo.position === 'Second';
            if (!isFunkEng) {
                return false;
            }
        }

        return true;
    });

    // Log filtering results for debugging
    if (activeFilters.team || activeFilters.position || activeFilters.funkEngChallengers) {
        console.log('Filter applied:', activeFilters);
        console.log('Players with picks:', data.map(p => p.name));
        console.log('Players with team/position info:', Object.keys(playerInfoMap));
        console.log('Filtered results:', filtered.map(p => ({
            name: p.name,
            team: playerInfoMap[p.name]?.team,
            position: playerInfoMap[p.name]?.position
        })));
    }

    return filtered;
}

/**
 * Sort data by specified column
 * @param {Array} data - Data to sort
 * @param {string} sortBy - Column to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted data
 */
export function sortData(data, sortBy, direction) {
    const sorted = [...data];
    const dir = direction === 'asc' ? 1 : -1;

    switch(sortBy) {
        case 'name':
            sorted.sort((a, b) => dir * a.name.localeCompare(b.name));
            break;
        case 'wins':
            sorted.sort((a, b) => {
                if (a.wins !== b.wins) return dir * (b.wins - a.wins);
                return b.winPct - a.winPct;
            });
            break;
        case 'losses':
            sorted.sort((a, b) => {
                if (a.losses !== b.losses) return dir * (b.losses - a.losses);
                return b.wins - a.wins;
            });
            break;
        case 'winPct':
            sorted.sort((a, b) => {
                if (a.winPct !== b.winPct) return dir * (b.winPct - a.winPct);
                return b.wins - a.wins;
            });
            break;
        default: // rank
            sorted.sort((a, b) => dir * (a.rank - b.rank));
    }

    return sorted;
}

/**
 * Populate filter dropdowns
 * @param {Array} teams - List of teams
 * @param {Array} positions - List of positions
 */
export function populateFilters(teams, positions) {
    const teamFilter = document.getElementById('teamFilter');
    const positionFilter = document.getElementById('positionFilter');

    // Populate team filter
    teamFilter.innerHTML = '<option value="">All Teams</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamFilter.appendChild(option);
    });

    // Populate position filter
    positionFilter.innerHTML = '<option value="">All Positions</option>';
    positions.forEach(position => {
        const option = document.createElement('option');
        option.value = position;
        option.textContent = position;
        positionFilter.appendChild(option);
    });
}

/**
 * Setup filter toggle button
 */
export function setupFilterToggle() {
    const toggleBtn = document.getElementById('filterToggleBtn');
    const filterControls = document.getElementById('filterControls');

    toggleBtn.addEventListener('click', () => {
        const isCollapsed = filterControls.classList.contains('collapsed');

        if (isCollapsed) {
            filterControls.classList.remove('collapsed');
            toggleBtn.classList.add('expanded');
        } else {
            filterControls.classList.add('collapsed');
            toggleBtn.classList.remove('expanded');
        }
    });
}

/**
 * Setup filter controls
 */
export function setupFilterControls() {
    const teamFilter = document.getElementById('teamFilter');
    const positionFilter = document.getElementById('positionFilter');
    const funkEngFilter = document.getElementById('funkEngFilter');
    const resetFilters = document.getElementById('resetFilters');

    const applyCurrentFilters = () => {
        updateActiveFilter('team', teamFilter.value);
        updateActiveFilter('position', positionFilter.value);
        updateActiveFilter('funkEngChallengers', funkEngFilter.checked);

        const leaderboardData = getLeaderboardData();
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();
        const filteredData = applyFilters(leaderboardData);
        const sortedData = sortData(filteredData, currentSort, currentDirection);
        renderLeaderboard(sortedData);
        renderStatsSummary(sortedData);
        renderStreakTracker(leaderboardData);
    };

    teamFilter.addEventListener('change', applyCurrentFilters);
    positionFilter.addEventListener('change', applyCurrentFilters);
    funkEngFilter.addEventListener('change', applyCurrentFilters);

    resetFilters.addEventListener('click', () => {
        teamFilter.value = '';
        positionFilter.value = '';
        funkEngFilter.checked = false;
        updateActiveFilter('team', '');
        updateActiveFilter('position', '');
        updateActiveFilter('funkEngChallengers', false);

        const leaderboardData = getLeaderboardData();
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();
        const sortedData = sortData(leaderboardData, currentSort, currentDirection);
        renderLeaderboard(sortedData);
        renderStatsSummary(leaderboardData);
        renderStreakTracker(leaderboardData);
    });
}
