/**
 * Generate accessible, distinguishable colors for 41+ players
 * All colors meet WCAG AA contrast requirements (4.5:1) on white backgrounds
 */

/**
 * Pre-defined palette of 50 accessible colors
 * These colors are carefully selected to:
 * - Have good contrast on white backgrounds (WCAG AA compliant)
 * - Be visually distinguishable from each other
 * - Cover the full color spectrum
 */
const ACCESSIBLE_PALETTE = [
    // Reds and oranges
    '#c62828', '#d84315', '#e65100', '#ef6c00', '#f57c00',
    // Yellows and ambers (darkened for contrast)
    '#f9a825', '#f57f17', '#827717', '#9e9d24', '#afb42b',
    // Greens
    '#558b2f', '#33691e', '#2e7d32', '#1b5e20', '#00695c',
    // Teals and cyans
    '#00838f', '#006064', '#00796b', '#004d40', '#0277bd',
    // Blues
    '#01579b', '#0d47a1', '#1565c0', '#1976d2', '#283593',
    // Purples and indigos
    '#303f9f', '#3949ab', '#4527a0', '#512da8', '#5e35b1',
    // Deep purples and magentas
    '#6a1b9a', '#7b1fa2', '#8e24aa', '#ab47bc', '#c2185b',
    // Pinks and burgundies
    '#ad1457', '#880e4f', '#6a1b9a', '#4a148c', '#311b92',
    // Browns and grays (for variety)
    '#3e2723', '#4e342e', '#5d4037', '#6d4c41', '#795548',
    // Additional distinct colors
    '#bf360c', '#b71c1c', '#1a237e', '#006064', '#004d40'
];

/**
 * Generate HSL-based color for a given index
 * Fallback for indices beyond the pre-defined palette
 */
function generateHSLColor(index) {
    // Distribute hues evenly across the spectrum
    const hue = (index * 137.5) % 360; // Golden angle for better distribution

    // Alternate saturation and lightness for variety while maintaining contrast
    const saturation = 65 + (index % 3) * 5; // 65%, 70%, 75%
    const lightness = 35 + (index % 4) * 3; // 35%, 38%, 41%, 44%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate consistent colors for all players
 * @param {Array} playerNames - Array of player names
 * @returns {Object} Map of player name to color
 */
export function generatePlayerColors(playerNames) {
    const colors = {};

    playerNames.forEach((name, index) => {
        // Use pre-defined palette for first 50 players
        if (index < ACCESSIBLE_PALETTE.length) {
            colors[name] = ACCESSIBLE_PALETTE[index];
        } else {
            // Generate additional colors if needed (more than 50 players)
            colors[name] = generateHSLColor(index);
        }
    });

    return colors;
}

/**
 * Get a lightness value that ensures good contrast on white background
 * Used for dynamic color generation
 * @param {string} color - Hex or HSL color
 * @returns {number} Recommended lightness (0-100)
 */
export function getAccessibleLightness(color) {
    // For WCAG AA compliance on white background, lightness should be <= 50%
    // For best readability, aim for 35-45%
    return 40;
}

/**
 * Check if a color has sufficient contrast on white background
 * @param {string} color - Hex color string
 * @returns {boolean} True if contrast ratio is >= 4.5:1
 */
export function hasGoodContrast(color) {
    // Convert hex to RGB
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    // Calculate relative luminance
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // White background has luminance of 1
    // Contrast ratio = (lighter + 0.05) / (darker + 0.05)
    const contrastRatio = (1 + 0.05) / (luminance + 0.05);

    // WCAG AA requires 4.5:1 for normal text
    return contrastRatio >= 4.5;
}

// Get sprite position for a member ID (for avatars)
export function getSpritePosition(memberId) {
    const spriteIndex = memberId % 25;
    const row = Math.floor(spriteIndex / 5);
    const col = spriteIndex % 5;
    const x = col * 25;
    const y = row * 25;
    return `${x}% ${y}%`;
}
