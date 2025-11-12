// Application state management module
// Centralizes all global state variables with getters and setters

// Main application state object
const state = {
    // Leaderboard data
    leaderboardData: [],

    // Player information map (player name -> {team, position})
    playerInfoMap: {},

    // Active filter settings
    activeFilters: {
        team: '',
        position: '',
        funkEngChallengers: false
    },

    // Current sort configuration
    currentSort: 'rank',
    currentDirection: 'asc',

    // Game data
    matchupsData: {}, // Map of gameKey -> game info
    allGames: [], // Array of all games in order

    // Horse race visualization data
    horseRaceData: [],
    playerColors: {},

    // Pick analysis data
    pickAnalysis: {}, // Stores majority picks and distribution

    // What-if scenario selections
    whatifSelections: {}, // Stores what-if game winner selections

    // Raw data for calculations
    rawPicksData: [], // Store raw picks for what-if calculations

    // Team lineup data
    teamLineups: {}, // Map of team name (skip last name) to team members

    // Schedule filter state
    scheduleFilter: 'all', // Current schedule filter

    // UI state
    isExpanded: false,

    // View state for standings table
    currentView: 'player', // 'player', 'team', or 'position'

    // Selected week for historical standings (null = current/all completed games)
    selectedWeek: null
};

// Getter functions
export function getLeaderboardData() {
    return state.leaderboardData;
}

export function getPlayerInfoMap() {
    return state.playerInfoMap;
}

export function getActiveFilters() {
    return state.activeFilters;
}

export function getCurrentSort() {
    return state.currentSort;
}

export function getCurrentDirection() {
    return state.currentDirection;
}

export function getMatchupsData() {
    return state.matchupsData;
}

export function getAllGames() {
    return state.allGames;
}

export function getHorseRaceData() {
    return state.horseRaceData;
}

export function getPlayerColors() {
    return state.playerColors;
}

export function getPickAnalysis() {
    return state.pickAnalysis;
}

export function getWhatifSelections() {
    return state.whatifSelections;
}

export function getRawPicksData() {
    return state.rawPicksData;
}

export function getTeamLineups() {
    return state.teamLineups;
}

export function getScheduleFilter() {
    return state.scheduleFilter;
}

export function getIsExpanded() {
    return state.isExpanded;
}

export function getCurrentView() {
    return state.currentView;
}

export function getSelectedWeek() {
    return state.selectedWeek;
}

// Setter functions
export function setLeaderboardData(data) {
    state.leaderboardData = data;
}

export function setPlayerInfoMap(map) {
    state.playerInfoMap = map;
}

export function setActiveFilters(filters) {
    state.activeFilters = { ...state.activeFilters, ...filters };
}

export function updateActiveFilter(key, value) {
    state.activeFilters[key] = value;
}

export function setCurrentSort(sort) {
    state.currentSort = sort;
}

export function setCurrentDirection(direction) {
    state.currentDirection = direction;
}

export function setMatchupsData(data) {
    state.matchupsData = data;
}

export function setAllGames(games) {
    state.allGames = games;
}

export function setHorseRaceData(data) {
    state.horseRaceData = data;
}

export function setPlayerColors(colors) {
    state.playerColors = colors;
}

export function setPickAnalysis(analysis) {
    state.pickAnalysis = analysis;
}

export function setWhatifSelections(selections) {
    state.whatifSelections = selections;
}

export function updateWhatifSelection(gameKey, team) {
    state.whatifSelections[gameKey] = team;
}

export function removeWhatifSelection(gameKey) {
    delete state.whatifSelections[gameKey];
}

export function clearWhatifSelections() {
    state.whatifSelections = {};
}

export function setRawPicksData(data) {
    state.rawPicksData = data;
}

export function setTeamLineups(lineups) {
    state.teamLineups = lineups;
}

export function setScheduleFilter(filter) {
    state.scheduleFilter = filter;
}

export function setIsExpanded(expanded) {
    state.isExpanded = expanded;
}

export function setCurrentView(view) {
    state.currentView = view;
}

export function setSelectedWeek(week) {
    state.selectedWeek = week;
}

// Utility function to get entire state (for debugging)
export function getState() {
    return state;
}

// Utility function to reset state (for testing)
export function resetState() {
    state.leaderboardData = [];
    state.playerInfoMap = {};
    state.activeFilters = {
        team: '',
        position: '',
        funkEngChallengers: false
    };
    state.currentSort = 'rank';
    state.currentDirection = 'asc';
    state.matchupsData = {};
    state.allGames = [];
    state.horseRaceData = [];
    state.playerColors = {};
    state.pickAnalysis = {};
    state.whatifSelections = {};
    state.rawPicksData = [];
    state.teamLineups = {};
    state.scheduleFilter = 'all';
    state.isExpanded = false;
    state.currentView = 'player';
    state.selectedWeek = null;
}
