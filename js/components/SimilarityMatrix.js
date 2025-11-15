/**
 * SimilarityMatrix component - visualizes how similarly players pick games
 * Provides multiple views: Player Focus, Highlights, and Full Matrix
 */

import { getRawPicksData, getMatchupsData, getPlayerColors, getFocusedPlayer } from '../state/app-state.js';
import { parseGameColumn, createGameKey } from '../utils/parsers.js';

// Track current view and filters
let currentView = 'highlights'; // 'highlights', 'player', or 'matrix'
let selectedPlayer = null;
let gameStatusFilter = 'all'; // 'all', 'played', or 'upcoming'

/**
 * Calculate pick similarity between all pairs of players
 * @returns {Object} Similarity matrix data structure
 */
export function calculateSimilarityMatrix() {
    const rawPicks = getRawPicksData();
    const gameMap = getMatchupsData();

    if (!rawPicks || rawPicks.length === 0) {
        return { players: [], matrix: [], maxSimilarity: 0 };
    }

    const headers = Object.keys(rawPicks[0]);
    const nameHeader = headers.find(h => h.toLowerCase().includes('name'));
    const gameHeaders = headers.filter(h => h.includes('Week'));

    // Get player names
    const players = rawPicks
        .map(row => row[nameHeader] ? row[nameHeader].trim() : '')
        .filter(name => name !== '');

    // Build similarity matrix
    const matrix = [];
    let maxSimilarity = 0;

    for (let i = 0; i < players.length; i++) {
        const row = [];
        for (let j = 0; j < players.length; j++) {
            if (i === j) {
                // Same player - 100% similarity
                row.push({
                    player1: players[i],
                    player2: players[j],
                    similarity: 100,
                    matchingGames: 0,
                    totalGames: 0,
                    isSelf: true,
                    differences: []
                });
            } else {
                // Calculate similarity between two different players
                const similarity = calculatePairSimilarity(
                    rawPicks[i],
                    rawPicks[j],
                    gameHeaders,
                    gameMap,
                    players[i],
                    players[j]
                );
                row.push(similarity);
                if (!similarity.isSelf && similarity.similarity > maxSimilarity) {
                    maxSimilarity = similarity.similarity;
                }
            }
        }
        matrix.push(row);
    }

    return {
        players,
        matrix,
        maxSimilarity
    };
}

/**
 * Calculate similarity between two players
 * @param {Object} player1Row - Pick data for player 1
 * @param {Object} player2Row - Pick data for player 2
 * @param {Array} gameHeaders - List of game column headers
 * @param {Object} gameMap - Map of gameKey -> game info
 * @param {string} player1Name - Name of player 1
 * @param {string} player2Name - Name of player 2
 * @returns {Object} Similarity data
 */
function calculatePairSimilarity(player1Row, player2Row, gameHeaders, gameMap, player1Name, player2Name) {
    let matchingGames = 0;
    let totalGames = 0;
    const differences = [];

    gameHeaders.forEach(gameHeader => {
        const pick1 = player1Row[gameHeader];
        const pick2 = player2Row[gameHeader];

        // Parse game info first to check filter
        const gameInfo = parseGameColumn(gameHeader);
        if (!gameInfo) return;

        const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
        const game = gameMap[gameKey];
        if (!game) return;

        // Apply game status filter
        if (gameStatusFilter === 'played' && !game.winner) return;
        if (gameStatusFilter === 'upcoming' && game.winner) return;

        // Only count games where both players made picks
        if (pick1 && pick2) {
            totalGames++;

            if (pick1 === pick2) {
                matchingGames++;
            } else {
                // Track differences for detailed comparison
                differences.push({
                    gameNumber: game.gameNumber,
                    week: game.week,
                    date: game.date,
                    pick1: pick1,
                    pick2: pick2,
                    winner: game.winner
                });
            }
        }
    });

    const similarity = totalGames > 0 ? (matchingGames / totalGames) * 100 : 0;

    return {
        player1: player1Name,
        player2: player2Name,
        similarity: Math.round(similarity),
        matchingGames,
        totalGames,
        isSelf: false,
        differences
    };
}

