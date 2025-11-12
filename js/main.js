/**
 * Main application entry point
 * Orchestrates data fetching, processing, and component initialization
 */

// Import data layer
import { fetchAllData } from './data/data-fetcher.js';
import { analyzePickDistribution, processData } from './data/data-processor.js';

// Import state management
import {
    setLeaderboardData,
    setPlayerInfoMap,
    setMatchupsData,
    setAllGames,
    setPickAnalysis,
    setHorseRaceData,
    setPlayerColors,
    setRawPicksData
} from './state/app-state.js';

// Import utilities
import { parsePlayerInfo, parseMatchups } from './utils/parsers.js';
import { generatePlayerColors } from './utils/colors.js';

// Import components
import {
    renderStatsSummary,
    renderLeaderboard,
    setupHeaderSort,
    setupExpandCollapse,
    populateFilters,
    setupFilterControls,
    setupFilterToggle,
    setupViewToggle,
    populateWeekSelector,
    setupWeekSelector
} from './components/Leaderboard.js';

import {
    renderHorseRace,
    setupRaceControls
} from './components/HorseRace.js';

import {
    renderUpcomingMatchups,
    renderSchedule,
    setupScheduleFilters,
    setupExpandSchedule,
    loadTeamLineups
} from './components/Matchups.js';

import {
    renderWhatIfPanel,
    setupWhatIfControls,
    updateProjectedStandings
} from './components/WhatIf.js';

import {
    setupCombinedPicksView
} from './components/PicksMatrix.js';

import {
    setupModalHandlers
} from './components/Modals.js';

import {
    renderStreakTracker
} from './components/StreakTracker.js';

/**
 * Initialize the application
 */
async function init() {
    try {
        // Show loading state
        const loadingMessage = document.getElementById('loadingMessage');
        const errorMessage = document.getElementById('errorMessage');
        const dashboardGrid = document.getElementById('dashboardGrid');

        if (loadingMessage) loadingMessage.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none';
        if (dashboardGrid) dashboardGrid.style.display = 'none';

        // Fetch all data
        const { matchups, picks, playerInfo } = await fetchAllData();

        // Store raw picks for what-if calculations
        setRawPicksData(picks);

        // Parse player info CSV
        const { playerMap, teams, positions } = parsePlayerInfo(playerInfo);
        setPlayerInfoMap(playerMap);

        // Parse matchups CSV
        const { gameMap, gamesArray } = parseMatchups(matchups);
        setMatchupsData(gameMap);
        setAllGames(gamesArray);

        // Analyze pick distribution to identify chalk/contrarian picks
        const pickAnalysis = analyzePickDistribution(picks, gameMap);
        setPickAnalysis(pickAnalysis);

        // Process picks data to create leaderboard
        const leaderboardData = processData(picks, gameMap, gamesArray, pickAnalysis);
        setLeaderboardData(leaderboardData);
        setHorseRaceData(leaderboardData); // Same data for horse race

        // Generate consistent colors for all players
        const playerColors = generatePlayerColors(leaderboardData.map(p => p.name));
        setPlayerColors(playerColors);

        // Hide loading, show dashboard
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (dashboardGrid) dashboardGrid.style.display = 'grid';

        // Populate and setup filters
        populateFilters(teams, positions);
        setupFilterControls();
        setupFilterToggle();
        setupViewToggle();

        // Setup week selector for historical standings
        populateWeekSelector();
        setupWeekSelector();

        // Render everything
        renderHorseRace(leaderboardData);
        renderStatsSummary(leaderboardData);
        renderLeaderboard(leaderboardData);
        renderStreakTracker(leaderboardData);
        setupHeaderSort();
        setupExpandCollapse();
        setupRaceControls();

        // Setup what-if analysis
        renderWhatIfPanel();
        setupWhatIfControls();
        updateProjectedStandings();

        // Setup combined picks view controls
        setupCombinedPicksView();

        // Setup modal handlers
        setupModalHandlers();

        // Load team lineups and setup schedule
        try {
            await loadTeamLineups();
            renderUpcomingMatchups();
            renderSchedule();
            setupScheduleFilters();
            setupExpandSchedule();
        } catch (err) {
            console.error('Error in loadTeamLineups:', err);
        }

    } catch (error) {
        console.error('Error initializing application:', error);

        const loadingMessage = document.getElementById('loadingMessage');
        const errorMessage = document.getElementById('errorMessage');

        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) {
            errorMessage.textContent = `Error loading leaderboard data: ${error.message}`;
            errorMessage.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
