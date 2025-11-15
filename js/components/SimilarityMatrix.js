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
        .attr('class', 'similarity-viz-container');

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

    // Create SVG
    const svg = vizContainer.append('svg')
        .attr('class', 'similarity-matrix-svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

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

    // Add colored cells with hover highlighting
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
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
            // Highlight the column header (selected player)
            svg.select('.similarity-column-header')
                .style('font-weight', 'bold')
                .style('text-decoration', 'underline');
            // Highlight the row label
            svg.select(`.player-focus-label[data-player="${d.player2}"]`)
                .style('font-weight', 'bold')
                .style('text-decoration', 'underline');
            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
            // Remove highlight from column header
            svg.select('.similarity-column-header')
                .style('font-weight', 'bold')
                .style('text-decoration', 'none');
            // Remove highlight from row label
            svg.select(`.player-focus-label[data-player="${d.player2}"]`)
                .style('font-weight', '500')
                .style('text-decoration', 'none');
            hideTooltip();
        })
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

    // Add sticky header group AFTER content so it renders on top
    const headerGroup = svg.append('g')
        .attr('class', 'similarity-header-group')
        .attr('transform', `translate(${margin.left},0)`);

    // Add background for sticky header (with 1px overlap to prevent peeking)
    headerGroup.append('rect')
        .attr('class', 'header-bg')
        .attr('x', -margin.left - 1)
        .attr('y', -1)
        .attr('width', width + margin.left + margin.right + 2)
        .attr('height', headerHeight + 2)
        .attr('fill', 'white');

    // Add column header with selected player's name
    headerGroup.append('text')
        .attr('class', 'similarity-column-header')
        .attr('x', cellWidth / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', playerColors[selectedPlayer] || '#333')
        .text(selectedPlayer);

    // Make header sticky on scroll with smooth RAF updates
    const vizContainerNode = vizContainer.node();
    let rafId = null;

    vizContainerNode.addEventListener('scroll', function() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            const scrollTop = this.scrollTop;
            headerGroup.attr('transform', `translate(${margin.left},${scrollTop})`);
            rafId = null;
        });
    }, { passive: true });
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

    // Wrap visualization in scrollable container
    const vizContainer = container.append('div')
        .attr('class', 'similarity-viz-container');

    // Set up dimensions
    const containerWidth = document.getElementById('similarityMatrixContent').offsetWidth;
    const cellSize = Math.max(20, Math.min(50, (containerWidth - 200) / sortedPlayers.length));
    const margin = { top: 150, right: 20, bottom: 20, left: 150 };
    const width = cellSize * sortedPlayers.length;
    const height = cellSize * sortedPlayers.length;

    // Create SVG
    const svg = vizContainer.append('svg')
        .attr('class', 'similarity-matrix-svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale - white (low similarity) to dark blue (high similarity)
    const colorScale = d3.scaleLinear()
        .domain([0, 50, 100])
        .range(['#f0f0f0', '#6baed6', '#08519c']);

    // Create cells
    const cells = g.selectAll('.similarity-cell')
        .data(alphabeticalMatrix.flat())
        .enter()
        .append('g')
        .attr('class', 'similarity-cell-group');

    // Add rectangles
    cells.append('rect')
        .attr('class', d => {
            const classes = ['similarity-cell'];
            if (d.isSelf) classes.push('self-cell');
            if (d.player1 === focusedPlayer || d.player2 === focusedPlayer) {
                classes.push('focused-player-cell');
            }
            return classes.join(' ');
        })
        .attr('x', (d, i) => (i % sortedPlayers.length) * cellSize)
        .attr('y', (d, i) => Math.floor(i / sortedPlayers.length) * cellSize)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', d => d.isSelf ? '#e0e0e0' : colorScale(d.similarity))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', d => d.isSelf ? 'default' : 'pointer')
        .on('mouseover', function(event, d) {
            if (d.isSelf) return;

            d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);

            // Highlight the corresponding row and column labels
            svg.selectAll('.col-label').filter(player => player === d.player2)
                .style('font-weight', 'bold')
                .style('text-decoration', 'underline');

            svg.selectAll('.row-label').filter(player => player === d.player1)
                .style('font-weight', 'bold')
                .style('text-decoration', 'underline');

            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);

            // Remove highlight from row and column labels
            svg.selectAll('.col-label').filter(player => player === d.player2)
                .style('font-weight', player => player === focusedPlayer ? 'bold' : 'normal')
                .style('text-decoration', 'none');

            svg.selectAll('.row-label').filter(player => player === d.player1)
                .style('font-weight', player => player === focusedPlayer ? 'bold' : 'normal')
                .style('text-decoration', 'none');

            hideTooltip();
        })
        .on('click', (event, d) => {
            if (!d.isSelf) {
                showSimilarityModal(d);
            }
        });

    // Add text labels for percentages in larger cells
    if (cellSize > 30) {
        cells.append('text')
            .attr('class', 'similarity-text')
            .attr('x', (d, i) => (i % sortedPlayers.length) * cellSize + cellSize / 2)
            .attr('y', (d, i) => Math.floor(i / sortedPlayers.length) * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${Math.min(12, cellSize / 3)}px`)
            .attr('fill', d => d.similarity > 60 ? '#fff' : '#333')
            .attr('pointer-events', 'none')
            .text(d => d.isSelf ? '' : `${d.similarity}%`);
    }

    // Create sticky header groups AFTER main content so they render on top
    const colLabelsGroup = svg.append('g')
        .attr('class', 'similarity-col-labels-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const rowLabelsGroup = svg.append('g')
        .attr('class', 'similarity-row-labels-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const cornerGroup = svg.append('g')
        .attr('class', 'similarity-corner-group')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add background rectangles for sticky labels (with 1px overlap to prevent peeking)
    colLabelsGroup.append('rect')
        .attr('class', 'col-labels-bg')
        .attr('x', -1)
        .attr('y', -margin.top - 1)
        .attr('width', width + 2)
        .attr('height', margin.top + 2)
        .attr('fill', 'white');

    rowLabelsGroup.append('rect')
        .attr('class', 'row-labels-bg')
        .attr('x', -margin.left - 1)
        .attr('y', -1)
        .attr('width', margin.left + 2)
        .attr('height', height + 2)
        .attr('fill', 'white');

    cornerGroup.append('rect')
        .attr('class', 'corner-bg')
        .attr('x', -margin.left - 1)
        .attr('y', -margin.top - 1)
        .attr('width', margin.left + 2)
        .attr('height', margin.top + 2)
        .attr('fill', 'white');

    // Add column labels (top) - alphabetically sorted - in sticky group
    colLabelsGroup.selectAll('.col-label')
        .data(sortedPlayers)
        .enter()
        .append('text')
        .attr('class', d => {
            const classes = ['col-label'];
            if (d === focusedPlayer) classes.push('focused-label');
            return classes.join(' ');
        })
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'start')
        .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -10)`)
        .style('font-size', '11px')
        .style('fill', d => playerColors[d] || '#333')
        .style('font-weight', d => d === focusedPlayer ? 'bold' : 'normal')
        .text(d => d);

    // Add row labels (left) - alphabetically sorted - in sticky group
    rowLabelsGroup.selectAll('.row-label')
        .data(sortedPlayers)
        .enter()
        .append('text')
        .attr('class', d => {
            const classes = ['row-label'];
            if (d === focusedPlayer) classes.push('focused-label');
            return classes.join(' ');
        })
        .attr('x', -10)
        .attr('y', (d, i) => i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('fill', d => playerColors[d] || '#333')
        .style('font-weight', d => d === focusedPlayer ? 'bold' : 'normal')
        .text(d => d);

    // Make headers sticky on scroll with smooth RAF updates
    const vizContainerNode = vizContainer.node();
    let rafId = null;

    vizContainerNode.addEventListener('scroll', function() {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            const scrollTop = this.scrollTop;
            const scrollLeft = this.scrollLeft;

            // Update column labels to stick to top (only move with vertical scroll)
            colLabelsGroup.attr('transform', `translate(${margin.left},${margin.top + scrollTop})`);

            // Update row labels to stick to left (only move with horizontal scroll)
            rowLabelsGroup.attr('transform', `translate(${margin.left + scrollLeft},${margin.top})`);

            // Update corner to stick to both top-left (move with both scrolls)
            cornerGroup.attr('transform', `translate(${margin.left + scrollLeft},${margin.top + scrollTop})`);

            rafId = null;
        });
    }, { passive: true });


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
