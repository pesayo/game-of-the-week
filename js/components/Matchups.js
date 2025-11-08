// Matchups component - handles upcoming matchups and schedule display

import { getAllGames, getTeamLineups, setTeamLineups, getScheduleFilter, setScheduleFilter } from '../state/app-state.js';
import { parseGameDate } from '../utils/parsers.js';
import { getSpritePosition } from '../utils/colors.js';

/**
 * Load team lineups from team_cards.json
 */
export async function loadTeamLineups() {
    try {
        const response = await fetch('mcc_integration/team_cards.json');
        const data = await response.json();

        const lineups = {};

        // Map teams by skip's full name to handle cases where skips share last names
        data.teams.forEach(team => {
            const skipMember = team.members.find(m => m.position === 'Skip');

            // Map by skip's full name (e.g., "Allan Veler")
            if (skipMember && skipMember.full_name) {
                lineups[skipMember.full_name] = team.members;
            }

            // Also map by team_name if it exists
            if (team.team_name && team.team_name.trim() !== '') {
                lineups[team.team_name] = team.members;
            }
        });

        setTeamLineups(lineups);
    } catch (error) {
        console.error('Error loading team lineups:', error);
    }
}

/**
 * Create member element for tooltip
 * @param {Object} member - Team member object
 * @returns {HTMLElement} Member element
 */
export function createTooltipMemberElement(member) {
    const div = document.createElement('div');
    div.className = 'tooltip-member';

    if (member.position === 'Skip') {
        div.classList.add('skip-member');
    }

    const positionClass = `position-${member.position.toLowerCase()}`;

    let avatarHtml = '';
    if (member.avatar) {
        avatarHtml = `
            <div class="tooltip-avatar-wrapper">
                <img src="${member.avatar}" alt="${member.full_name}" class="tooltip-avatar ${positionClass}">
            </div>
        `;
    } else {
        const spritePosition = getSpritePosition(member.member_id);
        avatarHtml = `
            <div class="tooltip-avatar-wrapper">
                <div class="tooltip-avatar-sprite ${positionClass}"
                     style="background-position: ${spritePosition}"
                     title="${member.full_name}"></div>
            </div>
        `;
    }

    div.innerHTML = `
        ${avatarHtml}
        <div class="tooltip-member-name">${member.first_name} ${member.last_name}</div>
        <span class="tooltip-position-badge ${positionClass}">${member.position}</span>
    `;

    return div;
}

/**
 * Show matchup tooltip with team lineups
 * @param {Event} event - Mouse event
 * @param {Object} game - Game object
 */
