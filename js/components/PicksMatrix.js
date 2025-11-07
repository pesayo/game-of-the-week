// PicksMatrix component - handles picks matrix view

import {
    getLeaderboardData,
    getRawPicksData,
    getMatchupsData,
    getPickAnalysis
} from '../state/app-state.js';
import { createGameKey, parseGameColumn } from '../utils/parsers.js';
import { renderPickDistribution } from './PicksDistribution.js';

// Shared filters for both matrix and distribution views
let sharedPicksFilters = {
    week: 'all',
    gameStatus: 'all',
    team: 'all'
};

/**
 * Get shared picks filters
 * @returns {Object} Shared filters object
 */
export function getSharedPicksFilters() {
    return sharedPicksFilters;
}

/**
 * Create a pie chart SVG for matrix header
 * @param {number} team1Pct - Team 1 percentage
 * @param {number} team2Pct - Team 2 percentage
 * @param {boolean} useWinnerLoserColors - Whether to use winner (green) / loser (red) colors
 * @returns {string} SVG string
 */
export function createPieChart(team1Pct, team2Pct, useWinnerLoserColors = false) {
    const size = 50;
    const radius = 20;
    const cx = size / 2;
    const cy = size / 2;

    // Brand colors for contrast
    const rootStyles = getComputedStyle(document.documentElement);
    let team1Color, team2Color;

    if (useWinnerLoserColors) {
        // Winner (team1) gets green, Loser (team2) gets red
        team1Color = rootStyles.getPropertyValue('--success').trim();
        team2Color = rootStyles.getPropertyValue('--error').trim();
    } else {
        // Default brand colors
        team1Color = rootStyles.getPropertyValue('--mcc-gold-1').trim();
        team2Color = rootStyles.getPropertyValue('--mcc-dark-1').trim();
    }

    // Calculate the end angle for team1 (starting at top, going counter-clockwise)
    const team1Angle = (team1Pct / 100) * 360;

    // Convert to radians and calculate end point (negative for counter-clockwise)
    const team1Radians = ((-team1Angle - 90) * Math.PI) / 180;
    const team1X = cx + radius * Math.cos(team1Radians);
    const team1Y = cy + radius * Math.sin(team1Radians);

    // Determine if we need the large arc flag
    const largeArc1 = team1Pct > 50 ? 1 : 0;
    const largeArc2 = team2Pct > 50 ? 1 : 0;

    let svg = `<svg class="matrix-header-pie" viewBox="0 0 ${size} ${size}">`;

    if (team1Pct === 0) {
        // All team2
        svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${team2Color}"/>`;
    } else if (team2Pct === 0) {
        // All team1
        svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${team1Color}"/>`;
    } else if (team1Pct === 50) {
        // Perfect split - show half and half (team1 on left, team2 on right)
        svg += `
            <path d="M ${cx},${cy} L ${cx},${cy - radius} A ${radius},${radius} 0 0 0 ${cx},${cy + radius} Z" fill="${team1Color}"/>
            <path d="M ${cx},${cy} L ${cx},${cy + radius} A ${radius},${radius} 0 0 0 ${cx},${cy - radius} Z" fill="${team2Color}"/>
        `;
    } else {
        // Team1 slice (counter-clockwise from top)
        svg += `
            <path d="M ${cx},${cy} L ${cx},${cy - radius} A ${radius},${radius} 0 ${largeArc1} 0 ${team1X},${team1Y} Z"
                  fill="${team1Color}"/>
        `;

        // Team2 slice - fills the rest (counter-clockwise)
        svg += `
            <path d="M ${cx},${cy} L ${team1X},${team1Y} A ${radius},${radius} 0 ${largeArc2} 0 ${cx},${cy - radius} Z"
                  fill="${team2Color}"/>
        `;
    }

    svg += '</svg>';
    return svg;
}

/**
 * Render picks matrix table
 */
