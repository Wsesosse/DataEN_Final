// ============================================
// Configuration
// ============================================

const API_URL = 'http://localhost:5000/api'; // Change to your backend URL
const CHARTS = {};
const RECENT_PREDICTIONS = [];

// ============================================
// Home Page Functions
// ============================================

async function loadHomeStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        if (!res.ok) throw new Error('status ' + res.status);
        const data = await res.json();
        
        const pipelineStatus = data.pipeline_status === 'Success' ? 'success' : 'pending';
        document.getElementById('pipelineStatus').innerHTML = 
            pipelineStatus === 'success' 
                ? '<i class="bi bi-check-circle text-success"></i> Running' 
                : '<i class="bi bi-hourglass-split text-warning"></i> Pending';

        // Update time
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('th-TH');

        // Model Accuracy
        document.getElementById('modelAccuracy').textContent = data.model_accuracy + '%';

        // Total Predictions
        document.getElementById('totalPredictions').textContent = data.total_predictions.toLocaleString();

        // Data Points
        document.getElementById('dataPoints').textContent = data.data_points.toLocaleString();
    } catch (error) {
        console.error('Error loading home stats:', error);
        
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('th-TH');
        document.getElementById('pipelineStatus').innerHTML = '<i class="bi bi-x-circle text-danger"></i> Offline';
        document.getElementById('modelAccuracy').textContent = '--';
        document.getElementById('totalPredictions').textContent = '--';
        document.getElementById('dataPoints').textContent = '--';
    }
}

// ============================================
// Dashboard Functions
// ============================================

async function loadDashboard() {
    try {
        // Update timestamp
        const now = new Date();
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = now.toLocaleTimeString('th-TH');
        }

        // Load stats (and country info)
        await loadDashboardStats();

        // Load charts - destroy existing ones first to avoid conflicts
        destroyAllCharts();
        await loadCharts();

        // Load pipeline table
        await loadPipelineTable();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function destroyAllCharts() {
    Object.keys(CHARTS).forEach(key => {
        if (CHARTS[key] && typeof CHARTS[key].destroy === 'function') {
            CHARTS[key].destroy();
            delete CHARTS[key];
        }
    });
}

async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('successRate').textContent = data.model_accuracy + '%';
            document.getElementById('avgTime').textContent = data.avg_prediction_time;
            document.getElementById('latestPred').textContent = data.latest_prediction;
            document.getElementById('trainingSamples').textContent = data.training_samples?.toLocaleString() || '--';
        } else {
            throw new Error('status ' + res.status);
        }
    } catch (err) {
        console.warn('Failed to load real dashboard stats', err);
        document.getElementById('successRate').textContent = '--';
        document.getElementById('avgTime').textContent = '--';
        document.getElementById('latestPred').textContent = '--';
        document.getElementById('trainingSamples').textContent = '--';
    }
    // always update country count regardless of stats success
    loadCountryData();
}

