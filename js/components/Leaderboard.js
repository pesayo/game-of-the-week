// Leaderboard component - handles leaderboard table rendering and controls

import {
    getLeaderboardData,
    getPlayerInfoMap,
    getActiveFilters,
    getCurrentSort,
    getCurrentDirection,
    getAllGames,
    getIsExpanded,
    getCurrentView,
    getSelectedWeek,
    getMatchupsData,
    getRawPicksData,
    getPickAnalysis,
    updateActiveFilter,
    setCurrentSort,
    setCurrentDirection,
    setIsExpanded,
    setCurrentView,
    setSelectedWeek,
    setLeaderboardData
} from '../state/app-state.js';
import { showTooltip, hideTooltip } from './Modals.js';
import { renderStreakTracker } from './StreakTracker.js';
import { aggregateByTeam, aggregateByPosition, processData } from '../data/data-processor.js';

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

    // Find current leader(s) - all players with rank 1
    const leaders = data.filter(p => p.rank === 1);
    const leaderText = leaders.length === 0
        ? '—'
        : leaders.length === 1
            ? leaders[0].name
            : `${leaders.length}-way tie`;
    const leaderTitle = leaders.length > 1
        ? `Current leaders: ${leaders.map(p => p.name).join(', ')}`
        : '';

    const html = `
        <div class="stat-card leader-card" ${leaderTitle ? `title="${leaderTitle}"` : ''}>
            <div class="stat-label">Current Leader</div>
            <div class="stat-value">${leaderText}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Players</div>
            <div class="stat-value">${totalPlayers}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Games Played</div>
            <div class="stat-value">${gamesPlayed}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Overall Record</div>
            <div class="stat-value">
                <span style="font-size: 20px;">${totalWins}-${totalLosses}</span>
                <span style="font-size: 12px; color: var(--text-secondary); margin-left: 6px;">(${avgWinPct.toFixed(1)}%)</span>
            </div>
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
    const currentView = getCurrentView();

    data.forEach((item, index) => {
        const row = document.createElement('tr');

        // Rank with medal colors
        let rankClass = 'rank';
        if (item.rank === 1) rankClass += ' gold';
        else if (item.rank === 2) rankClass += ' silver';
        else if (item.rank === 3) rankClass += ' bronze';

        // Win percentage color
        let winPctClass = 'win-percentage';
        if (item.winPct >= 60) winPctClass += ' high';
        else if (item.winPct >= 40) winPctClass += ' medium';
        else winPctClass += ' low';

        // Build row HTML based on view type
        if (currentView === 'player') {
            // Show either recent form or all games based on expanded state
            const gamesToShow = isExpanded ? item.allResults : item.recentForm;
            const gameHistoryHtml = gamesToShow.map(gameData =>
                renderGameCell(gameData, item)
            ).join('');

            row.innerHTML = `
                <td class="center ${rankClass}">${item.rank}</td>
                <td class="player-name" onclick="showPlayerDetails('${item.name.replace(/'/g, "\\'")}')" title="Click to view ${item.name}'s picks">
                    <i class="fas fa-list-ul picks-icon" style="font-size: 10px; opacity: 0.5;"></i>
                    ${item.name}
                </td>
                <td class="center">${item.wins}</td>
                <td class="center">${item.losses}</td>
                <td class="center ${winPctClass}">${item.winPct.toFixed(1)}%</td>
                <td class="center game-history-cell ${isExpanded ? 'expanded' : 'collapsed'}">
                    <div class="recent-form">${gameHistoryHtml}</div>
                </td>
            `;
        } else {
            // Team or Position view - no game history, no clickable names
            const viewLabel = currentView === 'team' ? 'Team' : 'Position';
            // Serialize players data for tooltip
            const playersJson = JSON.stringify(item.players).replace(/"/g, '&quot;');
            row.innerHTML = `
                <td class="center ${rankClass}">${item.rank}</td>
                <td class="group-name"
                    onmouseenter="showGroupTooltip(event, ${playersJson})"
                    onmouseleave="hideTooltip()">
                    ${item.name}
                    <span class="player-count" title="${item.playerCount} player${item.playerCount !== 1 ? 's' : ''}">(${item.playerCount})</span>
                </td>
                <td class="center">${item.wins}</td>
                <td class="center">${item.losses}</td>
                <td class="center ${winPctClass}">${item.winPct.toFixed(1)}%</td>
            `;
        }

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
 * Show tooltip for group (team/position) with player details
 * @param {Event} event - Mouse event
 * @param {Array} players - Array of player objects
 */
export function showGroupTooltip(event, players) {
    const tooltip = document.getElementById('tooltip');

    // Sort players by rank/wins
    const sortedPlayers = [...players].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.winPct - a.winPct;
    });

    // Build tooltip content
    let tooltipContent = `
        <div style="padding: 12px; min-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--gray-300); color: var(--text-primary);">
                Players in Group
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
    `;

    sortedPlayers.forEach(player => {
        const winPctClass = player.winPct >= 60 ? 'high' : player.winPct >= 50 ? 'medium' : 'low';
        tooltipContent += `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 4px 0;">
                <span style="font-weight: 500; color: var(--text-primary);">${player.name}</span>
                <span style="font-size: 13px; color: var(--text-secondary);">
                    ${player.wins}W - ${player.losses}L
                    <span class="win-percentage ${winPctClass}" style="margin-left: 6px;">(${player.winPct.toFixed(1)}%)</span>
                </span>
            </div>
        `;
    });

    tooltipContent += `
            </div>
        </div>
    `;

    tooltip.innerHTML = tooltipContent;
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
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
    const gameHistoryLabel = document.getElementById('gameHistoryLabel');

    // Count completed games
    const allGames = getAllGames();
    const completedGames = allGames.filter(game => game.winner);
    const completedCount = completedGames.length;

    // Update header based on number of completed games
    if (completedCount <= 5) {
        // 5 or fewer games: show "GAMES" with no expand button
        gameHistoryLabel.textContent = 'GAMES';
        expandBtn.style.display = 'none';
        // Remove click handler from header since there's no expansion
        gameHistoryHeader.style.cursor = 'default';
    } else {
        // More than 5 games: show "Recent Games" with expand button
        gameHistoryLabel.textContent = 'Recent Games';
        expandBtn.style.display = 'inline-block';
        gameHistoryHeader.style.cursor = 'pointer';

        // Click on either the button or the header to toggle
        const toggleHandler = (e) => {
            // Prevent sorting if clicking on the game history header
            e.stopPropagation();
            toggleExpandCollapse();
        };

        expandBtn.addEventListener('click', toggleHandler);
        gameHistoryHeader.addEventListener('click', toggleHandler);
    }
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
 * Get data for the current view type
 * @param {string} viewType - 'player', 'team', or 'position'
 * @returns {Array} Data for the specified view
 */
export function getDataForView(viewType) {
    const leaderboardData = getLeaderboardData();
    const playerInfoMap = getPlayerInfoMap();

    switch(viewType) {
        case 'team':
            return aggregateByTeam(leaderboardData, playerInfoMap);
        case 'position':
            return aggregateByPosition(leaderboardData, playerInfoMap);
        case 'player':
        default:
            return leaderboardData;
    }
}

/**
 * Switch to a different view type and update the display
 * @param {string} viewType - 'player', 'team', or 'position'
 */
export function switchView(viewType) {
    setCurrentView(viewType);

    // Update button states
    document.querySelectorAll('.standings-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`view${viewType.charAt(0).toUpperCase() + viewType.slice(1)}Btn`).classList.add('active');

    // Update table headers based on view type
    const nameHeader = document.getElementById('nameHeader');
    const winsHeader = document.getElementById('winsHeader');
    const lossesHeader = document.getElementById('lossesHeader');
    const gameHistoryHeader = document.getElementById('gameHistoryHeader');
    const filterSection = document.querySelector('.filter-section');

    if (viewType === 'player') {
        nameHeader.textContent = 'Player';
        winsHeader.textContent = 'Wins';
        lossesHeader.textContent = 'Losses';
        gameHistoryHeader.style.display = '';
        filterSection.style.display = '';
    } else if (viewType === 'team') {
        nameHeader.textContent = 'Team';
        winsHeader.textContent = 'Avg Wins';
        lossesHeader.textContent = 'Avg Losses';
        gameHistoryHeader.style.display = 'none';
        filterSection.style.display = 'none';
    } else if (viewType === 'position') {
        nameHeader.textContent = 'Position';
        winsHeader.textContent = 'Avg Wins';
        lossesHeader.textContent = 'Avg Losses';
        gameHistoryHeader.style.display = 'none';
        filterSection.style.display = 'none';
    }

    // Get data for the view
    const viewData = getDataForView(viewType);

    // Apply filters only for player view
    const filteredData = viewType === 'player' ? applyFilters(viewData) : viewData;

    // Apply current sort
    const currentSort = getCurrentSort();
    const currentDirection = getCurrentDirection();
    const sortedData = sortData(filteredData, currentSort, currentDirection);

    // Re-render
    renderLeaderboard(sortedData);
    // Always show stats for all players, regardless of view
    renderStatsSummary(getLeaderboardData());
}

/**
 * Setup view toggle controls
 */
export function setupViewToggle() {
    const viewButtons = document.querySelectorAll('.standings-toggle-btn');

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewType = btn.dataset.view;
            switchView(viewType);
        });
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

    // Team filter - reset other filters when changed
    teamFilter.addEventListener('change', () => {
        // Reset other filters
        positionFilter.value = '';
        funkEngFilter.checked = false;

        // Apply only team filter
        updateActiveFilter('team', teamFilter.value);
        updateActiveFilter('position', '');
        updateActiveFilter('funkEngChallengers', false);

        const currentView = getCurrentView();
        const viewData = getDataForView(currentView);
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();

        const filteredData = currentView === 'player' ? applyFilters(viewData) : viewData;
        const sortedData = sortData(filteredData, currentSort, currentDirection);

        renderLeaderboard(sortedData);
        renderStatsSummary(getLeaderboardData());
        renderStreakTracker(getLeaderboardData());
    });

    // Position filter - reset other filters when changed
    positionFilter.addEventListener('change', () => {
        // Reset other filters
        teamFilter.value = '';
        funkEngFilter.checked = false;

        // Apply only position filter
        updateActiveFilter('team', '');
        updateActiveFilter('position', positionFilter.value);
        updateActiveFilter('funkEngChallengers', false);

        const currentView = getCurrentView();
        const viewData = getDataForView(currentView);
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();

        const filteredData = currentView === 'player' ? applyFilters(viewData) : viewData;
        const sortedData = sortData(filteredData, currentSort, currentDirection);

        renderLeaderboard(sortedData);
        renderStatsSummary(getLeaderboardData());
        renderStreakTracker(getLeaderboardData());
    });

    // Funk-Eng filter - reset other filters when changed
    funkEngFilter.addEventListener('change', () => {
        // Reset other filters
        teamFilter.value = '';
        positionFilter.value = '';

        // Apply only funk-eng filter
        updateActiveFilter('team', '');
        updateActiveFilter('position', '');
        updateActiveFilter('funkEngChallengers', funkEngFilter.checked);

        const currentView = getCurrentView();
        const viewData = getDataForView(currentView);
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();

        const filteredData = currentView === 'player' ? applyFilters(viewData) : viewData;
        const sortedData = sortData(filteredData, currentSort, currentDirection);

        renderLeaderboard(sortedData);
        renderStatsSummary(getLeaderboardData());
        renderStreakTracker(getLeaderboardData());
    });

    resetFilters.addEventListener('click', () => {
        teamFilter.value = '';
        positionFilter.value = '';
        funkEngFilter.checked = false;
        updateActiveFilter('team', '');
        updateActiveFilter('position', '');
        updateActiveFilter('funkEngChallengers', false);

        const currentView = getCurrentView();
        const viewData = getDataForView(currentView);
        const currentSort = getCurrentSort();
        const currentDirection = getCurrentDirection();

        // Only apply filters for player view
        const filteredData = currentView === 'player' ? viewData : viewData;
        const sortedData = sortData(filteredData, currentSort, currentDirection);

        renderLeaderboard(sortedData);
        // Always show stats for all players, regardless of view or filters
        renderStatsSummary(getLeaderboardData());
        renderStreakTracker(getLeaderboardData());
    });
}

/**
 * Populate week selector slider with available weeks
 */
export function populateWeekSelector() {
    const weekSlider = document.getElementById('standingsWeekSlider');
    const weekTickMarks = document.getElementById('weekTickMarks');
    const weekSliderLabels = document.getElementById('weekSliderLabels');
    const allGames = getAllGames();

    // Get unique weeks from completed games, sorted
    const completedGames = allGames.filter(game => game.winner);
    const weeks = [...new Set(completedGames.map(g => g.week))].sort((a, b) => a - b);

    if (weeks.length === 0) {
        // No completed games yet
        weekSlider.min = 0;
        weekSlider.max = 0;
        weekSlider.value = 0;
        weekSlider.disabled = true;
        weekTickMarks.innerHTML = '';
        weekSliderLabels.innerHTML = '<span class="week-label">No games yet</span>';
        return;
    }

    const minWeek = weeks[0];
    const maxWeek = weeks[weeks.length - 1];

    // Set slider range: minWeek to maxWeek, then maxWeek+1 = Current
    weekSlider.min = minWeek;
    weekSlider.max = maxWeek + 1; // Last position is "Current"
    weekSlider.value = maxWeek + 1; // Start at Current
    weekSlider.disabled = false;

    const sliderRange = (maxWeek + 1) - minWeek;

    // Generate tick marks for each week + Current
    weekTickMarks.innerHTML = '';
    for (let week = minWeek; week <= maxWeek; week++) {
        const tick = document.createElement('div');
        tick.className = 'week-tick';
        // Calculate position as percentage
        const position = ((week - minWeek) / sliderRange) * 100;
        tick.style.left = `${position}%`;
        weekTickMarks.appendChild(tick);
    }
    // Add tick for "Current"
    const currentTick = document.createElement('div');
    currentTick.className = 'week-tick current';
    currentTick.style.left = '100%';
    weekTickMarks.appendChild(currentTick);

    // Generate labels for each week + Current
    weekSliderLabels.innerHTML = '';
    for (let week = minWeek; week <= maxWeek; week++) {
        const label = document.createElement('span');
        label.className = 'week-label';
        label.textContent = `${week}`;
        // Calculate position as percentage
        const position = ((week - minWeek) / sliderRange) * 100;
        label.style.left = `${position}%`;
        weekSliderLabels.appendChild(label);
    }
    // Add "Current" label
    const currentLabel = document.createElement('span');
    currentLabel.className = 'week-label current';
    currentLabel.textContent = 'Current';
    currentLabel.style.left = '100%';
    weekSliderLabels.appendChild(currentLabel);
}

/**
 * Handle week selection change and update standings
 */
export function handleWeekChange() {
    const weekSlider = document.getElementById('standingsWeekSlider');
    const weekDisplay = document.getElementById('weekDisplay');
    const sliderValue = parseInt(weekSlider.value, 10);

    // Get max week to determine if we're at "Current"
    const allGames = getAllGames();
    const completedGames = allGames.filter(game => game.winner);
    const weeks = [...new Set(completedGames.map(g => g.week))].sort((a, b) => a - b);
    const maxWeek = weeks.length > 0 ? weeks[weeks.length - 1] : 0;

    // If slider is at max+1, show current (all games), otherwise show specific week
    const selectedWeek = sliderValue > maxWeek ? null : sliderValue;

    // Update state
    setSelectedWeek(selectedWeek);

    // Update display and title
    const standingsTitle = document.getElementById('standingsTitle');
    if (selectedWeek !== null) {
        standingsTitle.textContent = `Standings After Week ${selectedWeek}`;
        weekDisplay.textContent = `Week ${selectedWeek}`;
    } else {
        standingsTitle.textContent = 'Current Standings';
        weekDisplay.textContent = 'Current (All Games)';
    }

    // Reprocess data with week filter
    const rawPicks = getRawPicksData();
    const gameMap = getMatchupsData();
    const pickAnalysis = getPickAnalysis();

    const filteredData = processData(rawPicks, gameMap, allGames, pickAnalysis, selectedWeek);
    setLeaderboardData(filteredData);

    // Re-render all views
    const currentView = getCurrentView();
    const viewData = getDataForView(currentView);
    const filteredViewData = currentView === 'player' ? applyFilters(viewData) : viewData;

    const currentSort = getCurrentSort();
    const currentDirection = getCurrentDirection();
    const sortedData = sortData(filteredViewData, currentSort, currentDirection);

    renderLeaderboard(sortedData);
    renderStatsSummary(filteredData);
    renderStreakTracker(filteredData);
}

/**
 * Setup week selector controls
 */
export function setupWeekSelector() {
    const weekSlider = document.getElementById('standingsWeekSlider');
    // Use 'input' event for real-time updates as the slider moves
    weekSlider.addEventListener('input', handleWeekChange);
}

// Make showGroupTooltip available globally for inline event handlers
if (typeof window !== 'undefined') {
    window.showGroupTooltip = showGroupTooltip;
}