export function showMatchupTooltip(event, game) {
    const tooltip = document.getElementById('matchupTooltip');
    const teamLineups = getTeamLineups();

    // Match by full team name (e.g., "Allan Veler")
    const team1Lineup = teamLineups[game.team1] || [];
    const team2Lineup = teamLineups[game.team2] || [];

    // Determine team order and divider text based on whether game has been decided
    let firstTeam, secondTeam, firstTeamLineup, secondTeamLineup;
    let dividerText = 'VS';
    let titleText = `Team ${game.team1} vs Team ${game.team2}`;

    if (game.winner) {
        // Game decided: winner first, loser second
        if (game.winner === game.team1) {
            firstTeam = game.team1;
            secondTeam = game.team2;
            firstTeamLineup = team1Lineup;
            secondTeamLineup = team2Lineup;
        } else {
            firstTeam = game.team2;
            secondTeam = game.team1;
            firstTeamLineup = team2Lineup;
            secondTeamLineup = team1Lineup;
        }
        dividerText = 'DEFEATED';
        titleText = `Team ${firstTeam} defeated Team ${secondTeam}`;
    } else {
        // Game not decided: keep original order
        firstTeam = game.team1;
        secondTeam = game.team2;
        firstTeamLineup = team1Lineup;
        secondTeamLineup = team2Lineup;
    }

    let tooltipContent = `
        <div class="matchup-tooltip-header">
            <div class="matchup-tooltip-title">${titleText}</div>
            <div class="matchup-tooltip-info">Week ${game.week} | ${game.date} | ${game.time} | Sheet ${game.sheet}</div>
        </div>
        <div class="matchup-tooltip-body">
    `;

    // First Team - members above team name
    if (game.winner && game.winner === firstTeam) {
        // Winner
        tooltipContent += `
            <div class="tooltip-team-section winner-section">
                <div class="tooltip-members-row" id="firstTeamMembers"></div>
                <div class="tooltip-team-name winner">
                    Team ${firstTeam} <i class="fas fa-trophy"></i>
                </div>
            </div>
        `;
    } else {
        // Non-winner or undecided
        tooltipContent += `
            <div class="tooltip-team-section winner-section">
                <div class="tooltip-members-row" id="firstTeamMembers"></div>
                <div class="tooltip-team-name">
                    Team ${firstTeam}
                </div>
            </div>
        `;
    }

    tooltipContent += `<div class="tooltip-vs-divider">${dividerText}</div>`;

    // Second Team - team name above members
    if (game.winner && game.winner === secondTeam) {
        // Winner
        tooltipContent += `
            <div class="tooltip-team-section">
                <div class="tooltip-team-name winner">
                    Team ${secondTeam} <i class="fas fa-trophy"></i>
                </div>
                <div class="tooltip-members-row" id="secondTeamMembers"></div>
            </div>
        `;
    } else {
        // Non-winner or undecided
        tooltipContent += `
            <div class="tooltip-team-section">
                <div class="tooltip-team-name">
                    Team ${secondTeam}
                </div>
                <div class="tooltip-members-row" id="secondTeamMembers"></div>
            </div>
        `;
    }

    tooltipContent += '</div>';
    tooltip.innerHTML = tooltipContent;

    // Add members after HTML is in DOM
    const firstTeamContainer = tooltip.querySelector('#firstTeamMembers');
    const secondTeamContainer = tooltip.querySelector('#secondTeamMembers');

    if (firstTeamLineup.length > 0) {
        firstTeamLineup.forEach(member => {
            firstTeamContainer.appendChild(createTooltipMemberElement(member));
        });
    } else {
        firstTeamContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No lineup data available</div>';
    }

    if (secondTeamLineup.length > 0) {
        secondTeamLineup.forEach(member => {
            secondTeamContainer.appendChild(createTooltipMemberElement(member));
        });
    } else {
        secondTeamContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px;">No lineup data available</div>';
    }

    // Position tooltip near cursor
    tooltip.style.display = 'block';
    const tooltipRect = tooltip.getBoundingClientRect();
    const x = event.pageX + 15;
    const y = event.pageY - tooltipRect.height / 2;

    // Keep tooltip on screen
    const maxX = window.innerWidth + window.scrollX - tooltipRect.width - 20;
    const maxY = window.innerHeight + window.scrollY - tooltipRect.height - 20;

    tooltip.style.left = Math.min(x, maxX) + 'px';
    tooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
}

/**
 * Hide matchup tooltip
 */
export function hideMatchupTooltip() {
    document.getElementById('matchupTooltip').style.display = 'none';
}

/**
 * Get upcoming games (next game date after the most recent completed game)
 * Filters out postponed/past games by using most recent completed game as cutoff
 * @returns {Array} List of upcoming games
 */
export function getUpcomingGamesFiltered() {
    const allGames = getAllGames();

    // Get all games with parsed dates
    const allGamesWithDates = allGames.map(game => ({
        ...game,
        parsedDate: parseGameDate(game.date)
    })).filter(game => game.parsedDate !== null);

    // Separate completed and unplayed games
    const completedGames = allGamesWithDates.filter(game => game.winner);
    const unplayedGames = allGamesWithDates.filter(game => !game.winner);

    // Get the most recent completed game date as a threshold
    let cutoffDate = new Date(0); // Start of epoch if no completed games
    if (completedGames.length > 0) {
        // Sort completed games by date (most recent first)
        const sortedCompleted = [...completedGames].sort((a, b) => b.parsedDate - a.parsedDate);
        cutoffDate = sortedCompleted[0].parsedDate;
    }

    // Filter to only truly future games (after the most recent completed game)
    const futureUnplayedGames = unplayedGames.filter(game => game.parsedDate > cutoffDate);

    if (futureUnplayedGames.length === 0) {
        return [];
    }

    // Sort by date
    futureUnplayedGames.sort((a, b) => a.parsedDate - b.parsedDate);

    // Get the first (next) game date
    const nextGameDate = futureUnplayedGames[0].parsedDate;

    // Filter to only games on that specific date
    const upcomingGames = futureUnplayedGames.filter(game => {
        const isSameDate = game.parsedDate.getTime() === nextGameDate.getTime();
        return isSameDate;
    });

    return upcomingGames;
}

