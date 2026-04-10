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

    const nationName = assessmentData.country || 'United Arab Emirates';
    const sapiScore = parseFloat(assessmentData.sapi_score || 0).toFixed(1);
    const tier = assessmentData.tier || 'TIER 1';

    // Create PDF with dark blue background and margins
    const margin = 50;
    const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 0, left: margin, right: margin } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // Dark blue background
      // Dark blue background
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - (margin * 2);
      doc.fillColor('#0F0830').rect(0, 0, pageWidth, doc.page.height).fill();

// === WATERMARK: "SAPI - CONFIDENTIAL" diagonal ===
doc.save();
doc.translate(doc.page.width / 2, doc.page.height / 2);
doc.rotate(-45);
doc.font('Helvetica-Bold').fontSize(52).fillColor('rgba(255,255,255,0.04)');
doc.text('SAPI - CONFIDENTIAL', -200, -60, { width: 400, align: 'center' });
doc.restore();

// === HEADER ===
const headerY = 28;
const logoSize = 52;

// Globe logo circle
try {
  doc.image('assets/sapi-logo.png', margin, headerY, { width: logoSize, height: logoSize });
} catch (e) {
  // Fallback globe: outer circle + inner lines
  const globeCenterX = margin + 26;
  doc.circle(globeCenterX, headerY + 26, 22).stroke('#ffffff').lineWidth(1.2);
  doc.ellipse(globeCenterX, headerY + 26, 11, 22).stroke('#ffffff').lineWidth(0.8);
  doc.moveTo(globeCenterX - 22, headerY + 26).lineTo(globeCenterX + 22, headerY + 26).stroke('#ffffff').lineWidth(0.8);
  doc.moveTo(globeCenterX - 22, headerY + 18).lineTo(globeCenterX + 22, headerY + 18).stroke('#ffffff').lineWidth(0.5);
  doc.moveTo(globeCenterX - 22, headerY + 34).lineTo(globeCenterX + 22, headerY + 34).stroke('#ffffff').lineWidth(0.5);
}

// Header text
doc.font('Helvetica-Bold').fontSize(11).fillColor('#FBF5E6')
  .text('THE SOVEREIGN AI POWER INDEX', margin + 64, headerY + 14);
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
  .text('SOVEREIGN AI ASSESSMENT PLATFORM', margin + 64, headerY + 30);

// Gold line under header
doc.moveTo(margin, headerY + 52).lineTo(pageWidth - margin, headerY + 52)
  .stroke('#C9963A').lineWidth(0.8);

// === MAIN TITLE (left-aligned, medium weight) ===
const titleY = 220;
doc.font('Helvetica-Bold').fontSize(38).fillColor('#FBF5E6')
  .text('THE SOVEREIGN AI', margin + 80, titleY, { align: 'left' });
doc.font('Helvetica-Bold').fontSize(38).fillColor('#FBF5E6')
  .text('POWER INDEX', margin + 80, titleY + 48, { align: 'left' });

// Subtitle
doc.font('Helvetica').fontSize(11).fillColor('#FBF5E6')
  .text('TIER 1 SELF-ASSESSMENT REPORT', margin + 80, titleY + 100);

// Gold line under subtitle
doc.moveTo(margin + 80, titleY + 122).lineTo(margin + 350, titleY + 122)
  .stroke('#C9963A').lineWidth(0.8);

// === AUTHOR SECTION — right side with gold vertical line ===
const authorLineX = pageWidth - margin - 100;
const authorY = 370;

// Gold vertical line
doc.moveTo(authorLineX, authorY - 10).lineTo(authorLineX, authorY + 90)
  .stroke('#C9963A').lineWidth(1);

// Author text — right of vertical line (dynamic from assessment data)
doc.font('Helvetica-Bold').fontSize(12).fillColor('#FBF5E6')
  .text(assessmentData.respondent_name || 'H.E. Dr. Khalid Al-Mansouri', authorLineX + 12, authorY);
doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6')
  .text(assessmentData.title || 'Minister for Digital Infrastructure', authorLineX + 12, authorY + 20);
doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6')
  .text(assessmentData.ministry_or_department || 'Ministry of Digital Economy & AI', authorLineX + 12, authorY + 36);
