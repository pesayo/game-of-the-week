// HorseRace component - handles horse race chart visualization

import { getPlayerColors, getHorseRaceData, setHorseRaceData } from '../state/app-state.js';
import { sanitizeName } from '../utils/sanitizers.js';

// State for current filter
let currentFilter = 'all'; // 'all', 'top5', 'top10'
let crosshairGroup = null;

/**
 * Render Horse Race Chart showing cumulative wins over time
 * @param {Array} data - Player data with game results
 */
export function renderHorseRace(data) {
    const container = d3.select('#horseRaceChart');
    const tooltip = d3.select('#raceTooltip');
    const legendContainer = d3.select('#raceLegend');
    const playerColors = getPlayerColors();

    // Initialize visibility on first render - only top tier visible by default
    data.forEach(player => {
        if (player.visible === undefined) {
            player.visible = player.rank <= 3; // Only top 3 visible by default
        }
    });

    container.selectAll("*").remove();
    legendContainer.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = containerWidth - margin.left - margin.right;
    const chartHeight = window.innerWidth >= 1200 ? 450 : 400;
    const height = chartHeight - margin.top - margin.bottom;

    const svg = container
        .attr('width', containerWidth)
        .attr('height', chartHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Find max games across all players
    const maxGames = d3.max(data, d => d.allResults.length);

    // Create x scale with game numbers
    const x = d3.scaleLinear()
        .domain([1, maxGames])
        .range([0, width]);

    // Create y scale with wins
    const maxWins = d3.max(data, d => d.wins);
    const y = d3.scaleLinear()
        .domain([0, maxWins])
        .range([height, 0]);

    // Add subtle grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        );

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(Math.min(maxGames, 15)).tickFormat(d => `G${d}`))
        .selectAll("text")
        .style("font-size", "11px")
        .style("color", "var(--text-secondary)");

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y).ticks(Math.min(maxWins, 10)))
        .selectAll("text")
        .style("font-size", "11px")
        .style("color", "var(--text-secondary)");

    // Add Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', 'var(--text-primary)')
        .text('Total Wins');

    // Add X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', 'var(--text-primary)')
        .text('Game Number');

    // Create line generator
    const line = d3.line()
        .x((d, i) => x(i + 1))
        .y(d => y(d.cumulativeWins))
        .curve(d3.curveMonotoneX); // Smooth curve

    // Determine tier for each player based on rank
    const getTier = (rank) => {
        if (rank <= 3) return 'tier-top';
        if (rank <= Math.ceil(data.length / 2)) return 'tier-middle';
        return 'tier-bottom';
    };

    // Filter data based on current filter
    const getFilteredData = () => {
        if (currentFilter === 'top5') return data.slice(0, 5);
        if (currentFilter === 'top10') return data.slice(0, 10);
        return data;
    };

    const filteredData = getFilteredData();

    // Draw lines for each player
    filteredData.forEach(player => {
        const lineData = player.allResults;
        const safeName = sanitizeName(player.name);
        const tier = getTier(player.rank);

        // Add line path
        svg.append('path')
            .datum(lineData)
            .attr('class', `horse-race-line ${tier}`)
            .attr('d', line)
            .attr('stroke', playerColors[player.name])
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('opacity', player.visible !== false ? null : 0.1);

        // Add dots
        svg.selectAll(`.dot-${safeName}`)
            .data(lineData)
            .enter()
            .append('circle')
            .attr('class', `horse-race-dot ${tier}`)
            .attr('cx', (d, i) => x(i + 1))
            .attr('cy', d => y(d.cumulativeWins))
            .attr('fill', 'white')
            .attr('stroke', playerColors[player.name])
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('opacity', player.visible !== false ? 1 : 0.1)
            .on('mouseover', function(event, d) {
                handleLineHover(safeName, true, event, d, player);
            })
            .on('mouseout', function() {
                handleLineHover(safeName, false);
            });
    });

    // Add crosshair group
    crosshairGroup = svg.append('g')
        .attr('class', 'crosshair')
        .style('display', 'none');

    crosshairGroup.append('line')
        .attr('class', 'crosshair-line')
        .attr('y1', 0)
        .attr('y2', height);

    // Add overlay for mouse tracking
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            handleChartHover(event, svg, x, y, filteredData, width, height);
        })
        .on('mouseout', function() {
            crosshairGroup.style('display', 'none');
            tooltip.style('display', 'none');
        });

    // Render legend with new design
    renderRaceLegend(data);

    /**
     * Handle hover on line/dot
     */
    function handleLineHover(safeName, isHovering, event = null, dotData = null, player = null) {
        if (isHovering) {
            // Highlight this line
            d3.selectAll('.horse-race-line')
                .classed('highlighted', false)
                .classed('dimmed', true);
            d3.select(`.horse-race-line[data-player="${safeName}"]`)
                .classed('highlighted', true)
                .classed('dimmed', false);

            // Highlight dots
            d3.selectAll('.horse-race-dot')
                .classed('highlighted', false)
                .classed('dimmed', true);
            d3.selectAll(`.horse-race-dot[data-player="${safeName}"]`)
                .classed('highlighted', true)
                .classed('dimmed', false);

            // Highlight card
            d3.selectAll('.race-legend-item').style('opacity', 0.4);
            d3.select(`.race-legend-item[data-player="${safeName}"]`).style('opacity', 1);

            // Show tooltip if we have event and data
            if (event && dotData && player) {
                tooltip.html(`
                    <div style="padding: 10px;">
                        <strong style="font-size: 14px;">${player.name}</strong><br>
                        <span style="color: var(--text-secondary); font-size: 12px;">Game ${dotData.game}</span><br>
                        <div style="margin-top: 8px; font-size: 13px;">
                            ${dotData.result === 'W' ?
                                '<span style="color: var(--success);">✓ Win</span>' :
                                '<span style="color: var(--error);">✗ Loss</span>'
                            }
                        </div>
                        <div style="margin-top: 6px; font-size: 12px; color: var(--text-secondary);">
                            Record: ${dotData.cumulativeWins}-${dotData.cumulativeLosses}
                        </div>
                    </div>
                `)
                .style('display', 'block')
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            }
        } else {
            // Reset all
            d3.selectAll('.horse-race-line')
                .classed('highlighted', false)
                .classed('dimmed', false);
            d3.selectAll('.horse-race-dot')
                .classed('highlighted', false)
                .classed('dimmed', false);
            d3.selectAll('.race-legend-item').style('opacity', null);
            tooltip.style('display', 'none');
        }
    }

    /**
     * Handle hover on chart area (crosshair)
     */
    function handleChartHover(event, svg, x, y, data, width, height) {
        const [mouseX] = d3.pointer(event);

        // Clamp to chart bounds
        if (mouseX < 0 || mouseX > width) {
            crosshairGroup.style('display', 'none');
            return;
        }

        // Show crosshair
        crosshairGroup.style('display', null);
        crosshairGroup.select('.crosshair-line')
            .attr('x1', mouseX)
            .attr('x2', mouseX);

        // Calculate game number
        const gameNum = Math.round(x.invert(mouseX));
        if (gameNum < 1 || gameNum > d3.max(data, d => d.allResults.length)) {
            crosshairGroup.style('display', 'none');
            return;
        }
    }
}