export function renderPicksMatrix() {
    const thead = document.getElementById('matrixTableHead');
    const tbody = document.getElementById('matrixTableBody');
    const rawPicksData = getRawPicksData();
    const matchupsData = getMatchupsData();
    const leaderboardData = getLeaderboardData();
    const pickAnalysis = getPickAnalysis();

    // Get all game headers
    const headers = Object.keys(rawPicksData[0]);
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // Build game list with full info
    const games = [];
    gameHeaders.forEach(gameHeader => {
        const gameInfo = parseGameColumn(gameHeader);
        if (!gameInfo) return;

        const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
        const game = matchupsData[gameKey];
        if (!game) return;

        games.push({
            header: gameHeader,
            ...game
        });
    });

    // Sort by game number
    games.sort((a, b) => a.gameNumber - b.gameNumber);

    // Apply filters
    let filteredGames = games;
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

    // Build header row
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');

    // Player name column
    const playerHeader = document.createElement('th');
    playerHeader.className = 'player-col';
    playerHeader.textContent = 'Player';
    headerRow.appendChild(playerHeader);

    // Add game columns
    filteredGames.forEach(game => {
        const gameHeader = document.createElement('th');

        // Get pick analysis for this game
        const analysis = pickAnalysis[game.gameKey];
        let team1 = game.team1;
        let team2 = game.team2;
        let team1Pct = analysis ? (analysis.team1Percentage || 0) : 50;
        let team2Pct = analysis ? (analysis.team2Percentage || 0) : 50;
        let team1Count = analysis ? (analysis.team1Picks || 0) : 0;
        let team2Count = analysis ? (analysis.team2Picks || 0) : 0;
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

        // Create pie chart with winner/loser colors if applicable
        const pieChartSVG = createPieChart(team1Pct, team2Pct, isWinnerLoserOrdered);

        // Determine colors for header text
        const team1Color = isWinnerLoserOrdered ? 'var(--success)' : 'var(--mcc-gold-1)';
        const team2Color = isWinnerLoserOrdered ? 'var(--error)' : 'var(--mcc-dark-1)';
        const team1TooltipColor = isWinnerLoserOrdered ? 'var(--success)' : 'var(--gold)';
        const team2TooltipColor = isWinnerLoserOrdered ? 'var(--error)' : 'var(--mcc-light-2)';

        gameHeader.innerHTML = `
            <div class="matrix-header-content">
                <div class="matrix-header-pie-wrapper" style="position: relative;">
                    ${pieChartSVG}
                    <div class="pie-tooltip" id="pieTooltip-${game.gameNumber}">
                        <div style="color: ${team1TooltipColor}; font-weight: 600;">${team1}: ${team1Pct}%</div>
                        <div style="color: ${team2TooltipColor}; font-weight: 600;">${team2}: ${team2Pct}%</div>
                    </div>
                </div>
                <div class="matrix-header-info">
                    <div style="font-weight: bold;">Week ${game.week}</div>
                    <div style="font-size: 10px; margin-top: 2px;">${game.date}</div>
                    <div style="font-size: 10px;">${game.time}</div>
                    <div style="font-size: 10px; margin-top: 5px; font-weight: 600; line-height: 1.5;">
                        <div style="color: ${team1Color};">${team1} (${team1Pct}%)</div>
                        <div style="color: ${team2Color};">${team2} (${team2Pct}%)</div>
                    </div>
                </div>
            </div>
        `;

        headerRow.appendChild(gameHeader);

        // Add hover event to pie chart
        const pieChart = gameHeader.querySelector('.matrix-header-pie');
        const tooltip = gameHeader.querySelector(`#pieTooltip-${game.gameNumber}`);

        if (pieChart && tooltip) {
            const updateTooltipPosition = () => {
                if (tooltip.classList.contains('active')) {
                    const rect = pieChart.getBoundingClientRect();
                    tooltip.style.left = `${rect.left + rect.width / 2}px`;
                    tooltip.style.top = `${rect.top - 40}px`;
                }
            };

            pieChart.addEventListener('mouseenter', (e) => {
                tooltip.classList.add('active');
                const rect = pieChart.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.top = `${rect.top - 40}px`;
                tooltip.style.bottom = 'auto';
            });

            pieChart.addEventListener('mouseleave', () => {
                tooltip.classList.remove('active');
            });

            // Update tooltip position on scroll
            const matrixContainer = document.querySelector('.picks-matrix-container');
            if (matrixContainer) {
                matrixContainer.addEventListener('scroll', updateTooltipPosition);
            }
            window.addEventListener('scroll', updateTooltipPosition);
        }
    });

    thead.appendChild(headerRow);

    // Build body rows
    tbody.innerHTML = '';

    // Get name header for finding player rows
    const allHeaders = Object.keys(rawPicksData[0]);
    const nameHeader = allHeaders.find(h => h.toLowerCase().includes('name'));

    leaderboardData.forEach(player => {
        const row = document.createElement('tr');

        // Player name cell
        const nameCell = document.createElement('td');
        nameCell.className = 'player-col';
        nameCell.textContent = player.name;
        nameCell.style.cursor = 'pointer';
        nameCell.onclick = () => window.showPlayerDetails(player.name);
        row.appendChild(nameCell);

        // Find player row in raw data
        const playerRow = rawPicksData.find(r => {
            const rowName = r[nameHeader] ? r[nameHeader].trim() : '';
            return rowName === player.name;
        });

        // Add pick cells
        filteredGames.forEach(game => {
            const pickCell = document.createElement('td');

            if (playerRow && playerRow[game.header]) {
                const pick = playerRow[game.header];
                const pickDiv = document.createElement('div');
                pickDiv.className = 'matrix-pick-cell';

                // Determine result class
                let resultClass = 'pending';
                if (game.winner) {
                    resultClass = (pick === game.winner) ? 'win' : 'loss';
                }
                pickDiv.classList.add(resultClass);

                pickDiv.textContent = pick;

                // Apply team colors for undetermined matchups (no winner yet)
                if (!game.winner) {
                    // Determine display order (same logic as header)
                    let team1 = game.team1;
                    let team2 = game.team2;

                    if (sharedPicksFilters.team !== 'all' && sharedPicksFilters.team === game.team2) {
                        [team1, team2] = [team2, team1];
                    }

                    // Apply color based on pick (matching pie chart colors)
                    if (pick === team1) {
                        pickDiv.style.color = 'var(--mcc-gold-1)';
                        pickDiv.style.fontWeight = '600';
                    } else if (pick === team2) {
                        pickDiv.style.color = 'var(--mcc-dark-1)';
                        pickDiv.style.fontWeight = '600';
                    }
                }

                pickCell.appendChild(pickDiv);
            } else {
                pickCell.textContent = '-';
                pickCell.style.color = 'var(--text-disabled)';
            }

            row.appendChild(pickCell);
        });

        tbody.appendChild(row);
    });
}