doc.font('Helvetica-Bold').fontSize(9).fillColor('#C9963A')
  .text(assessmentData.country || 'United Arab Emirates', authorLineX + 12, authorY + 52);

// === FOOTER ===
const footerY = 750;
doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY)
  .stroke('#C9963A').lineWidth(0.8);

// Generated date — bottom left, grey
const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
  .text(`Generated: ${currentDate}`, margin, footerY + 18);

// Footer row
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('© 2026 The Sovereign AI Power Index', margin, footerY + 35);
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('sapi.ai', pageWidth / 2 - 15, footerY + 35);
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('Classification: Restricted', pageWidth - margin - 110, footerY + 35);

// Page number
doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6')
  .text('1', pageWidth - margin - 5, footerY + 33);

      // Add second page for Executive Summary
      doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: margin, right: margin } });

      // Set background for second page
      doc.fillColor('#0F0830').rect(0, 0, pageWidth, doc.page.height).fill();

      // Executive Summary Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FBF5E6').text('EXECUTIVE SUMMARY', margin + 10, 50);
      doc.moveTo(margin + 10, 70).lineTo(margin + 150, 70).stroke('#C9963A').lineWidth(1);

      // Score display
      doc.font('Helvetica-Bold').fontSize(50).fillColor('#C9963A').text(sapiScore, margin + 10, 100);
      doc.font('Helvetica').fontSize(18).fillColor('#FBF5E6').text('/100', margin + 110, 125);

      // Status badge
      const statusText = tier === 'DEVELOPING' ? 'DEVELOPING SOVEREIGN AI CAPACITY' : tier + ' SOVEREIGN AI CAPACITY';
      doc.rect(margin + 10, 170, contentWidth - 20, 20).fill('#1A1540');
      doc.font('Helvetica').fontSize(10).fillColor('#C9963A').text(statusText, margin + 20, 176);

      // Description paragraph
      const description = "Your nation's AI infrastructure reflects structured effort across select dimensions, with identifiable constraints in capital formation and compute sovereignty that limit composite readiness. Closing these gaps requires deliberate prioritisation rather than broad-spectrum investment.";
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text(description, margin + 10, 210, {
        width: contentWidth - 20,
        align: 'left',
        lineGap: 4
      });

      // Dimension Readiness Overview
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#FBF5E6').text('DIMENSION READINESS OVERVIEW', margin + 10, 310);
      doc.moveTo(margin + 10, 325).lineTo(margin + 200, 325).stroke('#C9963A').lineWidth(1);

      // Bar chart dimensions
      const barChartY = 350;
      const barHeight = 25;
      const barSpacing = 35;
      const maxBarWidth = contentWidth - 150;
      const startX = margin + 10;

      const dimensions = [
        { name: 'D1 Compute Capacity', score: finalScores.compute, status: finalScores.compute < 40 ? 'LOW' : finalScores.compute >= 60 ? 'HIGH' : 'MEDIUM' },
        { name: 'D2 Capital Formation', score: finalScores.capital, status: finalScores.capital < 40 ? 'LOW' : finalScores.capital >= 60 ? 'HIGH' : 'MEDIUM' },
        { name: 'D3 Regulatory Readiness', score: finalScores.regulatory, status: finalScores.regulatory < 40 ? 'LOW' : finalScores.regulatory >= 60 ? 'HIGH' : 'MEDIUM' },
        { name: 'D4 Data Sovereignty', score: finalScores.talent, status: finalScores.talent < 40 ? 'LOW' : finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM' },
        { name: 'D5 Directed Intelligence Maturity', score: finalScores.nce, status: finalScores.nce < 40 ? 'LOW' : finalScores.nce >= 60 ? 'HIGH' : 'MEDIUM' }
      ];

      dimensions.forEach((dim, index) => {
        const y = barChartY + (index * barSpacing);
        const barWidth = (dim.score / 100) * maxBarWidth;
        
        // Set color based on status
        let barColor;
        if (dim.status === 'LOW') {
          barColor = '#dc3545'; // Red
        } else if (dim.status === 'HIGH') {
          barColor = '#28a745'; // Green
        } else {
          barColor = '#ffc107'; // Yellow
        }

        // Background bar
        doc.rect(startX, y, maxBarWidth, barHeight).fill('#2a2a4a');
        
        // Score bar
        doc.rect(startX, y, barWidth, barHeight).fill(barColor);

        // Dimension name
        doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text(dim.name, startX + maxBarWidth + 20, y + 5);

        // Score and status
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#FBF5E6').text(dim.score.toString(), startX + maxBarWidth + 200, y + 5);
        doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6').text(dim.status, startX + maxBarWidth + 240, y + 6);
      });

      // Note about dimension scores
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Dimension scores are calculated based on weighted indicators across infrastructure, policy, and implementation maturity.', margin + 10, 540, {
        width: contentWidth - 20,
        align: 'left'
      });

      // Footer for second page
      const footerY2 = 750;
      doc.moveTo(margin, footerY2).lineTo(pageWidth - margin, footerY2).stroke('#C9963A').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', margin, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', pageWidth / 2 - 20, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', pageWidth - margin - 110, footerY2 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('2', pageWidth - margin - 5, footerY2 + 35);

      // Add third page for Dimension Scorecard
      doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: margin, right: margin } });
      doc.fillColor('#0F0830').rect(0, 0, pageWidth, doc.page.height).fill();

      // Right panel background (Priority Interventions)
      const rightPanelX = pageWidth - margin - 200;
      doc.fillColor('#0F0830').rect(rightPanelX, 0, pageWidth - rightPanelX, doc.page.height).fill();
      // Gold vertical separator line
      doc.moveTo(rightPanelX, 0).lineTo(rightPanelX, doc.page.height).stroke('#C9963A').lineWidth(1);

      // === LEFT SECTION HEADER ===
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#FBF5E6').text('DIMENSION SCORECARD', margin + 10, 22);
      doc.moveTo(margin + 10, 42).lineTo(margin + 200, 42).stroke('#C9963A').lineWidth(1.5);