/**
 * Create a compact matchup card element for full schedule
 * @param {Object} game - Game object
 * @returns {HTMLElement} Matchup card element
 */
export function createMatchupCard(game) {
    const card = document.createElement('div');
    card.className = `matchup-card ${game.winner ? 'completed' : ''}`;

    // Compact single-line format: "Marcus Oldenburg vs Steve Oakeson" with winner indicator
    const team1Display = game.winner === game.team1 ? `<strong>${game.team1}</strong> <i class="fas fa-trophy"></i>` : game.team1;
    const team2Display = game.winner === game.team2 ? `<strong>${game.team2}</strong> <i class="fas fa-trophy"></i>` : game.team2;

    card.innerHTML = `
        <div class="matchup-compact-header">
            Week ${game.week} | ${game.date} | ${game.time} | Sheet ${game.sheet}
        </div>
        <div class="matchup-compact-teams">
            ${team1Display} <span class="compact-vs">vs</span> ${team2Display}
        </div>
    `;

    // Add hover events
    card.addEventListener('mouseenter', (e) => showMatchupTooltip(e, game));
    card.addEventListener('mouseleave', hideMatchupTooltip);
    card.addEventListener('mousemove', (e) => {
        const tooltip = document.getElementById('matchupTooltip');
        if (tooltip.style.display === 'block') {
            const tooltipRect = tooltip.getBoundingClientRect();
            const x = e.pageX + 15;
            const y = e.pageY - tooltipRect.height / 2;
            const maxX = window.innerWidth + window.scrollX - tooltipRect.width - 20;
            const maxY = window.innerHeight + window.scrollY - tooltipRect.height - 20;
            tooltip.style.left = Math.min(x, maxX) + 'px';
            tooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
        }
    });

    return card;
}

/**
 * Create an expanded upcoming matchup card with team lineups
 * @param {Object} game - Game object
 * @returns {HTMLElement} Expanded matchup card element
 */
function createUpcomingMatchupCard(game) {
    const card = document.createElement('div');
    card.className = 'upcoming-matchup-card';

    const teamLineups = getTeamLineups();
    const team1Lineup = teamLineups[game.team1] || [];
    const team2Lineup = teamLineups[game.team2] || [];

    // Sanitize time to create a valid HTML ID
    const sanitizedTime = game.time.replace(/[^\w]/g, '');

    card.innerHTML = `
        <div class="upcoming-matchup-body">
            <div class="upcoming-team-section">
                <div class="upcoming-team-name">${game.team1}</div>
                <div class="upcoming-members-row" id="upcoming-team1-${game.week}-${game.sheet}-${sanitizedTime}"></div>
            </div>
            <div class="upcoming-vs-divider">${game.time} <br> Sheet ${game.sheet}</div>
            <div class="upcoming-team-section">
                <div class="upcoming-team-name">${game.team2}</div>
                <div class="upcoming-members-row" id="upcoming-team2-${game.week}-${game.sheet}-${sanitizedTime}"></div>
            </div>
        </div>
    `;

    // Add team members after card is created
    setTimeout(() => {
        const team1Container = document.getElementById(`upcoming-team1-${game.week}-${game.sheet}-${sanitizedTime}`);
        const team2Container = document.getElementById(`upcoming-team2-${game.week}-${game.sheet}-${sanitizedTime}`);

        if (team1Container && team1Lineup.length > 0) {
            team1Lineup.forEach(member => {
                team1Container.appendChild(createTooltipMemberElement(member));
            });
        } else if (team1Container) {
            team1Container.innerHTML = '<div style="color: #999; font-size: 12px;">No lineup data</div>';
        }

        if (team2Container && team2Lineup.length > 0) {
            // Reverse order for right team to create mirror effect (Lead, Second, Vice, Skip from left to right)
            team2Lineup.slice().reverse().forEach(member => {
                team2Container.appendChild(createTooltipMemberElement(member));
            });
        } else if (team2Container) {
            team2Container.innerHTML = '<div style="color: #999; font-size: 12px;">No lineup data</div>';
        }
    }, 0);

    return card;
}

