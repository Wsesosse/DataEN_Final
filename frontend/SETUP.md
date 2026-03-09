# Frontend Setup Guide

## 🎯 Overview
This guide will help you get the GDP Growth ML Predictor Dashboard up and running locally.

## ✅ Prerequisites
- Web Browser (Chrome, Firefox, Safari, or Edge)
- Text Editor (VS Code recommended)
- Optional: Python 3.x or Node.js for local server

## 📋 Step-by-Step Setup

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Choose Your Server Method

#### Method A: Using Python (Recommended)
```bash
# Python 3
python -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```
Then visit: `http://localhost:8000`

#### Method B: Using VS Code Live Server
1. Install "Live Server" extension (by Ritwick Dey)
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Browser will open automatically at `http://127.0.0.1:5500`

#### Method C: Using Node.js http-server
```bash
# Install globally (one-time)
npm install -g http-server

# Run server
http-server -p 8000

# Visit: http://localhost:8000
```

#### Method D: Direct Browser Open
Simply open `index.html` in your browser:
- Windows: Double-click `index.html`
- Mac: Right-click → Open With → Browser
- Linux: xdg-open index.html

### Step 3: Verify Installation
Open your browser and visit one of these URLs:
- `http://localhost:8000` (Python method)
- `http://127.0.0.1:5500` (Live Server)
- Local file path (Direct open)

You should see the GDP Growth Predictor home page.

## 🔧 Configuration

### Backend API (required for real analytics)
Run the Flask app in `backend/app.py` to serve analytics statistics. Make sure your Postgres instance is running and reachable using the credentials in `backend/test_ml_logic.py` (or override via env vars).

```bash
python -m pip install -r requirements.txt
python backend/app.py
```

The frontend will call `http://localhost:5000/api/analytics` automatically when loading the analytics page.

Additionally the dashboard page now fetches a list of countries and their latest GDP from `http://localhost:5000/api/gdp_countries`. Ensure your backend implements this endpoint (see `backend/app.py`).


### Connect to Backend
1. Open `script.js`
2. Find the line: `const API_URL = 'http://localhost:5000/api';`
3. Update with your backend URL

Or use the global config:
```javascript
// In browser console
window.gdpConfig.setApiUrl('http://your-backend-url/api');
```

### Custom Settings
Edit `config.js` to customize:
- API endpoints
- UI theme
- Auto-refresh interval
- Feature toggles
- Debug settings

## 📂 File Structure

```
frontend/
├── index.html           # Home page
├── dashboard.html       # Dashboard page
├── predict.html         # Prediction form page
├── styles.css           # Global styles
├── script.js            # Main JavaScript
├── config.js            # Configuration
├── package.json         # NPM metadata
├── README.md            # Frontend documentation
├── SETUP.md             # This file
└── .gitignore          # Git ignore rules
```

## 🎨 Customization

### Change Colors
Edit `styles.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #10b981;
}
```

### Update Title
In HTML files, change the `<title>` tag:
```html
<title>Your App Name - Dashboard</title>
```

### Add Logo
Replace branding in `index.html`:
```html
<a class="navbar-brand" href="index.html">
    <img src="your-logo.png" alt="Logo"> Your Brand
</a>
```

## 🔗 API Integration

### Connecting to Backend
When your backend is ready:

1. **Update config.js:**
```javascript
CONFIG.FEATURES.enableAPIIntegration = true;
CONFIG.API_URL = 'http://your-backend-url:5000/api';
```

2. **Implement backend endpoints:**
   - `GET /api/stats` - Dashboard statistics
   - `GET /api/pipeline/runs` - Recent pipeline runs
   - `POST /api/predict` - Make predictions
   - `GET /api/predictions` - Get prediction history

3. **Enable API calls in script.js:**
```javascript
// Uncomment the API integration section
// Update callBackendAPI() function
```

## 🧪 Testing

### Test Without Backend
All features work with mock data. Use the dashboard and prediction form to test UI/UX.

### Test With Backend
1. Start your backend server
2. Update API_URL in config.js
3. Enable API integration
4. Check browser console for API errors

## 🚀 Deployment

### GitHub Pages
```bash
git add frontend/
git commit -m "Add frontend"
git push
# Enable GitHub Pages in repository settings
```

### Netlify
```bash
# Drag and drop frontend folder to Netlify dashboard
# Or use Netlify CLI:
npm install -g netlify-cli
netlify deploy --dir=frontend
```

### Docker (with Nginx)
```dockerfile
FROM nginx:alpine
COPY frontend/ /usr/share/nginx/html/
EXPOSE 80
```

## 🐛 Troubleshooting

### Pages not loading?
- Check browser console (F12) for errors
- Verify all CSS/JS files are loaded
- Try hard refresh (Ctrl+Shift+F5)

### Charts not showing?
- Ensure Chart.js CDN is accessible
- Check canvas elements exist in HTML
- Look for console errors

### API calls failing?
- Verify backend URL is correct
- Check CORS settings on backend
- Confirm backend is running
- Check Network tab in DevTools

### Port already in use?
```bash
# Python: Use different port
python -m http.server 8001

# http-server: Use different port
http-server -p 8001
```

## 📱 Browser Support

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

## 🔒 Security Notes

### For Development (Local Only)
```javascript
// File is served locally, no security issues
```

### For Production
1. Enable HTTPS
2. Set CORS properly on backend
3. Add CSP headers
4. Use environment variables for API URLs
5. Implement authentication

## 📞 Need Help?

1. Check the [Frontend README](./README.md)
2. Review browser console errors (F12)
3. Check backend logs
4. Verify API endpoints are correct

## ✨ Features Overview

### Dashboard
- Real-time pipeline status
- Model performance metrics
- Feature importance charts
- Recent pipeline runs

### Predictions
- Input economic indicators
- Get GDP growth predictions
- View confidence scores
- Track prediction history

### Analytics
- Growth trends over time
- Model metrics visualization
- Performance radar charts
- Historical comparisons

## 🎓 Learning Resources

- [Bootstrap 5](https://getbootstrap.com/docs/5.0/)
- [Chart.js](https://www.chartjs.org/docs/latest/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Last Updated:** March 5, 2026
**Status:** Ready for Production