// === RIGHT SECTION HEADER ===
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FBF5E6').text('PRIORITY INTERVENTIONS', rightPanelX + 15, 22);
      doc.moveTo(rightPanelX + 15, 37).lineTo(rightPanelX + 120, 37).stroke('#C9963A').lineWidth(1);

      // === DIMENSION CARDS ===
      const cardStartY = 55;
      const cardGap = 8;
      const cardHeight = 118;
      const cardX = margin + 10;
      const cardWidth = rightPanelX - cardX - 10;

      const dimensionDetails = [
        {
          id: 'D1', 
          name: 'Compute Capacity', 
          subtitle: 'Infrastructure Sovereignty',
          description: 'Establish sovereign compute procurement roadmap to reduce jurisdictional exposure and achieve autonomy.',
          score: finalScores.compute,
          status: finalScores.compute < 40 ? 'LOW' : finalScores.compute >= 60 ? 'HIGH' : 'MEDIUM'
        },
        {
          id: 'D2', 
          name: 'Capital Formation', 
          subtitle: 'Investment Architecture',
          description: 'Establish national AI investment architecture coordinating sovereign fund, public budget, and private capital for improved velocity.',
          score: finalScores.capital,
          status: finalScores.capital < 40 ? 'LOW' : finalScores.capital >= 60 ? 'HIGH' : 'MEDIUM'
        },
        {
          id: 'D3', 
          name: 'Regulatory Readiness', 
          subtitle: 'Governance Framework',
          description: 'Refine adaptive regulatory mechanisms to maintain advantage as model capabilities advance.',
          score: finalScores.regulatory,
          status: finalScores.regulatory < 40 ? 'LOW' : finalScores.regulatory >= 60 ? 'HIGH' : 'MEDIUM'
        },
        {
          id: 'D4', 
          name: 'Data Sovereignty', 
          subtitle: 'Digital Asset Control',
          description: 'Establish national data trusts and formalise bilateral data exchange terms with strategic partners.',
          score: finalScores.talent,
          status: finalScores.talent < 40 ? 'LOW' : finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM'
        },
        {
          id: 'D5', 
          name: 'Directed Intelligence Maturity', 
          subtitle: 'Strategic AI Deployment',
          description: 'Establish national AI deployment doctrine with clear ministerial accountability for strategic impact.',
          score: finalScores.nce,
          status: finalScores.nce < 40 ? 'LOW' : finalScores.nce >= 60 ? 'HIGH' : 'MEDIUM'
        }
      ];

      dimensionDetails.forEach((dim, index) => {
        const y = cardStartY + index * (cardHeight + cardGap);
        
        let barColor = dim.status === 'LOW' ? '#dc3545' : dim.status === 'HIGH' ? '#28a745' : '#ffc107';
        let statusTextColor = dim.status === 'LOW' ? '#dc3545' : dim.status === 'HIGH' ? '#28a745' : '#ffc107';

        // Card background
        doc.fillColor('#0F0830').rect(cardX, y, cardWidth, cardHeight).fill();

        // Left colored vertical strip
        doc.fillColor(barColor).rect(cardX, y, 4, cardHeight).fill();

        // Top row: "D1 — Compute Capacity" on left, score on right
        const titleX = cardX + 14;
        const scoreX = cardX + cardWidth - 55;

        doc.font('Helvetica-Bold').fontSize(11).fillColor('#FBF5E6')
          .text(`${dim.id} — ${dim.name}`, titleX, y + 12, { width: cardWidth - 80 });

        // Score (large, colored) top-right
        doc.font('Helvetica-Bold').fontSize(30).fillColor(barColor)
          .text(dim.score.toString(), scoreX, y + 8, { width: 50, align: 'right' });

        // Status below score, right-aligned
        doc.font('Helvetica-Bold').fontSize(8).fillColor(statusTextColor)
          .text(dim.status, scoreX, y + 44, { width: 50, align: 'right' });

        // Subtitle
        doc.font('Helvetica').fontSize(8).fillColor('#8888aa')
          .text(dim.subtitle, titleX, y + 30);

        // Horizontal divider
        doc.moveTo(cardX + 4, y + 52).lineTo(cardX + cardWidth, y + 52).stroke('#2a2a4a').lineWidth(0.5);

        // Description
        doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
          .text(dim.description, titleX, y + 60, { width: cardWidth - 70, lineGap: 3 });
      });

