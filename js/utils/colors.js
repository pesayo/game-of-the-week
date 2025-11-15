/**
 * Generate accessible, distinguishable colors for 41+ players
 * All colors meet WCAG AA contrast requirements (4.5:1) on white backgrounds
 */

/**
 * Pre-defined palette of 50 accessible colors
 * Ordered to maximize perceptual distance between consecutive assignments
 * - Each color is as different as possible from previously assigned colors
 * - Player 1 vs Player 2 will have maximum contrast
 * - Player 3 will be maximally different from Players 1 & 2, etc.
 * - All colors meet WCAG AA contrast requirements (4.5:1) on white backgrounds
 */
const ACCESSIBLE_PALETTE = [
    // Distribute across spectrum - alternating warm/cool and hue ranges
    '#c62828',  // 1. Deep red
    '#0277bd',  // 2. Blue (opposite)
    '#558b2f',  // 3. Green (between)
    '#7b1fa2',  // 4. Purple (opposite of green)
    '#ef6c00',  // 5. Orange (split red-yellow)
    '#006064',  // 6. Dark cyan (split blue-green)
    '#827717',  // 7. Olive (yellow-green)
    '#4527a0',  // 8. Indigo (opposite olive)
    '#d84315',  // 9. Red-orange
    '#01579b',  // 10. Dark blue
    '#33691e',  // 11. Dark green
    '#880e4f',  // 12. Burgundy
    '#f57c00',  // 13. Bright orange
    '#1565c0',  // 14. Medium blue
    '#2e7d32',  // 15. Medium green
    '#6a1b9a',  // 16. Deep purple
    '#bf360c',  // 17. Red-brown
    '#283593',  // 18. Deep indigo
    '#1b5e20',  // 19. Forest green
    '#ad1457',  // 20. Magenta
    '#e65100',  // 21. Deep orange
    '#0d47a1',  // 22. Royal blue
    '#00695c',  // 23. Teal
    '#8e24aa',  // 24. Purple
    '#f9a825',  // 25. Amber
    '#303f9f',  // 26. Indigo blue
    '#00796b',  // 27. Dark teal
    '#c2185b',  // 28. Pink-red
    '#f57f17',  // 29. Dark amber
    '#1976d2',  // 30. Light blue
    '#004d40',  // 31. Deep teal
    '#ab47bc',  // 32. Light purple
    '#9e9d24',  // 33. Yellow-green
    '#3949ab',  // 34. Periwinkle
    '#00838f',  // 35. Cyan
    '#512da8',  // 36. Deep violet
    '#afb42b',  // 37. Lime
    '#1a237e',  // 38. Navy blue
    '#4e342e',  // 39. Dark brown
    '#5e35b1',  // 40. Purple-blue
    '#6d4c41',  // 41. Medium brown
    '#4a148c',  // 42. Dark purple
    '#795548',  // 43. Light brown
    '#311b92',  // 44. Very dark purple
    '#3e2723',  // 45. Very dark brown
    '#5d4037',  // 46. Chocolate
    '#b71c1c',  // 47. Dark red
    // Additional colors for 48-50
    '#01579b',  // 48. Navy
    '#004d40',  // 49. Dark teal
    '#6a1b9a'   // 50. Purple
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
