// HorseRace component - handles horse race chart visualization

import { getPlayerColors, getHorseRaceData, setHorseRaceData } from '../state/app-state.js';
import { sanitizeName } from '../utils/sanitizers.js';

/**
 * Render Horse Race Chart showing cumulative wins over time
 * @param {Array} data - Player data with game results
 */
export function renderHorseRace(data) {
    const container = d3.select('#horseRaceChart');
    const tooltip = d3.select('#raceTooltip');
    const legendContainer = d3.select('#raceLegend');
    const playerColors = getPlayerColors();

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

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(maxGames).tickFormat(d => `G${d}`))
        .selectAll("text")
        .style("font-size", "11px");

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y).ticks(maxWins));

    // Add Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Wins');

    // Add X axis label
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text('Game Number');

    // Create line generator
    const line = d3.line()
        .x((d, i) => x(i + 1))
        .y(d => y(d.cumulativeWins));

    // Draw lines for each player
    data.forEach(player => {
        const lineData = player.allResults;
        const safeName = sanitizeName(player.name);

        svg.append('path')
            .datum(lineData)
            .attr('class', 'horse-race-line')
            .attr('d', line)
            .attr('stroke', playerColors[player.name])
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('opacity', player.visible !== false ? 1 : 0.1);

        // Add dots
        svg.selectAll(`.dot-${safeName}`)
            .data(lineData)
            .enter()
            .append('circle')
            .attr('class', `horse-race-dot dot-${safeName}`)
            .attr('cx', (d, i) => x(i + 1))
            .attr('cy', d => y(d.cumulativeWins))
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', playerColors[player.name])
            .attr('data-player', safeName)
            .attr('data-player-name', player.name)
            .style('opacity', player.visible !== false ? 1 : 0.1)
            .on('mouseover', function(event, d) {
                // Highlight line
                d3.selectAll('.horse-race-line').classed('highlighted', false);
                d3.select(`.horse-race-line[data-player="${safeName}"]`).classed('highlighted', true);

                // Show tooltip
                tooltip.html(`
                    <strong>${player.name}</strong><br>
                    Game ${d.game}: ${d.result === 'W' ? 'Win ✓' : 'Loss ✗'}<br>
                    Record: ${d.cumulativeWins}-${d.cumulativeLosses}
                `)
                .style('display', 'block')
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.selectAll('.horse-race-line').classed('highlighted', false);
                tooltip.style('display', 'none');
            });
    });

    // Render legend
    renderRaceLegend(data);
}

/**
 * Render race legend with player names and records
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
            .on('click', function() {
                player.visible = player.visible === false ? true : false;
                const horseRaceData = getHorseRaceData();
                renderHorseRace(horseRaceData);
            })
            .on('mouseover', function() {
                d3.selectAll('.horse-race-line').classed('highlighted', false);
                d3.select(`.horse-race-line[data-player="${safeName}"]`).classed('highlighted', true);
            })
            .on('mouseout', function() {
                d3.selectAll('.horse-race-line').classed('highlighted', false);
            });

        item.append('div')
            .attr('class', 'race-legend-color')
            .style('background-color', playerColors[player.name]);

        item.append('span')
            .attr('class', 'race-legend-name')
            .text(player.name);

        item.append('span')
            .attr('class', 'race-legend-record')
            .text(`${player.wins}-${player.losses}`);
    });
}

/**
 * Setup race control buttons (show all / hide all)
 */
export function setupRaceControls() {
    const horseRaceData = getHorseRaceData();

    d3.select('#showAllRace').on('click', () => {
        horseRaceData.forEach(p => p.visible = true);
        renderHorseRace(horseRaceData);
    });

    d3.select('#hideAllRace').on('click', () => {
        horseRaceData.forEach(p => p.visible = false);
        renderHorseRace(horseRaceData);
    });
}
