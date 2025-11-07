// Sanitize player name for use in CSS selectors
export function sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-');
}
