// HorseRace component - handles horse race chart visualization

import { getPlayerColors, getHorseRaceData, setHorseRaceData, getAllGames } from '../state/app-state.js';
import { sanitizeName } from '../utils/sanitizers.js';

// State for crosshair
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

    // Add crosshair group
    crosshairGroup = svg.append('g')
        .attr('class', 'crosshair')
        .style('display', 'none');

    crosshairGroup.append('line')
        .attr('class', 'crosshair-line')
        .attr('y1', 0)
        .attr('y2', height);

    // Add overlay for mouse tracking (add before dots so dots are on top)
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', function(event) {
            handleChartHover(event, svg, x, y, data, width, height);
        })
        .on('mouseout', function() {
            crosshairGroup.style('display', 'none');
            tooltip.style('display', 'none');
        });

    // Create line generator
    const line = d3.line()
        .x((d, i) => x(i + 1))
        .y(d => y(d.cumulativeWins))
        .curve(d3.curveMonotoneX); // Smooth curve

    // Draw lines for each player
    data.forEach(player => {
        const lineData = player.allResults;
        const safeName = sanitizeName(player.name);

        // Add line path
        svg.append('path')
            .datum(lineData)
            .attr('class', 'horse-race-line')
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
            .attr('class', 'horse-race-dot')
            .attr('cx', (d, i) => x(i + 1))
            .attr('cy', d => y(d.cumulativeWins))
            .attr('fill', 'white')
            .attr('stroke', playerColors[player.name])
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .attr('data-game', d => d.game)
            .attr('data-wins', d => d.cumulativeWins)
            .style('opacity', player.visible !== false ? 1 : 0.1)
            .on('mouseover', function(event, d) {
                handleDotHover(event, d, data);
            })
            .on('mouseout', function() {
                handleDotHoverOut();
            });
    });

    // Render legend with new design
    renderRaceLegend(data);

    /**
     * Handle hover on dot - finds all visible players at same position
     */
    function handleDotHover(event, dotData, allPlayers) {
        const gameNum = dotData.game;
        const wins = dotData.cumulativeWins;

        // Find all visible players at this exact position
        const playersAtPosition = allPlayers.filter(p => {
            if (p.visible === false) return false; // Skip hidden players

            const gameResult = p.allResults.find(r => r.game === gameNum);
            return gameResult && gameResult.cumulativeWins === wins;
        });

        // Only show interaction if there are visible players at this position
        if (playersAtPosition.length === 0) return;

        // Highlight all lines at this position
        d3.selectAll('.horse-race-line')
            .classed('highlighted', false)
            .classed('dimmed', true);

        playersAtPosition.forEach(player => {
            const safeName = sanitizeName(player.name);
            d3.select(`.horse-race-line[data-player="${safeName}"]`)
                .classed('highlighted', true)
                .classed('dimmed', false);
        });

        // Highlight all dots at this position
        d3.selectAll('.horse-race-dot')
            .classed('highlighted', false)
            .classed('dimmed', true);

        playersAtPosition.forEach(player => {
            const safeName = sanitizeName(player.name);
            d3.selectAll(`.horse-race-dot[data-player="${safeName}"]`)
                .classed('highlighted', true)
                .classed('dimmed', false);
        });

        // Highlight cards
        d3.selectAll('.race-legend-item').style('opacity', 0.4);
        playersAtPosition.forEach(player => {
            const safeName = sanitizeName(player.name);
            d3.select(`.race-legend-item[data-player="${safeName}"]`).style('opacity', 1);
        });

        // Get game information
        const allGames = getAllGames();
        const gameInfo = allGames.find(g => g.gameNumber === gameNum);

        // Build tooltip content - unified structure for single and multiple players
        let tooltipContent = '';

        // Get the record from any player (they all have same record at this position)
        const firstPlayer = playersAtPosition[0];
        const firstResult = firstPlayer.allResults.find(r => r.game === gameNum);
        const record = `${firstResult.cumulativeWins}-${firstResult.cumulativeLosses}`;

        // Game number + record header
        tooltipContent += `<div style="opacity: 0.7; margin-bottom: 3px; font-size: 11px;">G${gameNum} ${record}</div>`;

        // Each player with icon in front
        playersAtPosition.forEach((player, idx) => {
            const gameResult = player.allResults.find(r => r.game === gameNum);
            const playerColor = playerColors[player.name];
            const resultIcon = gameResult.result === 'W'
                ? '<span style="color: #4CAF50;">✓</span>'
                : '<span style="color: #f44336;">✗</span>';

            tooltipContent += `<div style="font-size: 11px;">${resultIcon} <span style="color: ${playerColor}; font-weight: 600;">${player.name}</span></div>`;
        });

        // Game result if available
        if (gameInfo && gameInfo.winner) {
            const loser = gameInfo.winner === gameInfo.team1 ? gameInfo.team2 : gameInfo.team1;
            tooltipContent += `<div style="font-size: 10px; opacity: 0.6; margin-top: 3px; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.15);"><strong>${gameInfo.winner}</strong> def <em>${loser}</em></div>`;
        }

        tooltip.html(tooltipContent)
            .style('display', 'block')
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    /**
     * Handle dot hover out
     */
    function handleDotHoverOut() {
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

    sortedData.forEach(player => {
        const safeName = sanitizeName(player.name);

        const item = legendContainer.append('div')
            .attr('class', `race-legend-item ${player.visible === false ? 'hidden' : ''}`)
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('border-left-color', playerColors[player.name])
            .on('click', function() {
                player.visible = player.visible === false ? true : false;
                const horseRaceData = getHorseRaceData();
                renderHorseRace(horseRaceData);
            })
            .on('mouseover', function() {
                // Only show hover effects if player is visible
                if (player.visible === false) return;

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

        // First line: name and record
        const firstLine = info.append('div')
            .attr('class', 'race-card-line');

        firstLine.append('div')
            .attr('class', 'race-legend-name')
            .text(player.name);

        firstLine.append('span')
            .attr('class', 'race-legend-record')
            .text(`${player.wins}-${player.losses}`);

        // Second line: rank and recent form
        const secondLine = info.append('div')
            .attr('class', 'race-card-line');

        secondLine.append('div')
            .attr('class', 'race-legend-rank')
            .text(`Rank #${player.rank}`);

        // Recent form (last 5 games)
        const formContainer = secondLine.append('div')
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
}