/**
 * Render upcoming matchups with expanded team lineup view
 */
export function renderUpcomingMatchups() {
    const container = document.getElementById('upcomingMatchupsGrid');
    container.innerHTML = '';

    const upcomingGames = getUpcomingGamesFiltered();

    // Update header text based on number of matchups, and include week/date
    const headerElement = document.querySelector('.upcoming-section .section-title');
    if (headerElement) {
        if (upcomingGames.length === 0) {
            headerElement.innerHTML = '<i class="fas fa-fire"></i> Upcoming Matchups';
        } else {
            // Get week and date from first game (all upcoming games are from the same week)
            const weekNum = upcomingGames[0].week;
            const weekDate = upcomingGames[0].date;

            if (upcomingGames.length === 1) {
                headerElement.innerHTML = `<i class="fas fa-fire"></i> Upcoming Matchup - Week ${weekNum} (${weekDate})`;
            } else {
                headerElement.innerHTML = `<i class="fas fa-fire"></i> Upcoming Matchups - Week ${weekNum} (${weekDate})`;
            }
        }
    }

    if (upcomingGames.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">No upcoming games scheduled</div>';
        return;
    }

    upcomingGames.forEach(game => {
        container.appendChild(createUpcomingMatchupCard(game));
    });
}

/**
 * Render schedule matchups
 */
export function renderSchedule() {
    const container = document.getElementById('matchupsGrid');
    container.innerHTML = '';

    const allGames = getAllGames();
    const scheduleFilter = getScheduleFilter();

    // Filter games based on current filter
    let filteredGames = allGames;
    if (scheduleFilter === 'completed') {
        filteredGames = allGames.filter(game => game.winner);
    } else if (scheduleFilter === 'upcoming') {
        filteredGames = allGames.filter(game => !game.winner);
    }

    // Group games by week
    const gamesByWeek = {};
    filteredGames.forEach(game => {
        if (!gamesByWeek[game.week]) {
            gamesByWeek[game.week] = [];
        }
        gamesByWeek[game.week].push(game);
    });

    // Sort weeks numerically
    const weeks = Object.keys(gamesByWeek).map(Number).sort((a, b) => a - b);

    // Render each week group
    weeks.forEach(week => {
        const weekGroup = document.createElement('div');
        weekGroup.className = 'week-group';

        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-header';
        weekHeader.textContent = `Week ${week}`;
        weekGroup.appendChild(weekHeader);

        const weekGamesContainer = document.createElement('div');
        weekGamesContainer.className = 'week-games';

        gamesByWeek[week].forEach(game => {
            weekGamesContainer.appendChild(createMatchupCard(game));
        });

        weekGroup.appendChild(weekGamesContainer);
        container.appendChild(weekGroup);
    });
}

/**
 * Setup expand/collapse button for schedule
 */
export function setupExpandSchedule() {
    const expandBtn = document.getElementById('expandScheduleBtn');
    const fullScheduleSection = document.getElementById('fullScheduleSection');
    const expandText = document.getElementById('expandScheduleText');

    expandBtn.addEventListener('click', () => {
        const isExpanded = fullScheduleSection.style.display !== 'none';

        if (isExpanded) {
            // Collapse
            fullScheduleSection.style.display = 'none';
            expandText.textContent = 'Show Full Schedule';
            expandBtn.classList.remove('expanded');
        } else {
            // Expand
            fullScheduleSection.style.display = 'block';
            expandText.textContent = 'Hide Full Schedule';
            expandBtn.classList.add('expanded');
        }
    });
}

/**
 * Setup schedule filter buttons
 */
export function setupScheduleFilters() {
    const filterButtons = document.querySelectorAll('.schedule-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update filter and re-render
            const filter = btn.dataset.filter;
            setScheduleFilter(filter);
            renderSchedule();
        });
    });
}