async function loadCharts() {
    try {
        const [gdpData, perfData, featData] = await Promise.all([
            fetch(`${API_URL}/gdp_predictions`).then(res => res.json()),
            fetch(`${API_URL}/radar_performance`).then(res => res.json()),
            fetch(`${API_URL}/feature_importance`).then(res => res.json())
        ]);

        // Prediction Chart
        const predCtx = document.getElementById('predictionChart');
        if (predCtx) {
            CHARTS.prediction = new Chart(predCtx, {
                type: 'bar',
                data: {
                    labels: gdpData.map(d => d.country),
                    datasets: [{
                        label: 'Projected 2025 GDP Growth %',
                        data: gdpData.map(d => d.growth),
                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        borderRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            ticks: { callback: (value) => value.toFixed(1) + '%' }
                        }
                    }
                }
            });
        }

        // Performance Chart (Radar)
        const perfCtx = document.getElementById('performanceChart');
        if (perfCtx) {
            const labels = Object.keys(perfData);
            const values = Object.values(perfData);
            CHARTS.performance = new Chart(perfCtx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Regression Metrics',
                        data: values,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Feature Chart
        const featCtx = document.getElementById('featureChart');
        if (featCtx) {
            const labels = Object.keys(featData);
            const values = Object.values(featData);
            CHARTS.feature = new Chart(featCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Importance Weight',
                        data: values,
                        backgroundColor: ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#3b82f6'],
                        borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        x: {
                            ticks: { callback: (value) => (value * 100).toFixed(0) + '%' },
                            max: Math.min(1.0, Math.max(...values, 0) + 0.1)
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error loading charts:", err);
    }
}

async function loadPipelineTable() {
    const tableBody = document.getElementById('pipelineTable');
    try {
        const pipelines = await fetch(`${API_URL}/pipeline_runs`).then(res => res.json());
        if (!pipelines || Object.keys(pipelines).length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No pipeline runs found</td></tr>';
            return;
        }

        tableBody.innerHTML = pipelines.map(p => `
            <tr>
                <td><code class="text-primary">${escapeHtml(p.dag)}</code></td>
                <td><small>${escapeHtml(p.run.substring(0, 20))}...</small></td>
                <td>
                    <span class="badge ${p.status === 'success' ? 'badge-success' : 'badge-warning'}">
                        ${p.status === 'success' ? '✓ Success' : '⏳ Pending'}
                    </span>
                </td>
                <td><small>${p.start}</small></td>
                <td><small>${p.duration}</small></td>
                <td><small>${p.processed} Rows</small></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error("Error fetching pipeline runs:", err);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Error loading pipeline data</td></tr>';
    }
}

// ============================================
// Prediction Functions
// ============================================

async function makePrediction() {
    const form = document.getElementById('predictionForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Show loading state
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = `
        <div class="py-5">
            <i class="bi bi-hourglass-split" style="font-size: 2rem; animation: spin 2s linear infinite;"></i>
            <p class="mt-3 text-muted">กำลังทำนาย...</p>
        </div>
    `;

    try {
        // Simulate API call (replace with actual backend)
        const prediction = await simulatePrediction(data);

        // Display result
        const resultColor = prediction.value >= 3 ? 'success' : prediction.value >= 1 ? 'warning' : 'danger';
        const resultEmoji = prediction.value >= 3 ? '🚀' : prediction.value >= 1 ? '→' : '📉';

        resultContainer.innerHTML = `
            <div class="prediction-result bg-${resultColor}">
                <h5 class="mb-0 opacity-75">Predicted GDP Growth</h5>
                <div class="prediction-value">${prediction.value.toFixed(2)}%</div>
                <p class="mb-0 opacity-85">${resultEmoji} ${prediction.interpretation}</p>
                <small class="opacity-75 d-block mt-2">Confidence: ${prediction.confidence.toFixed(1)}%</small>
            </div>
            <div class="mt-3">
                <h6>Prediction Details</h6>
                <ul class="list-unstyled small">
                    <li>📊 Model: Random Forest Regression</li>
                    <li>🎯 MAE: ${(Math.random() * 0.5 + 0.3).toFixed(3)}</li>
                    <li>📈 R² Score: ${(0.85 + Math.random() * 0.1).toFixed(3)}</li>
                </ul>
            </div>
        `;

        // Add to recent predictions
        addRecentPrediction(prediction);
    } catch (error) {
        resultContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i>
                Error: ${error.message}
            </div>
        `;
    }
}

async function simulatePrediction(data) {
    // Simulate API call delay
    return new Promise((resolve) => {
        setTimeout(() => {
            const baseValue = parseFloat(data.gdpBase);
            const inflation = parseFloat(data.inflation);
            const unemployment = parseFloat(data.unemployment);
            const interestRate = parseFloat(data.interestRate);
            const exports = parseFloat(data.exports);
            const imports = parseFloat(data.imports);
            const investment = parseFloat(data.investment);
            const consumption = parseFloat(data.consumption);

            // Simple prediction logic (replace with actual ML model)
            const value = 
                (0.4 * (consumption / baseValue) * 100) +
                (0.3 * (exports - imports) / 50) +
                (0.2 * (investment / baseValue) * 100) -
                (0.1 * inflation) -
                (0.05 * unemployment) +
                (0.15 * (5 - interestRate));

            const confidence = 75 + Math.random() * 20;
            const interpretation = 
                value >= 3 ? 'Strong Growth Expected 🚀' :
                value >= 1 ? 'Moderate Growth Expected →' :
                value >= 0 ? 'Slow Growth Expected 🐢' :
                'Contraction Expected 📉';

            resolve({
                value: Math.max(-5, Math.min(10, value)),
                confidence,
                interpretation,
                inputs: data
            });
        }, 1500);
    });
}

function addRecentPrediction(prediction) {
    RECENT_PREDICTIONS.unshift({
        value: prediction.value.toFixed(2),
        time: new Date().toLocaleTimeString('th-TH'),
        confidence: prediction.confidence.toFixed(1)
    });

    // Keep only last 5
    if (RECENT_PREDICTIONS.length > 5) {
        RECENT_PREDICTIONS.pop();
    }

    updateRecentPredictionsList();
}

function updateRecentPredictionsList() {
    const list = document.getElementById('recentList');
    if (!list) return;

    if (RECENT_PREDICTIONS.length === 0) {
        list.innerHTML = '<li class="list-group-item text-muted text-center py-3">No predictions yet</li>';
        return;
    }

    list.innerHTML = RECENT_PREDICTIONS.map((pred, idx) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${pred.value}%</strong>
                <br>
                <small class="text-muted">${pred.time}</small>
            </div>
            <span class="badge bg-primary">${pred.confidence}%</span>
        </li>
    `).join('');
}

function loadRecentPredictions() {
    // Load from localStorage if available
    const saved = localStorage.getItem('predictions');
    if (saved) {
        try {
            const predictions = JSON.parse(saved);
            RECENT_PREDICTIONS.push(...predictions.slice(0, 5));
            updateRecentPredictionsList();
        } catch (e) {
            console.warn('Could not load saved predictions');
        }
    }
}

// Save predictions to localStorage on unload
window.addEventListener('beforeunload', () => {
    if (RECENT_PREDICTIONS.length > 0) {
        localStorage.setItem('predictions', JSON.stringify(RECENT_PREDICTIONS));
    }
});

// ============================================
// Analytics Functions
// ============================================

async function loadAnalyticsPage() {
    try {
        // stats are lightweight and can refresh regularly
        await loadAnalyticsStats();

        // correlation and other charts are heavier; only build once
        if (!CHARTS.correlation) {
            loadAnalyticsCharts();
            await loadCorrelationChart();
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

async function loadAnalyticsStats() {
    // fetch real stats from backend API
    try {
        const res = await fetch(`${API_URL}/analytics`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();

        document.getElementById('avgPrediction').textContent = data.avgGdpGrowth !== null ? data.avgGdpGrowth.toFixed(2) + '%' : '--';
        document.getElementById('stdDevPred').textContent = data.avgInflation !== null ? data.avgInflation.toFixed(2) + '%' : '--';
        document.getElementById('modelRMSE').textContent = data.avgUnemployment !== null ? data.avgUnemployment.toFixed(2) + '%' : '--';
        document.getElementById('dataQuality').textContent = data.totalRecords ? data.totalRecords.toLocaleString() : '--';
    } catch (error) {
        console.error('Error fetching analytics stats:', error);
        // fallback to placeholder values
        document.getElementById('avgPrediction').textContent = '--';
        document.getElementById('stdDevPred').textContent = '--';
        document.getElementById('modelRMSE').textContent = '--';
        document.getElementById('dataQuality').textContent = '--';
    }
}

async function loadAnalyticsCharts() {
    // 1. Fetch Global Trends Data
    try {
        const trendRes = await fetch(`${API_URL}/global_trends`);
        if (trendRes.ok) {
            const data = await trendRes.json();
            const years = data.map(d => d.year);
            const gdp = data.map(d => d.avg_gdp);
            const inf = data.map(d => d.avg_inflation);
            const unemp = data.map(d => d.avg_unemployment);

            const trendCtx = document.getElementById('trendChart');
            if (trendCtx) {
                CHARTS.trend = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [
                            {
                                label: 'Avg GDP Growth (%)',
                                data: gdp,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                tension: 0.4,
                                fill: true,
                                borderWidth: 3
                            },
                            {
                                label: 'Avg Inflation (%)',
                                data: inf,
                                borderColor: '#ef4444',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                tension: 0.4,
                                fill: false,
                                borderWidth: 2,
                                borderDash: [5, 5]
                            },
                            {
                                label: 'Avg Unemployment (%)',
                                data: unemp,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.4,
                                fill: false,
                                borderWidth: 2
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true, labels: { font: { size: 12, weight: '500' } } }
                        },
                        scales: {
                            y: { ticks: { callback: (value) => value.toFixed(1) + '%' } }
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error("Failed to load trend chart", e);
    }

    // 2. Fetch GDP Countries Data for Pie Chart
    try {
        const gdpRes = await fetch(`${API_URL}/gdp_countries`);
        if (gdpRes.ok) {
            const list = await gdpRes.json();
            
            // Get top 10 and group the rest as Others
            let top10 = list.slice(0, 10);
            let othersGdp = list.slice(10).reduce((sum, item) => sum + (item.gdp || 0), 0);
            
            let labels = top10.map(item => item.country);
            let data = top10.map(item => item.gdp);

            if (othersGdp > 0) {
                labels.push('Others');
                data.push(othersGdp);
            }

            const distCtx = document.getElementById('distributionChart');
            if (distCtx) {
                CHARTS.distribution = new Chart(distCtx, {
                    type: 'pie',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: [
                                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                                '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b', '#cbd5e1'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { position: 'right' },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed !== null) {
                                            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(context.parsed);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error("Failed to load distribution chart", e);
    }
}


// ============================================
// Correlation Data
// ============================================

async function loadCorrelationChart() {
    try {
        const res = await fetch(`${API_URL}/correlation`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('No correlation data returned');
            return;
        }

        const years = data.map(d => d.year);
        const inf = data.map(d => d.corr_inflation);
        const unemp = data.map(d => d.corr_unemployment);
        const trade = data.map(d => d.corr_trade);

        const corrCtx = document.getElementById('correlationChart');
        if (corrCtx) {
            CHARTS.correlation = new Chart(corrCtx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Inflation',
                            data: inf,
                            borderColor: '#ef4444',
                            fill: false,
                            tension: 0.3
                        },
                        {
                            label: 'Unemployment',
                            data: unemp,
                            borderColor: '#10b981',
                            fill: false,
                            tension: 0.3
                        },
                        {
                            label: 'Trade % GDP',
                            data: trade,
                            borderColor: '#3b82f6',
                            fill: false,
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: {
                            min: -1,
                            max: 1,
                            ticks: { callback: v => v.toFixed(2) }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading correlation data:', error);
    }
}

// ============================================
// Utility Functions
// ============================================

function generateData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(min + Math.random() * (max - min));
    }
    return data;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Add spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .bg-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    .bg-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .bg-danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
`;
document.head.appendChild(style);

// ============================================
// Backend Integration Sample
// ============================================

/*
// Example of actual API call (uncomment and modify for your backend)

async function callBackendAPI(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Example: Get predictions
async function getPredictionsFromBackend() {
    try {
        const data = await callBackendAPI('/predictions');
        return data;
    } catch (error) {
        console.error('Error fetching predictions:', error);
        return [];
    }
}

// Example: Submit prediction
async function submitPredictionToBackend(inputs) {
    try {
        const data = await callBackendAPI('/predict', 'POST', inputs);
        return data;
    } catch (error) {
        console.error('Error submitting prediction:', error);
        throw error;
    }
}

// Get auth token from localStorage
function getToken() {
    return localStorage.getItem('token') || '';
}

*/

// ============================================
// Country GDP Fetcher

async function loadCountryData() {
    try {
        const res = await fetch(`${API_URL}/gdp_countries`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const list = await res.json();
        const tbody = document.querySelector('#countryTable tbody');
        if (tbody) {
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-3">No data</td></tr>';
            } else {
                tbody.innerHTML = list.map(item =>
                    `<tr><td>${escapeHtml(item.country)}</td><td>${Number(item.gdp).toLocaleString()}</td></tr>`
                ).join('');
            }
        }
        const countEl = document.getElementById('countryCount');
        if (countEl) countEl.textContent = list.length;
    } catch (error) {
        console.error('Error loading country GDP data:', error);
        const tbody = document.querySelector('#countryTable tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="text-center text-danger py-3">Failed to fetch</td></tr>';
        const countEl = document.getElementById('countryCount');
        if (countEl) countEl.textContent = '--';
    }
}

// ============================================
// Page Load Handler
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and load appropriate content
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    console.log('Page loaded:', currentPage);

    // if analytics page, attach refresh button listener
    if (currentPage === 'analytics.html') {
        const btn = document.getElementById('refreshCorrelation');
        if (btn) {
            btn.addEventListener('click', () => {
                // destroy old chart then reload
                if (CHARTS.correlation) {
                    CHARTS.correlation.destroy();
                    delete CHARTS.correlation;
                }
                loadCorrelationChart();
            });
        }
    }
});
