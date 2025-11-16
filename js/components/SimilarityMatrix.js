/**
 * SimilarityMatrix component - visualizes how similarly players pick games
 * Provides multiple views: Player Focus, Highlights, and Full Matrix
 */

import { getRawPicksData, getMatchupsData, getPlayerColors, getFocusedPlayer } from '../state/app-state.js';
import { parseGameColumn, createGameKey } from '../utils/parsers.js';

// Track current view and filters
let currentView = 'similarity'; // 'similarity' or 'matrix'
let selectedPlayer = null;
let gameStatusFilter = 'all'; // 'all', 'played', or 'upcoming'

// Handle window resize to switch away from matrix view on mobile
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && currentView === 'matrix') {
            currentView = 'similarity';
            renderViewToggleInHeader();
            renderSimilarityMatrix();
        } else if (!isMobile) {
            // Re-render toggle to show Matrix button when switching back to desktop
            renderViewToggleInHeader();
        }
    }, 250);
});

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

    // Set default selected player to focused player on initial load only
    // (null means never set, empty string means user chose "All players")
    if (selectedPlayer === null && focusedPlayer) {
        selectedPlayer = focusedPlayer;
    } else if (selectedPlayer === null) {
        selectedPlayer = ''; // Default to all players
    }

    const container = d3.select('#similarityMatrixContent');
    container.html(''); // Clear previous content

    // Check if mobile (width <= 768px)
    const isMobile = window.innerWidth <= 768;

    // Don't allow matrix view on mobile - default to similarity
    if (isMobile && currentView === 'matrix') {
        currentView = 'similarity';
        renderViewToggleInHeader(); // Update button states
    }

    // Render appropriate view
    if (currentView === 'similarity') {
        renderSimilarityView(container, data);
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

    // Check if mobile (width <= 768px)
    const isMobile = window.innerWidth <= 768;

    const buttons = [
        { view: 'similarity', icon: 'fa-list', label: 'Similarity' },
        { view: 'matrix', icon: 'fa-th', label: 'Matrix', hideOnMobile: true }
    ];

    // Filter out Matrix button on mobile
    const visibleButtons = isMobile
        ? buttons.filter(btn => !btn.hideOnMobile)
        : buttons;

    toggleContainer.innerHTML = visibleButtons.map(btn => `
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
 * Render shared game filter for all views
 */
function renderGameFilter(container) {
    const filtersDiv = container.append('div')
        .attr('class', 'matrix-filters');

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

    return filtersDiv;
}

/**
 * Render player filter for Similarity view
 */
function renderPlayerFilter(filtersDiv, data) {
    const playerGroup = filtersDiv.append('div')
        .attr('class', 'matrix-filter-group');

    playerGroup.append('label')
        .attr('for', 'similarityPlayerSelect')
        .text('Player:');

    const select = playerGroup.append('select')
        .attr('id', 'similarityPlayerSelect')
        .on('change', function() {
            selectedPlayer = this.value;
            renderSimilarityMatrix();
        });

    // Add "All players" option
    select.append('option')
        .attr('value', '')
        .property('selected', !selectedPlayer)
        .text('All players');

    // Sort players alphabetically and add as options
    const sortedPlayers = [...data.players].sort((a, b) => a.localeCompare(b));
    sortedPlayers.forEach(player => {
        select.append('option')
            .attr('value', player)
            .property('selected', player === selectedPlayer)
            .text(player);
    });
}

/**
 * Render Similarity View - all pairs or one player's comparisons
 */
function renderSimilarityView(container, data) {
    const playerColors = getPlayerColors();

    // Render filters - both game and player selectors
    const filtersDiv = renderGameFilter(container);
    renderPlayerFilter(filtersDiv, data);

    // Get similarities based on player selection
    let similarities;
    let showHeader = false;

    const playerIndex = data.players.indexOf(selectedPlayer);
    if (playerIndex !== -1) {
        // Player selected - show that player vs all others
        similarities = data.matrix[playerIndex]
            .filter(d => !d.isSelf)
            .sort((a, b) => b.similarity - a.similarity);
        showHeader = true;
    } else {
        // No player selected - show all pairs
        similarities = [];
        for (let i = 0; i < data.matrix.length; i++) {
            for (let j = i + 1; j < data.matrix[i].length; j++) {
                if (!data.matrix[i][j].isSelf) {
                    similarities.push(data.matrix[i][j]);
                }
            }
        }
        similarities.sort((a, b) => b.similarity - a.similarity);
    }

    // Add description
    const description = selectedPlayer
        ? `Comparing <strong>${selectedPlayer}</strong> to all other players, sorted from most to least similar.`
        : 'All player pairs ranked by pick agreement, from most to least similar.';

    container.append('div')
        .attr('class', 'similarity-description')
        .html(`<p>${description}</p>`);

    // Wrap visualization in scrollable container
    const vizContainer = container.append('div')
        .attr('class', 'similarity-player-focus-container');

    // Color scale - red (low) to green (high)
    const colorScale = d3.scaleLinear()
        .domain([0, 30, 45, 60, 75, 100])
        .range(['#c62828', '#ef5350', '#ffa726', '#66bb6a', '#2e7d32', '#1b5e20']);

    // Add sticky header if player is selected
    if (showHeader) {
        vizContainer.append('div')
            .attr('class', 'player-focus-header')
            .style('color', playerColors[selectedPlayer] || '#333')
            .text(selectedPlayer);
    }

    // Create table
    const table = vizContainer.append('table')
        .attr('class', 'player-focus-table');

    const tbody = table.append('tbody');

    // Create each row
    similarities.forEach(d => {
        const row = tbody.append('tr')
            .attr('class', 'player-focus-row')
            .on('click', () => showSimilarityModal(d))
            .on('mouseenter', function(event) {
                d3.select(this).classed('hover', true);
                showTooltip(event, d);
            })
            .on('mouseleave', function(event) {
                d3.select(this).classed('hover', false);
                hideTooltip();
            });

        // Player name label cell - show both players if no player selected
        const labelCell = row.append('td')
            .attr('class', 'player-focus-label');

        if (selectedPlayer) {
            // Just show the opponent name
            labelCell.style('color', playerColors[d.player2] || '#333')
                .text(d.player2);
        } else {
            // Show both players
            labelCell.append('span')
                .style('color', playerColors[d.player1] || '#333')
                .text(d.player1);
            labelCell.append('span')
                .style('color', '#666')
                .text(' vs ');
            labelCell.append('span')
                .style('color', playerColors[d.player2] || '#333')
                .text(d.player2);
        }

        // Colored bar cell
        const barCell = row.append('td')
            .attr('class', 'player-focus-bar-container');

        barCell.append('div')
            .attr('class', 'player-focus-bar')
            .style('background-color', colorScale(d.similarity))
            .append('span')
            .attr('class', 'player-focus-percentage')
            .style('color', d.similarity > 60 ? '#fff' : '#333')
            .text(`${d.similarity}%`);

        // Games count cell
        row.append('td')
            .attr('class', 'player-focus-games')
            .text(`${d.matchingGames}/${d.totalGames}`);
    });
}

/**
 * Render Matrix View - complete heatmap with optional player focus
 */
function renderFullMatrixView(container, data) {
    const playerColors = getPlayerColors();

    // Render filters - game selector only
    renderGameFilter(container);

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

    // Wrap in scrollable container with matrix-specific styling
    const vizContainer = container.append('div')
        .attr('class', 'similarity-viz-container similarity-matrix-viz-container')
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

    // Create grid container instead of table
    const grid = vizContainer.append('div')
        .attr('class', 'similarity-matrix-grid')
        .style('grid-template-columns', `repeat(${sortedPlayers.length}, 1fr)`);

    // Color scale - blue gradient with 20% as low cutoff
    const colorScale = d3.scaleLinear()
        .domain([20, 40, 60, 80, 100])
        .range(['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'])
        .clamp(true); // Values below 20% use the lowest color

    // Track initial highlight state
    let initialHighlightActive = true;

    // Create grid cells (grid handles rows automatically)
    alphabeticalMatrix.forEach((row, rowIndex) => {
        row.forEach((cellData, colIndex) => {
            const cell = grid.append('div')
                .attr('class', cellData.isSelf ? 'self-cell grid-cell' : 'similarity-cell grid-cell')
                .attr('data-row', rowIndex)
                .attr('data-col', colIndex);

            // Inner wrapper for square sizing with colored background
            const wrapper = cell.append('div')
                .attr('class', 'cell-square-wrapper')
                .style('background-color', cellData.isSelf ? '#C4B99B' : colorScale(cellData.similarity));

            if (!cellData.isSelf) {
                cell.style('cursor', 'pointer');
            }

            // Add hover and click interactions
            if (!cellData.isSelf) {
                cell.on('mouseenter', function(event) {
                        // Clear initial highlight on first real hover
                        if (initialHighlightActive) {
                            initialHighlightActive = false;
                            // Clear any existing highlights from initial state
                            grid.selectAll('.grid-cell')
                                .classed('cell-row-highlight', false)
                                .classed('cell-col-highlight', false);
                        }

                        // Add border highlights to entire row and column
                        grid.selectAll('.grid-cell').each(function() {
                            const gridCell = d3.select(this);
                            const r = +gridCell.attr('data-row');
                            const c = +gridCell.attr('data-col');
                            if (r === rowIndex) {
                                gridCell.classed('cell-row-highlight', true);
                            }
                            if (c === colIndex) {
                                gridCell.classed('cell-col-highlight', true);
                            }
                        });

                        const cellElement = this;
                        const cellRect = cellElement.getBoundingClientRect();
                        const containerRect = vizContainer.node().getBoundingClientRect();
                        const gridRect = grid.node().getBoundingClientRect();
                        const scrollTop = vizContainer.node().scrollTop;
                        const scrollLeft = vizContainer.node().scrollLeft;

                        // Position and show cell overlay (slightly larger)
                        const wrapperBgColor = d3.select(cellElement).select('.cell-square-wrapper').style('background-color');
                        cellOverlay
                            .style('display', 'block')
                            .style('left', (cellRect.left - containerRect.left + scrollLeft - 2) + 'px')
                            .style('top', (cellRect.top - containerRect.top + scrollTop - 2) + 'px')
                            .style('width', (cellRect.width + 4) + 'px')
                            .style('height', (cellRect.height + 4) + 'px')
                            .style('background-color', wrapperBgColor)
                            .style('border', '2px solid #333');

                        // Position and show row header overlay - centered on row, right edge at grid left
                        const rowPlayer = sortedPlayers[rowIndex];
                        const gridLeftInContainer = gridRect.left - containerRect.left + scrollLeft;
                        const rowCenterY = cellRect.top - containerRect.top + scrollTop + cellRect.height / 2;
                        rowHeaderOverlay
                            .style('display', 'block')
                            .style('left', null)
                            .style('right', `calc(100% - ${gridLeftInContainer}px)`)
                            .style('top', rowCenterY + 'px')
                            .style('color', playerColors[rowPlayer] || '#333')
                            .text(rowPlayer);

                        // Position and show column header overlay - centered on column
                        const colPlayer = sortedPlayers[colIndex];
                        const gridTopInContainer = gridRect.top - containerRect.top + scrollTop;
                        const colCenterX = cellRect.left - containerRect.left + scrollLeft + cellRect.width / 2;

                        // Set text and styling first, then measure for positioning
                        colHeaderOverlay
                            .style('display', 'block')
                            .style('color', playerColors[colPlayer] || '#333')
                            .text(colPlayer);

                        // Measure element dimensions (after rotation - getBoundingClientRect returns rotated dimensions)
                        const overlayRect = colHeaderOverlay.node().getBoundingClientRect();
                        // After -90deg rotation: width=originalHeight, height=originalWidth
                        const rotatedWidth = overlayRect.width;
                        const rotatedHeight = overlayRect.height;

                        // With center center origin and -90deg rotation:
                        // Original dimensions: W (width) = rotatedHeight, H (height) = rotatedWidth
                        // We want center at (colCenterX, Y) and bottom-center at tableTopInContainer
                        // Center is at (left + W/2, top + H/2)
                        // Bottom-center after rotation is at (left + W/2, top + H/2 + W/2)
                        // So: left = colCenterX - W/2 = colCenterX - rotatedHeight/2
                        // And: top = tableTopInContainer - H/2 - W/2 = tableTopInContainer - rotatedWidth/2 - rotatedHeight/2
                        colHeaderOverlay
                            .style('left', (colCenterX - rotatedHeight / 2) + 'px')
                            .style('top', (gridTopInContainer - rotatedWidth / 2 - rotatedHeight / 2) + 'px');

                        showTooltip(event, cellData);
                    })
                    .on('mouseleave', function() {
                        // Remove border highlights from all cells
                        grid.selectAll('.grid-cell')
                            .classed('cell-row-highlight', false)
                            .classed('cell-col-highlight', false);

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

    // Show initial random highlight to demonstrate the interaction
    const nonSelfCells = [];

    // Collect all non-self cells
    alphabeticalMatrix.forEach((row, rowIndex) => {
        row.forEach((cellData, colIndex) => {
            if (!cellData.isSelf) {
                nonSelfCells.push({ rowIndex, colIndex, cellData });
            }
        });
    });

    if (nonSelfCells.length > 0) {
        // Pick a random non-self cell
        const randomCell = nonSelfCells[Math.floor(Math.random() * nonSelfCells.length)];
        const { rowIndex, colIndex, cellData } = randomCell;

        // Add border highlights to entire row and column for initial highlight
        grid.selectAll('.grid-cell').each(function() {
            const gridCell = d3.select(this);
            const r = +gridCell.attr('data-row');
            const c = +gridCell.attr('data-col');
            if (r === rowIndex) {
                gridCell.classed('cell-row-highlight', true);
            }
            if (c === colIndex) {
                gridCell.classed('cell-col-highlight', true);
            }
        });

        // Find the DOM element
        const cellElement = grid.selectAll('.grid-cell')
            .filter(function() {
                const gridCell = d3.select(this);
                return +gridCell.attr('data-row') === rowIndex && +gridCell.attr('data-col') === colIndex;
            })
            .node();
        const cellRect = cellElement.getBoundingClientRect();
        const containerRect = vizContainer.node().getBoundingClientRect();
        const gridRect = grid.node().getBoundingClientRect();
        const scrollTop = vizContainer.node().scrollTop;
        const scrollLeft = vizContainer.node().scrollLeft;

        // Show cell overlay
        const wrapperBgColor = d3.select(cellElement).select('.cell-square-wrapper').style('background-color');
        cellOverlay
            .style('display', 'block')
            .style('left', (cellRect.left - containerRect.left + scrollLeft - 2) + 'px')
            .style('top', (cellRect.top - containerRect.top + scrollTop - 2) + 'px')
            .style('width', (cellRect.width + 4) + 'px')
            .style('height', (cellRect.height + 4) + 'px')
            .style('background-color', wrapperBgColor)
            .style('border', '2px solid #333');

        // Show row header overlay
        const rowPlayer = sortedPlayers[rowIndex];
        const gridLeftInContainer = gridRect.left - containerRect.left + scrollLeft;
        const rowCenterY = cellRect.top - containerRect.top + scrollTop + cellRect.height / 2;
        rowHeaderOverlay
            .style('display', 'block')
            .style('left', null)
            .style('right', `calc(100% - ${gridLeftInContainer}px)`)
            .style('top', rowCenterY + 'px')
            .style('color', playerColors[rowPlayer] || '#333')
            .text(rowPlayer);

        // Show column header overlay
        const colPlayer = sortedPlayers[colIndex];
        const gridTopInContainer = gridRect.top - containerRect.top + scrollTop;
        const colCenterX = cellRect.left - containerRect.left + scrollLeft + cellRect.width / 2;

        colHeaderOverlay
            .style('display', 'block')
            .style('color', playerColors[colPlayer] || '#333')
            .text(colPlayer);

        const overlayRect = colHeaderOverlay.node().getBoundingClientRect();
        const rotatedWidth = overlayRect.width;
        const rotatedHeight = overlayRect.height;

        colHeaderOverlay
            .style('left', (colCenterX - rotatedHeight / 2) + 'px')
            .style('top', (gridTopInContainer - rotatedWidth / 2 - rotatedHeight / 2) + 'px');
    }

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
