const { chromium } = require('playwright');
const assessmentService = require('../services/assessment');

async function generateDimensionAnalysisPDF(request, reply) {
  try {
    const { assessmentId } = request.body || {};

    if (!assessmentId) {
      reply.code(400);
      return {
        success: false,
        error: 'assessmentId is required'
      };
    }

    // Fetch assessment results from database
    const assessmentData = await assessmentService.getResults(request.server.pg, assessmentId);

    if (!assessmentData) {
      reply.code(404);
      return {
        success: false,
        error: 'Assessment not found'
      };
    }

    // Map dimension scores
    const finalScores = {
      compute: Math.round(assessmentData.compute_capacity || 0),
      capital: Math.round(assessmentData.capital_formation || 0),
      regulatory: Math.round(assessmentData.regulatory_readiness || 0),
      talent: Math.round(assessmentData.data_sovereignty || 0),
      nce: Math.round(assessmentData.directed_intelligence || 0)
    };

    const nationName = assessmentData.country || 'Your Nation';
    const sapiScore = parseFloat(assessmentData.sapi_score || 0).toFixed(1);
    const tier = assessmentData.tier || 'DEVELOPING';
    
    // Determine tier color
    const tierColors = {
      'SOVEREIGN AI LEADER': '#4caf7c',
      'ADVANCED': '#5c7cfa',
      'DEVELOPING': '#e8d890',
      'NASCENT': '#d4a574',
      'PRE-CONDITIONS UNMET': '#d85a6a'
    };
    const tierColor = tierColors[tier.toUpperCase()] || '#e8d890';

    const browser = await chromium.launch();

    const page = await browser.newPage();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
            width: 900px;
            min-height: 700px;
            padding: 30px;
            border: 2px solid #d4a520;
          }
          .main-card {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            padding: 30px;
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
            position: relative;
          }
          .score-section {
            flex: 0 0 200px;
            border-right: 1px solid #e0e0e0;
            padding-right: 30px;
          }
          .score-label {
            font-size: 10px;
            color: #333333;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
            font-weight: 700;
          }
          .score-value {
            font-size: 56px;
            font-weight: 600;
            color: #d4a520;
            margin-bottom: 20px;
          }
          .tier-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(212, 165, 32, 0.15);
            border: 2px solid #d4a520;
            border-radius: 20px;
            padding: 6px 16px;
            font-size: 11px;
            color: #b8860b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 30px;
            font-weight: 600;
          }
          .tier-dot {
            width: 6px;
            height: 6px;
            background: #d4a520;
            border-radius: 50%;
          }
          .tier-legend {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .tier-legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 9px;
            color: #444444;
            font-weight: 500;
          }
          .tier-line {
            width: 20px;
            height: 2px;
            border-radius: 1px;
          }
          .tier-line.leader { background: #4caf7c; }
          .tier-line.advanced { background: #5c7cfa; }
          .tier-line.developing { background: #e8d890; }
          .tier-line.nascent { background: #d4a574; }
          .tier-line.unmet { background: #d85a6a; }
          .chart-section {
            flex: 1;
            position: relative;
          }
          .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          .chart-title {
            font-size: 10px;
            color: #333333;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
          }
          .chart-container {
            position: relative;
            width: 100%;
            height: 280px;
          }
          .dimension-cards {
            display: flex;
            gap: 15px;
            justify-content: space-between;
          }
          .dim-card {
            flex: 1;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            border-top: 4px solid #d4a520;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          .dim-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .dim-id {
            font-size: 11px;
            color: #c9a227;
            font-weight: 600;
          }
          .dim-badge {
            font-size: 9px;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            font-weight: 600;
          }
          .dim-badge.medium {
            background: rgba(212, 165, 32, 0.2);
            color: #b8860b;
            font-weight: 600;
          }
          .dim-badge.high {
            background: rgba(76, 175, 124, 0.2);
            color: #2e7d52;
            font-weight: 600;
          }
          .dim-name {
            font-size: 11px;
            color: #444444;
            margin-bottom: 15px;
            font-weight: 500;
          }
          .dim-score {
            font-size: 28px;
            font-weight: 600;
            color: #d4a520;
            margin-bottom: 10px;
          }
          .dim-bar {
            height: 3px;
            background: #f0f0f0;
            border-radius: 2px;
            margin-bottom: 12px;
            overflow: hidden;
          }
          .dim-bar-fill {
            height: 100%;
            border-radius: 2px;
          }
          .dim-link {
            font-size: 9px;
            color: #888888;
            text-decoration: none;
          }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e0e0e0;
          }
          .pdf-title {
            font-size: 20px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .pdf-nation {
            font-size: 16px;
            color: #d4a520;
            font-weight: 600;
          }
          .dim-labels-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          .dim-label-pos {
            position: absolute;
            font-size: 9px;
            color: #8888aa;
            text-align: center;
          }
          .chart-value {
            position: absolute;
            font-size: 10px;
            color: #e8d890;
            font-weight: 600;
            background: rgba(232, 216, 144, 0.2);
            padding: 2px 6px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="pdf-header">
          <div class="pdf-title">SAPI Assessment Report</div>
          <div class="pdf-nation">${nationName}</div>
        </div>
        <div class="main-card">
          <div class="score-section">
            <div class="score-label">Composite SAPI Score</div>
            <div class="score-value">${sapiScore}</div>
            <div class="tier-badge">
              <span class="tier-dot"></span>
              ${tier}
            </div>
            <div class="tier-legend">
              <div class="tier-legend-item">
                <div class="tier-line leader"></div>
                <span>80-100 — Sovereign AI Leader</span>
              </div>
              <div class="tier-legend-item">
                <div class="tier-line advanced"></div>
                <span>60-79 — Advanced</span>
              </div>
              <div class="tier-legend-item">
                <div class="tier-line developing"></div>
                <span>40-59 — Developing</span>
              </div>
              <div class="tier-legend-item">
                <div class="tier-line nascent"></div>
                <span>20-39 — Nascent</span>
              </div>
              <div class="tier-legend-item">
                <div class="tier-line unmet"></div>
                <span>1-19 — Pre-conditions Unmet</span>
              </div>
            </div>
          </div>
          <div class="chart-section">
            <div class="chart-header">
              <div class="chart-title">Dimension Profile · 0-100 Scale</div>
            </div>
            <div class="chart-container">
              <canvas id="radarChart" width="400" height="280"></canvas>
            </div>
          </div>
        </div>
        
        <div class="dimension-cards">
          <div class="dim-card">
            <div class="dim-card-header">
              <span class="dim-id">D1</span>
              <span class="dim-badge medium">MEDIUM</span>
            </div>
            <div class="dim-name">Compute Capacity</div>
            <div class="dim-score">${finalScores.compute}.0</div>
            <div class="dim-bar">
              <div class="dim-bar-fill" style="width: ${finalScores.compute}%; background: #e8d890;"></div>
            </div>
          </div>
          <div class="dim-card">
            <div class="dim-card-header">
              <span class="dim-id">D2</span>
              <span class="dim-badge medium">MEDIUM</span>
            </div>
            <div class="dim-name">Capital Formation</div>
            <div class="dim-score">${finalScores.capital}.0</div>
            <div class="dim-bar">
              <div class="dim-bar-fill" style="width: ${finalScores.capital}%; background: #e8d890;"></div>
            </div>
          </div>
          <div class="dim-card">
            <div class="dim-card-header">
              <span class="dim-id">D3</span>
              <span class="dim-badge medium">MEDIUM</span>
            </div>
            <div class="dim-name">Regulatory Readiness</div>
            <div class="dim-score">${finalScores.regulatory}.0</div>
            <div class="dim-bar">
              <div class="dim-bar-fill" style="width: ${finalScores.regulatory}%; background: #e8d890;"></div>
            </div>
          </div>
          <div class="dim-card">
            <div class="dim-card-header">
              <span class="dim-id">D4</span>
              <span class="dim-badge ${finalScores.talent >= 60 ? 'high' : 'medium'}">${finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM'}</span>
            </div>
            <div class="dim-name">Data Sovereignty</div>
            <div class="dim-score">${finalScores.talent}.0</div>
            <div class="dim-bar">
              <div class="dim-bar-fill" style="width: ${finalScores.talent}%; background: ${finalScores.talent >= 60 ? '#4caf7c' : '#e8d890'};"></div>
            </div>
          </div>
          <div class="dim-card">
            <div class="dim-card-header">
              <span class="dim-id">D5</span>
              <span class="dim-badge medium">MEDIUM</span>
            </div>
            <div class="dim-name">Directed Intelligence Maturity</div>
            <div class="dim-score">${finalScores.nce}.0</div>
            <div class="dim-bar">
              <div class="dim-bar-fill" style="width: ${finalScores.nce}%; background: #e8d890;"></div>
            </div>
          </div>
        </div>
        
        <script>
          const ctx = document.getElementById('radarChart').getContext('2d');
          new Chart(ctx, {
            type: 'radar',
            data: {
              labels: ['Compute', 'Capital Formation', 'Regulatory', 'Data Sovereignty', 'DI Maturity'],
              datasets: [{
                data: [${finalScores.compute}, ${finalScores.capital}, ${finalScores.regulatory}, ${finalScores.talent}, ${finalScores.nce}],
                backgroundColor: 'rgba(212, 165, 32, 0.25)',
                borderColor: '#d4a520',
                borderWidth: 3,
                pointBackgroundColor: '#d4a520',
                pointBorderColor: '#d4a520',
                pointRadius: 5,
                pointHoverRadius: 5
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
              },
              scales: {
                r: {
                  min: 0,
                  max: 100,
                  ticks: { 
                    display: true,
                    stepSize: 20,
                    color: '#444444',
                    font: { size: 9, weight: '500' }
                  },
                  grid: {
                    color: '#e0e0e0',
                    circular: false
                  },
                  angleLines: {
                    color: '#d0d0d0'
                  },
                  pointLabels: { 
                    display: true,
                    color: '#333333',
                    font: { size: 10, weight: '600' }
                  }
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pdfBuffer = await page.pdf({
      width: 960,
      height: 760,
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="dimension-analysis-${nationName.toLowerCase().replace(/\s+/g, '-')}.pdf"`);
    reply.header('Content-Length', pdfBuffer.length);

    return pdfBuffer;

  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateDimensionAnalysisPDF
};