/**
 * Main render function - renders the appropriate view
 */
export function renderSimilarityMatrix() {
    const data = calculateSimilarityMatrix();
    const focusedPlayer = getFocusedPlayer();

    if (!data.players || data.players.length === 0) {
        document.getElementById('similarityMatrixContent').innerHTML =
            '<p class="no-data">No similarity data available</p>';
        return;
    }

    // Set default selected player to focused player if not already set
    if (!selectedPlayer && focusedPlayer) {
        selectedPlayer = focusedPlayer;
    } else if (!selectedPlayer) {
        selectedPlayer = data.players[0]; // Default to first player
    }

    const container = d3.select('#similarityMatrixContent');
    container.html(''); // Clear previous content

    // Render appropriate view
    if (currentView === 'player') {
        renderPlayerFocusView(container, data);
    } else if (currentView === 'highlights') {
        renderHighlightsView(container, data);
    } else {
        renderFullMatrixView(container, data);
    }
}

/**
 * Render controls into the header (called from HTML)
 */
export function renderSimilarityControls() {
    renderViewToggleInHeader();
}

/**
 * Render view toggle buttons in header
 */
function renderViewToggleInHeader() {
    const toggleContainer = document.getElementById('similarityViewToggle');
    if (!toggleContainer) return;

    const buttons = [
        { view: 'highlights', icon: 'fa-list', label: 'Similarity' },
        { view: 'player', icon: 'fa-user', label: 'Player Focus' },
        { view: 'matrix', icon: 'fa-th', label: 'Matrix' }
    ];

    toggleContainer.innerHTML = buttons.map(btn => `
        <button class="picks-toggle-btn ${currentView === btn.view ? 'active' : ''}"
                data-view="${btn.view}">
            <i class="fas ${btn.icon}"></i> ${btn.label}
        </button>
    `).join('');

    // Add click handlers
    toggleContainer.querySelectorAll('.picks-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentView = this.getAttribute('data-view');
            renderViewToggleInHeader(); // Update button states
            renderSimilarityMatrix();
        });
    });
}

/**
 * Render filters for a specific view
 */
function renderFilters(container, viewType, data) {
    const filtersDiv = container.append('div')
        .attr('class', 'matrix-filters');

    // Player selector for Player Focus and Matrix views
    if (viewType === 'player' || viewType === 'matrix') {
        const playerGroup = filtersDiv.append('div')
            .attr('class', 'matrix-filter-group');

        playerGroup.append('label')
            .attr('for', 'similarityPlayerSelect')
            .text(viewType === 'player' ? 'Compare:' : 'Focus:');

        const select = playerGroup.append('select')
            .attr('id', 'similarityPlayerSelect')
            .on('change', function() {
                selectedPlayer = this.value;
                renderSimilarityMatrix();
            });

        // Add "None" option for both views
        select.append('option')
            .attr('value', '')
            .property('selected', !selectedPlayer)
            .text('No player selected');

        // Sort players alphabetically and add as options
        const sortedPlayers = [...data.players].sort((a, b) => a.localeCompare(b));
        sortedPlayers.forEach(player => {
            select.append('option')
                .attr('value', player)
                .property('selected', player === selectedPlayer)
                .text(player);
        });
    }

    // Game status filter for all views
    const gameGroup = filtersDiv.append('div')
        .attr('class', 'matrix-filter-group');

    gameGroup.append('label')
        .attr('for', 'similarityGameFilter')
        .text('Games:');

    const gameSelect = gameGroup.append('select')
        .attr('id', 'similarityGameFilter')
        .on('change', function() {
            gameStatusFilter = this.value;
            renderSimilarityMatrix();
        });

    const gameOptions = [
        { value: 'all', label: 'All Games' },
        { value: 'played', label: 'Played Only' },
        { value: 'upcoming', label: 'Upcoming Only' }
    ];

    gameOptions.forEach(opt => {
        gameSelect.append('option')
            .attr('value', opt.value)
            .property('selected', opt.value === gameStatusFilter)
            .text(opt.label);
    });
}