/**
 * Render race legend with modern player cards
 * @param {Array} data - Player data
 */
export function renderRaceLegend(data) {
    const legendContainer = d3.select('#raceLegend');
    const playerColors = getPlayerColors();
    legendContainer.selectAll("*").remove();

    // Sort by rank
    const sortedData = [...data].sort((a, b) => a.rank - b.rank);

    // Determine tier for styling
    const getTier = (rank) => {
        if (rank <= 3) return 'tier-top';
        if (rank <= Math.ceil(data.length / 2)) return 'tier-middle';
        return 'tier-bottom';
    };

    sortedData.forEach(player => {
        const safeName = sanitizeName(player.name);
        const tier = getTier(player.rank);

        const item = legendContainer.append('div')
            .attr('class', `race-legend-item ${tier} ${player.visible === false ? 'hidden' : ''}`)
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('border-left-color', playerColors[player.name])
            .on('click', function() {
                player.visible = player.visible === false ? true : false;
                const horseRaceData = getHorseRaceData();
                renderHorseRace(horseRaceData);
            })
            .on('mouseover', function() {
                // Highlight corresponding line
                d3.selectAll('.horse-race-line')
                    .classed('highlighted', false)
                    .classed('dimmed', true);
                d3.select(`.horse-race-line[data-player="${safeName}"]`)
                    .classed('highlighted', true)
                    .classed('dimmed', false);

                d3.selectAll('.horse-race-dot')
                    .classed('highlighted', false)
                    .classed('dimmed', true);
                d3.selectAll(`.horse-race-dot[data-player="${safeName}"]`)
                    .classed('highlighted', true)
                    .classed('dimmed', false);

                // Dim other cards
                d3.selectAll('.race-legend-item').style('opacity', 0.4);
                d3.select(this).style('opacity', 1);
            })
            .on('mouseout', function() {
                d3.selectAll('.horse-race-line')
                    .classed('highlighted', false)
                    .classed('dimmed', false);
                d3.selectAll('.horse-race-dot')
                    .classed('highlighted', false)
                    .classed('dimmed', false);
                d3.selectAll('.race-legend-item').style('opacity', null);
            });

        // Card header
        const header = item.append('div')
            .attr('class', 'race-card-header');

        header.append('div')
            .attr('class', 'race-legend-color')
            .style('background-color', playerColors[player.name]);

        const info = header.append('div')
            .attr('class', 'race-card-info');

        info.append('div')
            .attr('class', 'race-legend-name')
            .text(player.name);

        info.append('div')
            .attr('class', 'race-legend-rank')
            .text(`Rank #${player.rank}`);

        // Card stats
        const stats = item.append('div')
            .attr('class', 'race-card-stats');

        stats.append('span')
            .attr('class', 'race-legend-record')
            .text(`${player.wins}-${player.losses}`);

        // Recent form (last 5 games)
        const formContainer = stats.append('div')
            .attr('class', 'race-card-form');

        const recentGames = player.allResults.slice(-5);
        recentGames.forEach(game => {
            formContainer.append('div')
                .attr('class', `race-form-dot ${game.result === 'W' ? 'win' : 'loss'}`)
                .attr('title', `Game ${game.game}: ${game.result === 'W' ? 'Win' : 'Loss'}`);
        });
    });
}