/**
 * Setup combined picks view controls (matrix/distribution toggle and filters)
 */
export function setupCombinedPicksView() {
    const matrixView = document.getElementById('matrixView');
    const distributionView = document.getElementById('distributionView');
    const toggleButtons = document.querySelectorAll('.picks-toggle-btn');
    const title = document.getElementById('picksViewTitle');

    // Toggle between views
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;

            // Update button states
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show/hide views
            if (view === 'matrix') {
                matrixView.style.display = 'block';
                distributionView.style.display = 'none';
                title.textContent = 'All Player Picks';
            } else {
                matrixView.style.display = 'none';
                distributionView.style.display = 'block';
                title.textContent = 'Pick Distribution';

                // Render distribution if not already done
                const container = document.getElementById('distributionList');
                if (container.innerHTML === '') {
                    renderPickDistribution();
                }
            }
        });
    });

    // Function to update both views
    const updateBothViews = () => {
        renderPicksMatrix();
        renderPickDistribution();
    };

    // Function to sync filter dropdowns
    const syncFilterDropdowns = (sourceId, targetId, value) => {
        document.getElementById(targetId).value = value;
    };

    // Setup shared filters
    const matrixWeekFilter = document.getElementById('matrixWeekFilter');
    const distributionWeekFilter = document.getElementById('distributionWeekFilter');

    const allGames = getMatchupsData();
    const weeks = [...new Set(Object.values(allGames).map(g => g.week))].sort((a, b) => a - b);

    // Populate week dropdowns
    weeks.forEach(week => {
        const matrixOption = document.createElement('option');
        matrixOption.value = week;
        matrixOption.textContent = `Week ${week}`;
        matrixWeekFilter.appendChild(matrixOption);

        const distOption = document.createElement('option');
        distOption.value = week;
        distOption.textContent = `Week ${week}`;
        distributionWeekFilter.appendChild(distOption);
    });

    // Setup team filters
    const matrixTeamFilter = document.getElementById('matrixTeamFilter');
    const distributionTeamFilter = document.getElementById('distributionTeamFilter');
    const teams = new Set();
    Object.values(allGames).forEach(game => {
        teams.add(game.team1);
        teams.add(game.team2);
    });
    const sortedTeams = [...teams].sort();

    // Populate team dropdowns
    sortedTeams.forEach(team => {
        const matrixOption = document.createElement('option');
        matrixOption.value = team;
        matrixOption.textContent = team;
        matrixTeamFilter.appendChild(matrixOption);

        const distOption = document.createElement('option');
        distOption.value = team;
        distOption.textContent = team;
        distributionTeamFilter.appendChild(distOption);
    });

    // Week filter event handlers
    matrixWeekFilter.addEventListener('change', (e) => {
        sharedPicksFilters.week = e.target.value;
        syncFilterDropdowns('matrixWeekFilter', 'distributionWeekFilter', e.target.value);
        updateBothViews();
    });

    distributionWeekFilter.addEventListener('change', (e) => {
        sharedPicksFilters.week = e.target.value;
        syncFilterDropdowns('distributionWeekFilter', 'matrixWeekFilter', e.target.value);
        updateBothViews();
    });

    // Game status filter event handlers
    document.getElementById('matrixGameFilter').addEventListener('change', (e) => {
        sharedPicksFilters.gameStatus = e.target.value;
        document.getElementById('distributionGameFilter').value = e.target.value;
        updateBothViews();
    });

    document.getElementById('distributionGameFilter').addEventListener('change', (e) => {
        sharedPicksFilters.gameStatus = e.target.value;
        document.getElementById('matrixGameFilter').value = e.target.value;
        updateBothViews();
    });

    // Team filter event handlers
    matrixTeamFilter.addEventListener('change', (e) => {
        sharedPicksFilters.team = e.target.value;
        syncFilterDropdowns('matrixTeamFilter', 'distributionTeamFilter', e.target.value);
        updateBothViews();
    });

    distributionTeamFilter.addEventListener('change', (e) => {
        sharedPicksFilters.team = e.target.value;
        syncFilterDropdowns('distributionTeamFilter', 'matrixTeamFilter', e.target.value);
        updateBothViews();
    });

    // Render initial matrix view
    renderPicksMatrix();
}