/**
 * Render Player Focus View - one player compared to all others as a single column matrix
 */
function renderPlayerFocusView(container, data) {
    const playerColors = getPlayerColors();

    // Render filters
    renderFilters(container, 'player', data);

    // Add description
    container.append('div')
        .attr('class', 'similarity-description')
        .html('<p>Select a player to see how their picks compare to everyone else, sorted from most to least similar.</p>');

    // Get similarities for selected player
    const playerIndex = data.players.indexOf(selectedPlayer);
    if (playerIndex === -1) {
        // No player selected - show message
        container.append('div')
            .attr('class', 'no-data')
            .html('<i class="fas fa-info-circle"></i> Please select a player to compare.');
        return;
    }

    const similarities = data.matrix[playerIndex]
        .filter(d => !d.isSelf)
        .sort((a, b) => b.similarity - a.similarity);

    // Wrap visualization in scrollable container
    const vizContainer = container.append('div')
        .attr('class', 'similarity-viz-container')
        .style('position', 'relative');

    // Set up dimensions
    const rowHeight = 35;
    const cellWidth = 200;
    const labelWidth = 150;
    const headerHeight = 50;
    const margin = { top: headerHeight, right: 20, bottom: 20, left: labelWidth };
    const width = cellWidth;
    const height = rowHeight * similarities.length;

    // Color scale - same as full matrix
    const colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['#f0f0f0', '#6baed6', '#08519c']);

    // Add sticky header using HTML (positioned with CSS)
    const stickyHeader = vizContainer.append('div')
        .attr('class', 'similarity-sticky-header')
        .style('position', 'sticky')
        .style('top', '0')
        .style('left', `${labelWidth}px`)
        .style('width', `${cellWidth}px`)
        .style('height', `${headerHeight}px`)
        .style('background', 'white')
        .style('z-index', '10')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('color', playerColors[selectedPlayer] || '#333')
        .text(selectedPlayer);

    // Create SVG
    const svg = vizContainer.append('svg')
        .attr('class', 'similarity-matrix-svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .style('display', 'block');

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create rows
    const rows = g.selectAll('.similarity-row')
        .data(similarities)
        .enter()
        .append('g')
        .attr('class', 'similarity-row')
        .attr('transform', (d, i) => `translate(0,${i * rowHeight})`);

    // Add player labels (store references for hover highlighting)
    const rowLabels = rows.append('text')
        .attr('class', 'player-focus-label')
        .attr('data-player', d => d.player2)
        .attr('x', -10)
        .attr('y', rowHeight / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '13px')
        .style('font-weight', '500')
        .style('fill', d => playerColors[d.player2] || '#333')
        .text(d => d.player2);

    // Add colored cells
    rows.append('rect')
        .attr('class', 'similarity-cell')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', cellWidth)
        .attr('height', rowHeight - 2)
        .attr('fill', d => colorScale(d.similarity))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            showSimilarityModal(d);
        });

    // Add percentage text
    rows.append('text')
        .attr('class', 'similarity-percentage-label')
        .attr('x', cellWidth / 2)
        .attr('y', rowHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', d => d.similarity > 60 ? '#fff' : '#333')
        .style('pointer-events', 'none')
        .text(d => `${d.similarity}%`);

    // Add games count on the right
    rows.append('text')
        .attr('class', 'similarity-games-label')
        .attr('x', cellWidth + 10)
        .attr('y', rowHeight / 2)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('fill', '#666')
        .text(d => `${d.matchingGames}/${d.totalGames}`);

    // Add hover highlighting for the sticky header
    const stickyHeaderNode = stickyHeader.node();
    rows.selectAll('.similarity-cell')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
            // Highlight the sticky header
            stickyHeaderNode.style.textDecoration = 'underline';
            // Highlight the row label
            svg.select(`.player-focus-label[data-player="${d.player2}"]`)
                .style('font-weight', 'bold')
                .style('text-decoration', 'underline');
            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
            // Remove highlight from sticky header
            stickyHeaderNode.style.textDecoration = 'none';
            // Remove highlight from row label
            svg.select(`.player-focus-label[data-player="${d.player2}"]`)
                .style('font-weight', '500')
                .style('text-decoration', 'none');
            hideTooltip();
        });
}

