# Setup Guide - Game of the Week Dashboard

## Quick Start

The application has been refactored into a modular architecture. Here's how to run it:

### Option 1: Using Python HTTP Server (Recommended)

```bash
# Navigate to project directory
cd /path/to/game-of-the-week

# Start a simple HTTP server (Python 3)
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser to: `http://localhost:8000`

### Option 2: Using Node.js HTTP Server

```bash
# Install http-server globally (one time)
npm install -g http-server

# Start server
http-server -p 8000
```

Then open your browser to: `http://localhost:8000`

### Option 3: Using VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Why a Web Server?

The application uses **ES6 modules** which require:
- HTTP/HTTPS protocol (not `file://`)
- Proper CORS headers

Opening `index.html` directly in a browser will result in CORS errors.

## File Structure

```
game-of-the-week/
├── index.html          # New modular entry point (USE THIS)
├── leaderboard.html    # [DEPRECATED] Old monolithic file
├── css/                # Modular stylesheets
├── js/                 # Modular JavaScript (ES6 modules)
├── assets/             # Images and static assets
└── mcc_integration/    # MCC API integration scripts
```

## Browser Requirements

Modern browser with ES6 module support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Development

### Making Changes

1. **CSS Changes**: Edit files in `css/` or `css/components/`
2. **JavaScript Changes**: Edit modules in `js/` subdirectories
3. **New Components**:
   - Create CSS file in `css/components/`
   - Create JS module in `js/components/`
   - Import in `js/main.js`
   - Add CSS link in `index.html`

### Debugging

Open browser DevTools (F12):
- **Console**: Check for JavaScript errors
- **Network**: Verify all files load (200 status)
- **Sources**: Debug JavaScript with breakpoints

### Common Issues

**Issue**: CORS error in console
**Solution**: Use a web server (see Quick Start)

**Issue**: "Failed to load module script"
**Solution**: Ensure `.js` extension in all imports

**Issue**: Blank page
**Solution**: Check console for errors, verify data URLs in `js/config/constants.js`

## Testing

1. Start web server
2. Open `http://localhost:8000` in browser
3. Verify dashboard loads
4. Test interactions:
   - Sort leaderboard columns
   - Filter by team/position
   - Expand game history
   - View horse race chart
   - Use what-if analysis
   - View picks matrix

## Deployment

For production deployment:

1. **Static Hosting**: Upload all files to web host
   - GitHub Pages
   - Netlify
   - Vercel
   - AWS S3 + CloudFront

2. **Build Process** (optional but recommended):
   - Add bundler (Vite, Webpack, Rollup)
   - Minify CSS/JavaScript
   - Optimize images
   - Generate source maps

## Maintenance

### Regular Updates

- Update Google Sheets data sources
- Review and update `team_cards.json`
- Check for deprecated browser APIs

### Code Quality

- Keep components focused and small
- Document complex functions
- Use consistent naming conventions
- Test across browsers

## Migration from Old Version

The old `leaderboard.html` is preserved for reference but should no longer be used. All functionality has been moved to the modular architecture with **identical behavior**.

To compare:
- Old: `leaderboard.html` (4,763 lines, monolithic)
- New: `index.html` + modular files (maintainable)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify web server is running
3. Review `ARCHITECTURE.md` for technical details
4. Check Google Sheets data is accessible
