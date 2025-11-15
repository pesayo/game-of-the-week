/**
 * SimilarityMatrix component - visualizes how similarly players pick games
 * Shows a heatmap where darker colors indicate higher agreement between player pairs
 */

import { getRawPicksData, getMatchupsData, getPlayerColors, getFocusedPlayer } from '../state/app-state.js';
import { parseGameColumn, createGameKey } from '../utils/parsers.js';

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

        // Only count games where both players made picks
        if (pick1 && pick2) {
            totalGames++;

            if (pick1 === pick2) {
                matchingGames++;
            } else {
                // Track differences for detailed comparison
                const gameInfo = parseGameColumn(gameHeader);
                if (gameInfo) {
                    const gameKey = createGameKey(gameInfo.week, gameInfo.date, gameInfo.time, gameInfo.sheet);
                    const game = gameMap[gameKey];
                    if (game) {
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
 * Render the similarity matrix as a D3 heatmap
 */
export function renderSimilarityMatrix() {
    const data = calculateSimilarityMatrix();
    const playerColors = getPlayerColors();
    const focusedPlayer = getFocusedPlayer();

    if (!data.players || data.players.length === 0) {
        document.getElementById('similarityMatrixContent').innerHTML =
            '<p class="no-data">No similarity data available</p>';
        return;
    }

    const container = d3.select('#similarityMatrixContent');
    container.html(''); // Clear previous content

    // Add description
    const description = container.append('div')
        .attr('class', 'similarity-description');

    description.append('p')
        .html('This matrix shows how similarly each pair of players picks games. Darker cells indicate higher agreement. Click any cell to see detailed pick differences.');

    // Set up dimensions
    const containerWidth = document.getElementById('similarityMatrixContent').offsetWidth;
    const cellSize = Math.max(20, Math.min(50, (containerWidth - 200) / data.players.length));
    const margin = { top: 150, right: 20, bottom: 20, left: 150 };
    const width = cellSize * data.players.length;
    const height = cellSize * data.players.length;

    // Create SVG
    const svg = container.append('svg')
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
        .data(data.matrix.flat())
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
        .attr('x', (d, i) => (i % data.players.length) * cellSize)
        .attr('y', (d, i) => Math.floor(i / data.players.length) * cellSize)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', d => d.isSelf ? '#e0e0e0' : colorScale(d.similarity))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', d => d.isSelf ? 'default' : 'pointer')
        .on('mouseover', function(event, d) {
            if (d.isSelf) return;

            d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);

            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
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
            .attr('x', (d, i) => (i % data.players.length) * cellSize + cellSize / 2)
            .attr('y', (d, i) => Math.floor(i / data.players.length) * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', `${Math.min(12, cellSize / 3)}px`)
            .attr('fill', d => d.similarity > 60 ? '#fff' : '#333')
            .attr('pointer-events', 'none')
            .text(d => d.isSelf ? '' : `${d.similarity}%`);
    }

    // Add column labels (top)
    g.selectAll('.col-label')
        .data(data.players)
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

    // Add row labels (left)
    g.selectAll('.row-label')
        .data(data.players)
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

    // Add legend
    addLegend(container, colorScale);
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
