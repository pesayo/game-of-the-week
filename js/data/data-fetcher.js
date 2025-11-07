// Data fetching module for loading CSV data from Google Sheets
// Uses d3.csv for parsing CSV data into JSON format

import { matchupsUrl, picksUrl, playerInfoUrl } from '../config/constants.js';

/**
 * Fetches all required data from Google Sheets CSV exports
 * @returns {Promise<Object>} Promise that resolves with matchups, picks, and playerInfo data
 */
export async function fetchAllData() {
    try {
        // Fetch all three CSV files in parallel using d3.csv
        const [matchups, picks, playerInfo] = await Promise.all([
            d3.csv(matchupsUrl),
            d3.csv(picksUrl),
            d3.csv(playerInfoUrl)
        ]);

        return {
            matchups,
            picks,
            playerInfo
        };
    } catch (error) {
        console.error("Error fetching or parsing CSV:", error);
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
}