/**
 * Render Highlights View - all pairs sorted by similarity
 */
function renderHighlightsView(container, data) {
    const playerColors = getPlayerColors();

    // Render filters
    renderFilters(container, 'highlights', data);

    // Add description
    container.append('div')
        .attr('class', 'similarity-description')
        .html('<p>All player pairs ranked by pick agreement, from most to least similar.</p>');

    // Get all pairs (excluding self-comparisons and duplicates)
    const allPairs = [];
    for (let i = 0; i < data.matrix.length; i++) {
        for (let j = i + 1; j < data.matrix[i].length; j++) {
            if (!data.matrix[i][j].isSelf) {
                allPairs.push(data.matrix[i][j]);
            }
        }
    }

    // Sort by similarity (most to least)
    allPairs.sort((a, b) => b.similarity - a.similarity);

    // Wrap in scrollable container
    const vizContainer = container.append('div')
        .attr('class', 'similarity-viz-container');

    const list = vizContainer.append('div')
        .attr('class', 'highlight-list');

    // Render all pairs
    allPairs.forEach((pair, index) => {
        const item = list.append('div')
            .attr('class', 'highlight-item')
            .on('click', () => showSimilarityModal(pair));

        item.append('div')
            .attr('class', 'highlight-rank')
            .text(`${index + 1}`);

        const players = item.append('div')
            .attr('class', 'highlight-players');

        players.append('span')
            .attr('class', 'highlight-player-name')
            .style('color', playerColors[pair.player1] || '#333')
            .text(pair.player1);

        players.append('span')
            .attr('class', 'highlight-vs')
            .text(' vs ');

        players.append('span')
            .attr('class', 'highlight-player-name')
            .style('color', playerColors[pair.player2] || '#333')
            .text(pair.player2);

        const stats = item.append('div')
            .attr('class', 'highlight-stats');

        stats.append('div')
            .attr('class', 'highlight-percentage')
            .style('color', getSimilarityColor(pair.similarity))
            .text(`${pair.similarity}%`);

        stats.append('div')
            .attr('class', 'highlight-games')
            .text(`${pair.matchingGames}/${pair.totalGames}`);
    });
}

/**
 * Render a highlight section (top or bottom 5)
 */
function renderHighlightSection(container, pairs, title, icon, playerColors) {
    const section = container.append('div')
        .attr('class', 'highlight-section');

    section.append('h3')
        .attr('class', 'highlight-title')
        .html(`<i class="fas fa-${icon}"></i> ${title}`);

    const list = section.append('div')
        .attr('class', 'highlight-list');

    pairs.forEach((pair, index) => {
        const item = list.append('div')
            .attr('class', 'highlight-item')
            .on('click', () => showSimilarityModal(pair));

        item.append('div')
            .attr('class', 'highlight-rank')
            .text(`${index + 1}`);

        const players = item.append('div')
            .attr('class', 'highlight-players');

        players.append('span')
            .attr('class', 'highlight-player-name')
            .style('color', playerColors[pair.player1] || '#333')
            .text(pair.player1);

        players.append('span')
            .attr('class', 'highlight-vs')
            .text(' vs ');

        players.append('span')
            .attr('class', 'highlight-player-name')
            .style('color', playerColors[pair.player2] || '#333')
            .text(pair.player2);

        const stats = item.append('div')
            .attr('class', 'highlight-stats');

        stats.append('div')
            .attr('class', 'highlight-percentage')
            .style('color', getSimilarityColor(pair.similarity))
            .text(`${pair.similarity}%`);

        stats.append('div')
            .attr('class', 'highlight-games')
            .text(`${pair.matchingGames}/${pair.totalGames}`);
    });
}