// === PRIORITY INTERVENTIONS (RIGHT PANEL) ===
      const priorityItems = [
        {
          rank: '#1 PRIORITY',
          score: finalScores.compute,
          status: finalScores.compute < 40 ? 'LOW' : finalScores.compute >= 60 ? 'HIGH' : 'MEDIUM',
          dId: 'D1', 
          name: 'Compute Capacity',
          description: 'Commission sovereign compute capacity assessment and gap analysis.'
        },
        {
          rank: '#2 PRIORITY',
          score: finalScores.talent,
          status: finalScores.talent < 40 ? 'LOW' : finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM',
          dId: 'D4', 
          name: 'Data Sovereignty',
          description: 'Audit all cross-border data flows and identify material sovereignty exposures.'
        },
        {
          rank: '#3 PRIORITY',
          score: finalScores.capital,
          status: finalScores.capital < 40 ? 'LOW' : finalScores.capital >= 60 ? 'HIGH' : 'MEDIUM',
          dId: 'D2', 
          name: 'Capital Formation',
          description: 'Establish National AI Investment Committee with sovereign fund mandate.'
        }
      ];

      const pX = rightPanelX + 15;
      const pWidth = pageWidth - rightPanelX - 50;
      let pY = 55;

      priorityItems.forEach((item, index) => {
        if (index > 0) {
          doc.moveTo(pX, pY - 8).lineTo(pageWidth - margin - 20, pY - 8).stroke('#2a2a4a').lineWidth(0.5);
        }
        
        let sColor = item.status === 'LOW' ? '#dc3545' : item.status === 'HIGH' ? '#28a745' : '#ffc107';

        // Rank label
        doc.font('Helvetica').fontSize(7).fillColor('#FBF5E6').text(item.rank, pX, pY);
        pY += 12;

        // Score large + status on same row
        doc.font('Helvetica-Bold').fontSize(28).fillColor(sColor).text(item.score.toString(), pX, pY);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(sColor).text(item.status, pX + 45, pY + 10);
        pY += 36;

        // D-number
        doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text(item.dId, pX, pY);
        pY += 11;

        // Name
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#FBF5E6').text(item.name, pX, pY, { width: pWidth });
        pY += 14;

        // Description
        doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text(item.description, pX, pY, { width: pWidth, lineGap: 3 });
        pY += 50;
      });