/**
 * Setup race control buttons
 */
export function setupRaceControls() {
    const horseRaceData = getHorseRaceData();

    // Show/Hide All buttons
    d3.select('#showAllRace').on('click', () => {
        horseRaceData.forEach(p => p.visible = true);
        renderHorseRace(horseRaceData);
    });

    d3.select('#hideAllRace').on('click', () => {
        horseRaceData.forEach(p => p.visible = false);
        renderHorseRace(horseRaceData);
    });

    // Filter buttons
    d3.select('#showTop5').on('click', function() {
        currentFilter = 'top5';
        updateFilterButtons();
        horseRaceData.forEach(p => p.visible = true);
        renderHorseRace(horseRaceData);
    });

    d3.select('#showTop10').on('click', function() {
        currentFilter = 'top10';
        updateFilterButtons();
        horseRaceData.forEach(p => p.visible = true);
        renderHorseRace(horseRaceData);
    });

    d3.select('#showAllPlayers').on('click', function() {
        currentFilter = 'all';
        updateFilterButtons();
        horseRaceData.forEach(p => p.visible = true);
        renderHorseRace(horseRaceData);
    });

    updateFilterButtons();
}

/**
 * Update active state of filter buttons
 */
function updateFilterButtons() {
    d3.selectAll('.race-filter-btn').classed('active', false);
    if (currentFilter === 'top5') {
        d3.select('#showTop5').classed('active', true);
    } else if (currentFilter === 'top10') {
        d3.select('#showTop10').classed('active', true);
    } else {
        d3.select('#showAllPlayers').classed('active', true);
    }
}
