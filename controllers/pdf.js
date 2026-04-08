const PDFDocument = require('pdfkit');
const assessmentService = require('../services/assessment');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

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

    const assessmentData = await assessmentService.getResults(request.server.pg, assessmentId);

    if (!assessmentData) {
      reply.code(404);
      return {
        success: false,
        error: 'Assessment not found'
      };
    }

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

    const tierColors = {
      'SOVEREIGN AI LEADER': '#4caf7c',
      'ADVANCED': '#5c7cfa',
      'DEVELOPING': '#d4a520',
      'NASCENT': '#d4a574',
      'PRE-CONDITIONS UNMET': '#d85a6a'
    };
    const tierColor = tierColors[tier.toUpperCase()] || '#d4a520';

    // Generate radar chart image
    const chartCanvas = new ChartJSNodeCanvas({ width: 400, height: 280, backgroundColour: '#ffffff' });
    const chartImage = await chartCanvas.renderToBuffer({
      type: 'radar',
      data: {
        labels: ['Compute', 'Capital Formation', 'Regulatory', 'Data Sovereignty', 'DI Maturity'],
        datasets: [{
          data: [finalScores.compute, finalScores.capital, finalScores.regulatory, finalScores.talent, finalScores.nce],
          backgroundColor: 'rgba(212, 165, 32, 0.25)',
          borderColor: '#d4a520',
          borderWidth: 3,
          pointBackgroundColor: '#d4a520',
          pointBorderColor: '#d4a520',
          pointRadius: 5
        }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: true, stepSize: 20, color: '#444444', font: { size: 9 } },
            grid: { color: '#e0e0e0' },
            angleLines: { color: '#d0d0d0' },
            pointLabels: { color: '#333333', font: { size: 10, weight: 'bold' } }
          }
        }
      }
    });

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // Gold border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#d4a520').lineWidth(2);

      // Header
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a1a1a').text('SAPI Assessment Report', 40, 40);
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#d4a520').text(nationName, 400, 40, { align: 'right' });
      doc.moveTo(40, 65).lineTo(555, 65).stroke('#e0e0e0');

      // Main card box
      doc.roundedRect(40, 80, 515, 220, 10).stroke('#e0e0e0').fill('#ffffff');

      // Score section
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('COMPOSITE SAPI SCORE', 60, 100);
      doc.font('Helvetica-Bold').fontSize(48).fillColor('#d4a520').text(sapiScore, 60, 120);

      // Tier badge
      doc.roundedRect(60, 175, 120, 25, 12).stroke('#d4a520').fill('rgba(212, 165, 32, 0.15)');
      doc.circle(72, 187.5, 3).fill('#d4a520');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#b8860b').text(tier, 82, 182);

      // Tier legend
      const legendY = 210;
      const legendItems = [
        { color: '#4caf7c', text: '80-100 — Sovereign AI Leader' },
        { color: '#5c7cfa', text: '60-79 — Advanced' },
        { color: '#e8d890', text: '40-59 — Developing' },
        { color: '#d4a574', text: '20-39 — Nascent' },
        { color: '#d85a6a', text: '1-19 — Pre-conditions Unmet' }
      ];
      legendItems.forEach((item, i) => {
        doc.rect(60, legendY + i * 12, 15, 2).fill(item.color);
        doc.font('Helvetica').fontSize(8).fillColor('#444444').text(item.text, 80, legendY + i * 12 - 2);
      });

      // Chart section
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('DIMENSION PROFILE · 0-100 SCALE', 280, 100);
      doc.image(chartImage, 280, 115, { width: 250 });

      // Dimension cards
      const cardWidth = 95;
      const cardHeight = 130;
      const cardY = 320;
      const startX = 40;

      const dimensions = [
        { id: 'D1', name: 'Compute Capacity', score: finalScores.compute },
        { id: 'D2', name: 'Capital Formation', score: finalScores.capital },
        { id: 'D3', name: 'Regulatory Readiness', score: finalScores.regulatory },
        { id: 'D4', name: 'Data Sovereignty', score: finalScores.talent, high: finalScores.talent >= 60 },
        { id: 'D5', name: 'Directed Intelligence Maturity', score: finalScores.nce }
      ];

      dimensions.forEach((dim, i) => {
        const x = startX + i * (cardWidth + 10);
        
        // Card with gold top border
        doc.roundedRect(x, cardY + 4, cardWidth, cardHeight - 4, 8).stroke('#e0e0e0').fill('#ffffff');
        doc.rect(x, cardY, cardWidth, 4).fill('#d4a520');

        // D-label
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#c9a227').text(dim.id, x + 10, cardY + 15);

        // Badge
        const badgeColor = dim.high ? '#4caf7c' : '#b8860b';
        const badgeBg = dim.high ? 'rgba(76, 175, 124, 0.2)' : 'rgba(212, 165, 32, 0.2)';
        const badgeText = dim.high ? 'HIGH' : 'MEDIUM';
        
        doc.roundedRect(x + 35, cardY + 13, 45, 14, 3).fill(badgeBg);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(dim.high ? '#2e7d52' : '#b8860b').text(badgeText, x + 42, cardY + 16);

        // Dimension name
        doc.font('Helvetica').fontSize(9).fillColor('#444444').text(dim.name, x + 10, cardY + 35, { width: cardWidth - 20 });

        // Score
        doc.font('Helvetica-Bold').fontSize(22).fillColor('#d4a520').text(dim.score + '.0', x + 10, cardY + 65);

        // Progress bar
        doc.rect(x + 10, cardY + 95, cardWidth - 20, 3).fill('#f0f0f0');
        doc.rect(x + 10, cardY + 95, (cardWidth - 20) * (dim.score / 100), 3).fill(dim.high ? '#4caf7c' : '#e8d890');
      });

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

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