/**
 * Render Matrix View - complete heatmap with optional player focus
 */
function renderFullMatrixView(container, data) {
    const playerColors = getPlayerColors();
    // Use selected player if set, otherwise fall back to globally focused player
    const focusedPlayer = selectedPlayer || getFocusedPlayer();

    // Render filters
    renderFilters(container, 'matrix', data);

    // Sort players alphabetically for the full matrix view
    const sortedPlayers = [...data.players].sort((a, b) => a.localeCompare(b));

    // Rebuild matrix with alphabetical ordering
    const alphabeticalMatrix = [];
    sortedPlayers.forEach(player1 => {
        const row = [];
        sortedPlayers.forEach(player2 => {
            const originalIndex1 = data.players.indexOf(player1);
            const originalIndex2 = data.players.indexOf(player2);
            row.push(data.matrix[originalIndex1][originalIndex2]);
        });
        alphabeticalMatrix.push(row);
    });

    // Add description
    container.append('div')
        .attr('class', 'similarity-description')
        .html('<p>Complete matrix showing pick agreement between all player pairs (alphabetically ordered). Darker colors indicate higher agreement. Click any cell for details.</p>');

    // Wrap in scrollable container (like picks matrix)
    const vizContainer = container.append('div')
        .attr('class', 'similarity-viz-container')
        .style('position', 'relative');

    // Create hover overlays
    const rowHeaderOverlay = vizContainer.append('div')
        .attr('class', 'matrix-row-header-overlay')
        .style('display', 'none');

    const colHeaderOverlay = vizContainer.append('div')
        .attr('class', 'matrix-col-header-overlay')
        .style('display', 'none');

    const cellOverlay = vizContainer.append('div')
        .attr('class', 'matrix-cell-overlay')
        .style('display', 'none');

    // Create table similar to picks matrix
    const table = vizContainer.append('table')
        .attr('class', 'similarity-matrix-table');

    // Color scale - white (low similarity) to dark blue (high similarity)
    const colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['#f0f0f0', '#6baed6', '#08519c']);

    // Create thead with sticky headers
    const thead = table.append('thead');
    const headerRow = thead.append('tr');

    // Corner cell (empty)
    headerRow.append('th')
        .attr('class', 'player-col corner-cell');

    // Column headers (player names) - rotated
    sortedPlayers.forEach((player, colIndex) => {
        const th = headerRow.append('th')
            .attr('class', 'rotated-header')
            .attr('data-col', colIndex);

        const div = th.append('div')
            .style('color', playerColors[player] || '#333')
            .text(player);

        if (player === focusedPlayer) {
            div.style('font-weight', 'bold');
        }
    });

    // Create tbody
    const tbody = table.append('tbody');

    // Create rows
    alphabeticalMatrix.forEach((row, rowIndex) => {
        const tr = tbody.append('tr')
            .attr('data-row', rowIndex);

        // Row header (sticky player name)
        const rowPlayer = sortedPlayers[rowIndex];
        const th = tr.append('th')
            .attr('class', 'player-col')
            .style('color', playerColors[rowPlayer] || '#333')
            .text(rowPlayer);

        if (rowPlayer === focusedPlayer) {
            th.style('font-weight', 'bold');
        }

        // Data cells - color only, no text
        row.forEach((cellData, colIndex) => {
            const td = tr.append('td')
                .attr('class', cellData.isSelf ? 'self-cell' : 'similarity-cell')
                .attr('data-row', rowIndex)
                .attr('data-col', colIndex)
                .style('background-color', cellData.isSelf ? '#e0e0e0' : colorScale(cellData.similarity))
                .style('cursor', cellData.isSelf ? 'default' : 'pointer');

            if (cellData.isSelf) {
                td.style('opacity', '0.5');
            } else if (cellData.player1 === focusedPlayer || cellData.player2 === focusedPlayer) {
                td.style('border', '2px solid var(--primary-color)');
            }

            // Add hover and click interactions
            if (!cellData.isSelf) {
                td.on('mouseenter', function(event) {
                        const cell = this;
                        const cellRect = cell.getBoundingClientRect();
                        const containerRect = vizContainer.node().getBoundingClientRect();
                        const scrollTop = vizContainer.node().scrollTop;
                        const scrollLeft = vizContainer.node().scrollLeft;

                        // Position and show cell overlay (slightly larger)
                        cellOverlay
                            .style('display', 'block')
                            .style('left', (cellRect.left - containerRect.left + scrollLeft - 2) + 'px')
                            .style('top', (cellRect.top - containerRect.top + scrollTop - 2) + 'px')
                            .style('width', (cellRect.width + 4) + 'px')
                            .style('height', (cellRect.height + 4) + 'px')
                            .style('background-color', d3.select(cell).style('background-color'))
                            .style('border', '2px solid #333');

                        // Position and show row header overlay
                        const rowPlayer = sortedPlayers[rowIndex];
                        rowHeaderOverlay
                            .style('display', 'block')
                            .style('left', (scrollLeft + 5) + 'px')
                            .style('top', (cellRect.top - containerRect.top + scrollTop) + 'px')
                            .style('height', cellRect.height + 'px')
                            .style('color', playerColors[rowPlayer] || '#333')
                            .style('font-weight', rowPlayer === focusedPlayer ? 'bold' : 'normal')
                            .text(rowPlayer);

                        // Position and show column header overlay (rotated -90deg)
                        const colPlayer = sortedPlayers[colIndex];
                        colHeaderOverlay
                            .style('display', 'block')
                            .style('left', (cellRect.left - containerRect.left + scrollLeft + cellRect.width / 2) + 'px')
                            .style('top', (scrollTop + 20) + 'px')
                            .style('color', playerColors[colPlayer] || '#333')
                            .style('font-weight', colPlayer === focusedPlayer ? 'bold' : 'normal')
                            .text(colPlayer);

                        showTooltip(event, cellData);
                    })
                    .on('mouseleave', function() {
                        // Hide all overlays
                        cellOverlay.style('display', 'none');
                        rowHeaderOverlay.style('display', 'none');
                        colHeaderOverlay.style('display', 'none');

                        hideTooltip();
                    })
                    .on('click', () => showSimilarityModal(cellData));
            }
        });
    });

    // Add legend
    addLegend(container, colorScale);
}