// Footer for third page
      const footerY3 = 750;
      doc.moveTo(margin, footerY3).lineTo(pageWidth - margin, footerY3).stroke('#C9963A').lineWidth(1);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', margin, footerY3 + 12);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', pageWidth / 2 - 20, footerY3 + 12);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', pageWidth - margin - 110, footerY3 + 12);
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('3', pageWidth - margin - 5, footerY3 + 30);

      // Add fourth page for 12-18 Month Sovereign AI Roadmap
      doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: margin, right: margin } });

      // Set background for fourth page
      doc.fillColor('#0F0830').rect(0, 0, pageWidth, doc.page.height).fill();

      // Roadmap Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FBF5E6').text('12-18 MONTH SOVEREIGN AI ROADMAP', margin + 10, 50);
      doc.moveTo(margin + 10, 70).lineTo(pageWidth - margin - 10, 70).stroke('#C9963A').lineWidth(1);

      // Roadmap Phases
      const phases = [
        {
          title: 'PHASE 1',
          subtitle: 'FOUNDATIONS',
          months: 'Months 1-4',
          tasks: [
            'Commission sovereign compute capacity assessment and gap analysis',
            'Initiate procurement dialogue with tier-1 chip and data centre vendors',
            'Establish national compute registry to map existing public sector infrastructure'
          ],
          focus: 'Focus: Compute Capacity'
        },
        {
          title: 'PHASE 2',
          subtitle: 'ACCELERATION',
          months: 'Months 5-10',
          tasks: [
            'Enact data localisation mandates for healthcare, defence, and finance sectors',
            'Launch National Data Trust infrastructure with governance board',
            'Negotiate bilateral data sharing agreements with five strategic partner states'
          ],
          focus: 'Focus: Data Sovereignty'
        },
        {
          title: 'PHASE 3',
          subtitle: 'INTEGRATION',
          months: 'Months 11-18',
          tasks: [
            'Operationalise multi-fund national AI capital stack with performance governance',
            'Deploy returns measurement framework for all sovereign AI investments',
            'Establish bilateral AI investment treaties with strategic partner nations'
          ],
          focus: 'Focus: Capital Formation'
        }
      ];

      const phaseSpacing = 20;
      const phaseWidth = (contentWidth - (phaseSpacing * 2)) / 3;
      let currentX = margin + 10;

      phases.forEach((phase, index) => {
        doc.rect(currentX, 90, phaseWidth, 350).stroke('#C9963A').lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#C9963A').text(phase.title, currentX + 10, 100);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#FBF5E6').text(phase.subtitle, currentX + 10, 115);
        doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text(phase.months, currentX + 10, 130);

        let taskY = 155;
        phase.tasks.forEach(task => {
          doc.circle(currentX + 15, taskY + 3, 2).fill('#d4a520');
          doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text(task, currentX + 25, taskY, { width: phaseWidth - 30 });
          taskY += 35;
        });

        doc.rect(currentX, 400, phaseWidth, 40).fill('#14142b').stroke('#C9963A').lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#C9963A').text(phase.focus, currentX + 10, 415);

        currentX += phaseWidth + phaseSpacing;
      });

      // Unlock Deeper Diagnostic Capability section
      // doc.rect(margin + 10, 470, contentWidth - 20, 80).fill('#14142b');
      

      


      // CTA button
      
      

      // Footer for fourth page
      const footerY4 = 750;
      doc.moveTo(margin, footerY4).lineTo(pageWidth - margin, footerY4).stroke('#C9963A').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', margin, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', pageWidth / 2 - 20, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', pageWidth - margin - 110, footerY4 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('4', pageWidth - margin - 5, footerY4 + 35);

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="sapi-assessment-${nationName.toLowerCase().replace(/\s+/g, '-')}.pdf"`);
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
