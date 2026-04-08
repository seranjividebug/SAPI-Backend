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
      const headerY = 40;
      const logoSize = 35;
      
      // Add logo with error handling - try local file first
      try {
        // Try local file first
        doc.image('assets/sapi-logo.png', 40, headerY, { width: logoSize, height: logoSize });
      } catch (localError) {
        try {
          // Fallback to external URL
          doc.image('https://i.ibb.co/0Vc3cQqm/Picture1.png', 40, headerY, { width: logoSize, height: logoSize });
        } catch (error) {
          console.log('Logo not found, proceeding without logo');
        }
      }
      
      // Title with reduced font size
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#2c3e50').text('SAPI Assessment Report', 40 + logoSize + 15, headerY + 10);
      
      // Country name on the right
      doc.font('Helvetica').fontSize(14).fillColor('#d4a520').text(nationName, 400, headerY + 12, { align: 'right' });
      
      // Subtle border line under header with more spacing
      doc.moveTo(40, headerY + logoSize + 15).lineTo(555, headerY + logoSize + 15).stroke('#e8e8e8').lineWidth(1);

      // Main card box
      const mainCardY = headerY + logoSize + 25;
      doc.roundedRect(40, mainCardY, 515, 220, 10).stroke('#e0e0e0').fill('#ffffff');

      // Score section - aligned with chart
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('COMPOSITE SAPI SCORE', 60, mainCardY + 20);
      doc.font('Helvetica-Bold').fontSize(48).fillColor('#d4a520').text(sapiScore, 60, mainCardY + 35);

      // Tier badge with proper padding
      const tierTextWidth = doc.widthOfString(tier, { font: 'Helvetica-Bold', fontSize: 9 });
      const badgeWidth = tierTextWidth + 2; // Reduced padding: 5px on each side
      const badgeX = 60 + (120 - badgeWidth) / 2; // Center the badge in 120px area
      


      doc.fillColor('#000')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(tier, badgeX, mainCardY + 102, {
            width: badgeWidth,
            align: 'center'
         });

      // Tier legend
      const legendY = mainCardY + 130;
      const legendItems = [
        { color: '#4caf7c', text: '80-100 - Sovereign AI Leader' },
        { color: '#5c7cfa', text: '60-79 - Advanced' },
        { color: '#d4a520', text: '40-59 - Developing' },
        { color: '#d4a574', text: '20-39 - Nascent' },
        { color: '#d85a6a', text: '1-19 - Pre-conditions Unmet' }
      ];
      legendItems.forEach((item, i) => {
        doc.rect(60, legendY + i * 12, 15, 2).fill(item.color);
        doc.font('Helvetica').fontSize(8).fillColor('#444444').text(item.text, 80, legendY + i * 12 - 2);
      });

      // Chart section - aligned with score
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#333333').text('DIMENSION PROFILE · 0-100 SCALE', 280, mainCardY + 20);
      doc.image(chartImage, 280, mainCardY + 35, { width: 250 });

      // Dimension cards
      const cardWidth = 95;
      const cardHeight = 130;
      const cardY = mainCardY + 240;
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
        const isHigh = dim.score >= 60;
        const statusText = isHigh ? 'HIGH' : 'MEDIUM';
        
        // Card without gold top border - ensure consistent alignment
        doc.roundedRect(x, cardY, cardWidth, cardHeight, 8).stroke('#e0e0e0').fill('#ffffff');

        // D-label with light gold color - properly aligned
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#d4a520').text(dim.id, x + 10, cardY + 12);

        // Status label with colored background - aligned to right
        const statusTextWidth = doc.widthOfString(statusText, { font: 'Helvetica-Bold', fontSize: 7 });
        const statusLabelWidth = statusTextWidth + 12;
        const statusLabelX = x + cardWidth - statusLabelWidth - 10;
        
        doc.roundedRect(statusLabelX, cardY + 10, statusLabelWidth, 16, 8)
           .fill(isHigh ? '#e6ffe6' : '#fffacd'); // Light green for HIGH, light yellow for MEDIUM
        doc.font('Helvetica-Bold').fontSize(7).fillColor(isHigh ? '#008000' : '#daa520') // Dark green for HIGH, gold for MEDIUM
           .text(statusText, statusLabelX + 6, cardY + 16);

        // Dimension name - ensure Helvetica font
        doc.font('Helvetica').fontSize(6).fillColor('#333333').text(dim.name, x + 10, cardY + 32, { width: cardWidth - 20 });

        // Score without .0 and in black - ensure Helvetica-Bold font
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#000000').text(dim.score.toString(), x + 10, cardY + 58);

        // Progress bar at bottom with updated colors - ensure proper alignment
        const barY = cardY + 92;
        doc.rect(x + 10, barY, cardWidth - 20, 4).fill('#f5f5f5');
        doc.rect(x + 10, barY, (cardWidth - 20) * (dim.score / 100), 4).fill(isHigh ? '#4caf7c' : '#d4a520');
      });

      // ORGANISATION PROFILE section - modern two-column design
      const orgProfileY = cardY + cardHeight + 5;
      doc.roundedRect(40, orgProfileY, 515, 140, 10).stroke('#e0e0e0').fill('#ffffff');
      
      // Section title with subtle accent
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('ORGANISATION PROFILE', 60, orgProfileY + 15);
      
      // Two-column layout with icons
      const profileItems = [
        { label: 'Industry', value: assessmentData.industry || 'Technology', icon: 'I', col: 0 },
        { label: 'Org Size', value: assessmentData.org_size || 'Large Enterprise', icon: 'O', col: 1 },
        { label: 'Geo Focus', value: assessmentData.geo_focus || 'Global', icon: 'G', col: 0 },
        { label: 'AI Maturity', value: assessmentData.ai_maturity || 'Intermediate', icon: 'A', col: 1 }
      ];
      
      profileItems.forEach((item, i) => {
        const colX = item.col === 0 ? 60 : 295; // Left and right column positions
        const rowY = Math.floor(i / 2) * 35; // Row spacing
        const itemY = orgProfileY + 45 + rowY;
        
        // Icon circle with letter
        const iconSize = 24;
        const iconX = colX;
        const iconY = itemY - 2;
        
        doc.circle(iconX + iconSize/2, iconY + iconSize/2, iconSize/2).fill('#f0f4f8');
        doc.circle(iconX + iconSize/2, iconY + iconSize/2, iconSize/2).stroke('#d4a520').lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#d4a520').text(item.icon, iconX + iconSize/2 - 4, iconY + iconSize/2 - 5);
        
        // Label with better typography
        const labelX = colX + iconSize + 12;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#666666').text(item.label.toUpperCase(), labelX, itemY);
        
        // Value with emphasis
        doc.font('Helvetica').fontSize(10).fillColor('#2c3e50').text(item.value, labelX, itemY + 12);
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