/**
 * Get color based on similarity percentage
 */
function getSimilarityColor(similarity) {
    if (similarity >= 75) return '#2e7d32'; // Dark green
    if (similarity >= 60) return '#66bb6a'; // Green
    if (similarity >= 45) return '#ffa726'; // Orange
    if (similarity >= 30) return '#ef5350'; // Red
    return '#c62828'; // Dark red
}

/**
 * Add color legend to the similarity matrix
 */
function addLegend(container, colorScale) {
    const legend = container.append('div')
        .attr('class', 'similarity-legend');

    legend.append('div')
        .attr('class', 'legend-title')
        .text('Pick Agreement');

    const legendSvg = legend.append('svg')
        .attr('width', 300)
        .attr('height', 50);

    const gradient = legendSvg.append('defs')
        .append('linearGradient')
        .attr('id', 'similarity-gradient')
        .attr('x1', '0%')
        .attr('x2', '100%');

    gradient.selectAll('stop')
        .data([
            { offset: '0%', color: colorScale(0) },
            { offset: '50%', color: colorScale(50) },
            { offset: '100%', color: colorScale(100) }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

    legendSvg.append('rect')
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 200)
        .attr('height', 20)
        .style('fill', 'url(#similarity-gradient)')
        .attr('stroke', '#ccc');

    legendSvg.append('text')
        .attr('x', 10)
        .attr('y', 40)
        .style('font-size', '11px')
        .text('0%');

    legendSvg.append('text')
        .attr('x', 105)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .text('50%');

    legendSvg.append('text')
        .attr('x', 210)
        .attr('y', 40)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .text('100%');
}

/**
 * Show tooltip on hover
 */
function showTooltip(event, d) {
    const tooltip = d3.select('#similarityTooltip');

    tooltip.html(`
        <strong>${d.player1}</strong> vs <strong>${d.player2}</strong><br>
        Agreement: <strong>${d.similarity}%</strong><br>
        Matching picks: ${d.matchingGames} of ${d.totalGames} games<br>
        <em style="font-size: 11px; color: #666;">Click to see differences</em>
    `)
    .style('left', (event.pageX + 10) + 'px')
    .style('top', (event.pageY - 10) + 'px')
    .style('display', 'block');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    d3.select('#similarityTooltip').style('display', 'none');
}

/**
 * Show detailed comparison modal for a player pair
 */
function showSimilarityModal(data) {
    const modal = document.getElementById('similarityModal');
    const playerColors = getPlayerColors();

    // Set modal title
    document.getElementById('similarityModalPlayer1').textContent = data.player1;
    document.getElementById('similarityModalPlayer1').style.color = playerColors[data.player1] || '#333';
    document.getElementById('similarityModalPlayer2').textContent = data.player2;
    document.getElementById('similarityModalPlayer2').style.color = playerColors[data.player2] || '#333';

    // Set stats
    document.getElementById('similarityPercentage').textContent = `${data.similarity}%`;
    document.getElementById('matchingGames').textContent = `${data.matchingGames} of ${data.totalGames} games`;
    document.getElementById('differentGames').textContent = data.differences.length;

    // Render differences
    const diffList = document.getElementById('similarityDifferencesList');

    if (data.differences.length === 0) {
        diffList.innerHTML = '<p class="no-differences">These players picked identically on all games!</p>';
    } else {
        const diffRows = data.differences
            .sort((a, b) => a.gameNumber - b.gameNumber)
            .map(diff => {
                const player1Correct = diff.winner && diff.pick1 === diff.winner;
                const player2Correct = diff.winner && diff.pick2 === diff.winner;

                return `
                    <div class="difference-row">
                        <div class="diff-game-info">
                            <strong>Game ${diff.gameNumber}</strong> (Week ${diff.week}, ${diff.date})
                        </div>
                        <div class="diff-picks">
                            <div class="diff-pick ${player1Correct ? 'correct-pick' : (diff.winner ? 'incorrect-pick' : '')}">
                                <span class="player-name" style="color: ${playerColors[data.player1] || '#333'}">${data.player1}:</span>
                                <span class="pick-value">${diff.pick1}</span>
                                ${diff.winner ? (player1Correct ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>') : ''}
                            </div>
                            <div class="diff-pick ${player2Correct ? 'correct-pick' : (diff.winner ? 'incorrect-pick' : '')}">
                                <span class="player-name" style="color: ${playerColors[data.player2] || '#333'}">${data.player2}:</span>
                                <span class="pick-value">${diff.pick2}</span>
                                ${diff.winner ? (player2Correct ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>') : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        diffList.innerHTML = diffRows;
    }

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Setup modal close handlers
 */
export function setupSimilarityModal() {
    const modal = document.getElementById('similarityModal');
    const closeBtn = document.getElementById('closeSimilarityModal');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}
