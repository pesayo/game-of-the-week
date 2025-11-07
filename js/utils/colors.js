// Generate consistent colors for players using a color scale
export function generatePlayerColors(playerNames) {
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemePastel1));
    const colors = {};
    playerNames.forEach((name, i) => {
        colors[name] = colorScale(i);
    });
    return colors;
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
