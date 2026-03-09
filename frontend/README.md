# Frontend - GDP Growth ML Predictor

A modern, responsive web dashboard for the GDP Growth ML Prediction system built with Airflow.

## 🎯 Features

- **📊 Dashboard** - Real-time monitoring of ML pipeline and predictions
- **🔮 Prediction Form** - Input economic indicators and get GDP growth predictions
- **📈 Analytics** - View model performance and feature importance
- **🎨 Modern UI** - Bootstrap 5 with custom styling
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **⚡ Interactive Charts** - Chart.js for data visualization

## 📁 Project Structure

```
frontend/
├── index.html          # Home page
├── dashboard.html      # Dashboard with charts and stats
├── predict.html        # Prediction form page
├── styles.css          # Global CSS styles
├── script.js           # JavaScript functionality
├── README.md          # This file
└── config.js          # API configuration (optional)
```

## 🚀 Quick Start

### Option 1: Open directly in browser
```bash
# Simply open index.html in your web browser
# Or use a local server (recommended)

cd frontend
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Option 2: Using Live Server (VS Code)
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 3: Using Node.js HTTP Server
```bash
# Install http-server globally
npm install -g http-server

# Run the server in the frontend directory
cd frontend
http-server -p 8000

# Visit: http://localhost:8000
```

### Starting the Backend API (for real analytics)
The analytics page pulls statistics from the PostgreSQL database via a small Flask service located in `backend/app.py`. To start it:

```bash
# from workspace root
python -m pip install -r requirements.txt  # ensure dependencies
python backend/app.py
```

By default the service listens on `http://localhost:5000`. The frontend is configured to query `${API_URL}/analytics` (see `config.js` or `script.js`).

## 🔌 API Integration

The dashboard can integrate with a Python backend. To connect to your backend:

1. Update the `API_URL` in `script.js`:
```javascript
const API_URL = 'http://localhost:5000/api'; // Your backend URL
```

2. Make sure your backend provides the following endpoints (see `backend/app.py` for examples):

### Required Endpoints

#### GET `/api/stats`
Returns dashboard statistics
```json
{
  "pipeline_status": "running",
  "model_accuracy": 87.5,
  "total_predictions": 234,
  "data_points": 5000
}
```

#### GET `/api/gdp_countries`
Returns a list of the most recent GDP value for each country, used by the dashboard's GDP-by-country table.
```json
[
  { "country": "USA", "gdp": 21427700.0 },
  { "country": "CHN", "gdp": 14342903.0 },
  ...
]
```

#### GET `/api/correlation`
Returns correlation statistics broken down by year.  The frontend charts correlation trends; the backend recomputes these at most once per week and caches results so the endpoint is lightweight even if polled more often.  On the analytics page there is a small **รีเฟรช** button you can click to force an immediate update if you have refreshed the underlying database.
```json
[
  { "year": 2015, "corr_inflation": 0.32, "corr_unemployment": -0.12, "corr_trade": 0.05 },
  { "year": 2016, "corr_inflation": 0.28, "corr_unemployment": -0.10, "corr_trade": 0.07 },
  ...
]
```

#### POST `/api/predict`
Accepts prediction input and returns GDP growth forecast
```json
{
  "gdp_base": 500,
  "inflation": 2.5,
  "unemployment": 4.2,
  "interest_rate": 3.5,
  "exports": 150,
  "imports": 140,
  "investment": 200,
  "consumption": 350
}
```

Response:
```json
{
  "prediction": 2.85,
  "confidence": 88.5,
  "model": "RandomForestRegressor",
  "metrics": {
    "mae": 0.35,
    "r2_score": 0.92
  }
}
```

2. Implement the following endpoints in your backend:

### Required Endpoints

#### GET `/api/stats`
Returns dashboard statistics
```json
{
  "pipeline_status": "running",
  "model_accuracy": 87.5,
  "total_predictions": 234,
  "data_points": 5000
}
```

#### POST `/api/predict`
Accepts prediction input and returns GDP growth forecast
```json
{
  "gdp_base": 500,
  "inflation": 2.5,
  "unemployment": 4.2,
  "interest_rate": 3.5,
  "exports": 150,
  "imports": 140,
  "investment": 200,
  "consumption": 350
}
```

Response:
```json
{
  "prediction": 2.85,
  "confidence": 88.5,
  "model": "RandomForestRegressor",
  "metrics": {
    "mae": 0.35,
    "r2_score": 0.92
  }
}
```

#### GET `/api/pipeline/runs`
Returns recent pipeline runs
```json
[
  {
    "dag_id": "gdp_growth_ml_predictor",
    "run_id": "manual__2026-03-05T09_16_19+00_00",
    "status": "success",
    "start_date": "2026-03-05T09:16:19",
    "end_date": "2026-03-05T09:18:53"
  }
]
```

## 🎨 Customization

### Change Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #10b981;
    /* ... more variables ... */
}
```

### Update Navigation
Edit the navbar in HTML files:
```html
<ul class="navbar-nav ms-auto">
    <li class="nav-item">
        <a class="nav-link" href="your-page.html">Your Link</a>
    </li>
</ul>
```

### Add New Pages
1. Create a new HTML file (e.g., `analytics.html`)
2. Copy the navigation and footer from existing pages
3. Add the page to navigation links
4. Create corresponding JavaScript functions in `script.js`

## 📊 Data Visualization

The dashboard uses **Chart.js** v4.4.0 for charts. Supported chart types:

- Line charts (predictions over time)
- Radar charts (model performance)
- Bar charts (feature importance)
- Horizontal bar charts (statistics)

## 🔒 Security Considerations

For production deployment:

1. **Environment Variables** - Store sensitive URLs in environment files
2. **CORS** - Configure CORS on backend to allow frontend origin
3. **Authentication** - Implement JWT or session-based auth
4. **Input Validation** - Always validate user input
5. **HTTPS** - Use HTTPS in production
6. **CSP Headers** - Set Content Security Policy headers

Example CORS setup for Flask backend:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app, origins=["https://yourdomain.com"])
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🛠️ Troubleshooting

### Charts not displaying?
- Ensure Chart.js is loaded from CDN
- Check browser console for errors
- Verify canvas element IDs match in JavaScript

### API calls failing?
- Check backend is running
- Verify API_URL in script.js is correct
- Check CORS configuration on backend
- Look at browser Network tab for request details

### Styling issues?
- Clear browser cache (Ctrl+Shift+Del)
- Check styles.css is loaded
- Verify Bootstrap CDN link is working

## 🚀 Deployment

### Deploy to GitHub Pages
```bash
# Update your GitHub Pages settings
# Deploy the frontend folder contents

git add frontend/
git commit -m "Deploy frontend"
git push origin main
```

### Deploy to Netlify
```bash
# Drag and drop frontend folder to Netlify
# Or use Netlify CLI:

npm install -g netlify-cli
netlify deploy --dir=frontend
```

### Deploy with Docker
```dockerfile
FROM nginx:alpine
COPY frontend/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📚 Resources

- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Apache Airflow](https://airflow.apache.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)

## 📝 License

This project is part of the DataEN GDP Growth ML Predictor system.

## 👤 Author

Created for the GDP Growth ML Prediction with Airflow Project

---

**Last Updated:** March 5, 2026  
**Version:** 1.0.0
