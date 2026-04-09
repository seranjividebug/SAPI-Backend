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

    // Create PDF with dark blue background
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);

      // Dark blue background
      doc.fillColor('#0a192f').rect(0, 0, doc.page.width, doc.page.height).fill();

      // Header section
      const headerY = 60;
      const logoSize = 40;
      
      // Logo (white globe-like placeholder)
      try {
        doc.image('assets/sapi-logo.png', 60, headerY, { width: logoSize, height: logoSize });
      } catch (error) {
        // Fallback: create a white circle as logo placeholder
        doc.circle(80, headerY + 20, 18).fill('#ffffff');
      }
      
      // Header text on the right
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text('THE SOVEREIGN AI POWER INDEX', 120, headerY + 5);
      doc.font('Helvetica').fontSize(12).fillColor('#ffffff').text('SOVEREIGN AI ASSESSMENT PLATFORM', 120, headerY + 28);
      
      // Gold line under header
      doc.moveTo(60, headerY + 55).lineTo(535, headerY + 55).stroke('#d4a520').lineWidth(1);

      // Main title section
      const titleY = 200;
      doc.font('Helvetica-Bold').fontSize(42).fillColor('#ffffff').text('THE SOVEREIGN AI', 0, titleY, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(42).fillColor('#ffffff').text('POWER INDEX', 0, titleY + 50, { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('TIER 1 SELF-ASSESSMENT REPORT', 0, titleY + 100, { align: 'center' });
      
      // Gold line under title
      doc.moveTo(60, titleY + 135).lineTo(535, titleY + 135).stroke('#d4a520').lineWidth(1);

      
      // Author information - moved below main title and center-aligned
      const authorY = 450; // Adjusted Y-coordinate to be below the main title
      
      // Author details
      doc.font('Helvetica').fontSize(14).fillColor('#ffffff').text('H.E. Dr. Khalid Al-Mansouri', 0, authorY, { align: 'center' });
      doc.font('Helvetica').fontSize(11).fillColor('#ffffff').text('Minister for Digital Infrastructure', 0, authorY + 25, { align: 'center' });
      doc.font('Helvetica').fontSize(11).fillColor('#ffffff').text('Ministry of Digital Economy & AI', 0, authorY + 45, { align: 'center' });
      doc.font('Helvetica').fontSize(11).fillColor('#d4a520').text('United Arab Emirates', 0, authorY + 65, { align: 'center' });

      // Footer section
      const footerY = 750;
      
      // Gold line above footer
      doc.moveTo(60, footerY).lineTo(535, footerY).stroke('#d4a520').lineWidth(1);
      
      // Generated date
      const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text(`Generated: ${currentDate}`, 60, footerY + 15);
      
      // Bottom copyright info - fixed alignment with proper margins
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('© 2025 The Sovereign AI Power Index', 60, footerY + 35);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('sapi.ai', doc.page.width / 2 - 20, footerY + 35);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('Classification: Restricted', 480, footerY + 35);
      
      // Page number
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text('1', 480, footerY + 55);

      // Add second page for Executive Summary
      doc.addPage({ size: 'A4', margin: 0 });

      // Set background for second page
      doc.fillColor('#1a1a36').rect(0, 0, doc.page.width, doc.page.height).fill();

      // Executive Summary Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff').text('EXECUTIVE SUMMARY', 60, 50);
      doc.moveTo(60, 70).lineTo(200, 70).stroke('#d4a520').lineWidth(1);

      // Score display
      doc.font('Helvetica-Bold').fontSize(50).fillColor('#d4a520').text(sapiScore, 60, 100);
      doc.font('Helvetica').fontSize(18).fillColor('#ffffff').text('/100', 170, 125);

      // Status badge
      const statusText = tier === 'DEVELOPING' ? 'DEVELOPING SOVEREIGN AI CAPACITY' : tier + ' SOVEREIGN AI CAPACITY';
      doc.rect(60, 170, 300, 20).fill('#3a3a5c');
      doc.font('Helvetica').fontSize(10).fillColor('#d4a520').text(statusText, 70, 176);

      // Description paragraph
      const description = "Your nation's AI infrastructure reflects structured effort across select dimensions, with identifiable constraints in capital formation and compute sovereignty that limit composite readiness. Closing these gaps requires deliberate prioritisation rather than broad-spectrum investment.";
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text(description, 60, 210, {
        width: 480,
        align: 'left'
      });

      // Dimension Readiness Overview
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text('DIMENSION READINESS OVERVIEW', 60, 310);
      doc.moveTo(60, 325).lineTo(250, 325).stroke('#d4a520').lineWidth(1);

      // Bar chart dimensions
      const barChartY = 350;
      const barHeight = 25;
      const barSpacing = 35;
      const maxBarWidth = 300;
      const startX = 60;

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
        doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text(dim.name, startX + maxBarWidth + 20, y + 5);

        // Score and status
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(dim.score.toString(), startX + maxBarWidth + 200, y + 5);
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff').text(dim.status, startX + maxBarWidth + 240, y + 6);
      });

      // Note about dimension scores
      doc.font('Helvetica').fontSize(8).fillColor('#888888').text('Dimension scores are calculated based on weighted indicators across infrastructure, policy, and implementation maturity.', 60, 540, {
        width: 480,
        align: 'left'
      });

      // Footer for second page
      const footerY2 = 750;
      doc.moveTo(60, footerY2).lineTo(535, footerY2).stroke('#d4a520').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('© 2025 The Sovereign AI Power Index', 60, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('sapi.ai', doc.page.width / 2 - 20, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('Classification: Restricted', 480, footerY2 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text('2', 480, footerY2 + 35);

      // Add third page for Dimension Scorecard
     // Add third page for Dimension Scorecard
doc.addPage({ size: 'A4', margin: 0 });
doc.fillColor('#0d0d1f').rect(0, 0, doc.page.width, doc.page.height).fill();

// Right panel background (Priority Interventions)
const rightPanelX = 375;
doc.fillColor('#14142b').rect(rightPanelX, 0, doc.page.width - rightPanelX, doc.page.height).fill();
// Gold vertical separator line
doc.moveTo(rightPanelX, 0).lineTo(rightPanelX, doc.page.height).stroke('#d4a520').lineWidth(1);

// === LEFT SECTION HEADER ===
doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('DIMENSION SCORECARD', 25, 22);
doc.moveTo(25, 42).lineTo(200, 42).stroke('#d4a520').lineWidth(1.5);

// === RIGHT SECTION HEADER ===
doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text('PRIORITY INTERVENTIONS', rightPanelX + 15, 22);
doc.moveTo(rightPanelX + 15, 37).lineTo(doc.page.width - 15, 37).stroke('#d4a520').lineWidth(1);

// === DIMENSION CARDS ===
const cardStartY = 55;
const cardGap = 8;
const cardHeight = 118;
const cardX = 15;
const cardWidth = rightPanelX - cardX - 10;

const dimensionDetails = [
  {
    id: 'D1', name: 'Compute Capacity', subtitle: 'Infrastructure Sovereignty',
    description: 'Compute access remains the binding constraint on your sovereign AI ambition. Reliance on hyperscaler infrastructure introduces jurisdictional exposure inconsistent with strategic autonomy objectives. Establishing a sovereign compute procurement roadmap is an immediate priority.',
    score: finalScores.compute,
    status: finalScores.compute < 40 ? 'LOW' : finalScores.compute >= 60 ? 'HIGH' : 'MEDIUM'
  },
  {
    id: 'D2', name: 'Capital Formation', subtitle: 'Investment Architecture',
    description: 'Capital flows toward AI are present but lack the coherence and scale of leading sovereign actors. A consolidated national AI investment architecture coordinating sovereign fund, public budget, and private capital would substantially improve deployment velocity.',
    score: finalScores.capital,
    status: finalScores.capital < 40 ? 'LOW' : finalScores.capital >= 60 ? 'HIGH' : 'MEDIUM'
  },
  {
    id: 'D3', name: 'Regulatory Readiness', subtitle: 'Governance Framework',
    description: 'Your regulatory architecture provides a credible governance foundation for sovereign AI deployment. Continued refinement of adaptive regulatory mechanisms, particularly in response to model capability advances, is necessary to maintain this advantage.',
    score: finalScores.regulatory,
    status: finalScores.regulatory < 40 ? 'LOW' : finalScores.regulatory >= 60 ? 'HIGH' : 'MEDIUM'
  },
  {
    id: 'D4', name: 'Data Sovereignty', subtitle: 'Digital Asset Control',
    description: 'Data governance frameworks are active but have not achieved strategic coherence. Priority should be given to establishing national data trusts and formalising bilateral data exchange terms with strategic partner states.',
    score: finalScores.talent,
    status: finalScores.talent < 40 ? 'LOW' : finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM'
  },
  {
    id: 'D5', name: 'Directed Intelligence Maturity', subtitle: 'Strategic AI Deployment',
    description: 'AI deployment is present across select government functions but lacks the strategic direction and evaluation rigour of leading sovereign actors. A national AI deployment doctrine with clear ministerial accountability is the highest-leverage next intervention.',
    score: finalScores.nce,
    status: finalScores.nce < 40 ? 'LOW' : finalScores.nce >= 60 ? 'HIGH' : 'MEDIUM'
  }
];

dimensionDetails.forEach((dim, index) => {
  const y = cardStartY + index * (cardHeight + cardGap);
  
  let barColor = dim.status === 'LOW' ? '#dc3545' : dim.status === 'HIGH' ? '#28a745' : '#ffc107';
  let statusTextColor = dim.status === 'LOW' ? '#dc3545' : dim.status === 'HIGH' ? '#28a745' : '#ffc107';

  // Card background
  doc.fillColor('#131330').rect(cardX, y, cardWidth, cardHeight).fill();

  // Left colored vertical strip
  doc.fillColor(barColor).rect(cardX, y, 4, cardHeight).fill();

  // Top row: "D1 — Compute Capacity" on left, score on right
  const titleX = cardX + 14;
  const scoreX = cardX + cardWidth - 55;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
    .text(`${dim.id} \u2014 ${dim.name}`, titleX, y + 12, { width: cardWidth - 80 });

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
  doc.font('Helvetica').fontSize(8).fillColor('#cccccc')
    .text(dim.description, titleX, y + 60, { width: cardWidth - 70, lineGap: 1.5 });
});

// === PRIORITY INTERVENTIONS (RIGHT PANEL) ===
const priorityItems = [
  {
    rank: '#1 PRIORITY',
    score: finalScores.compute,
    status: finalScores.compute < 40 ? 'LOW' : finalScores.compute >= 60 ? 'HIGH' : 'MEDIUM',
    dId: 'D1', name: 'Compute Capacity',
    description: 'Commission sovereign compute capacity assessment and gap analysis.'
  },
  {
    rank: '#2 PRIORITY',
    score: finalScores.talent,
    status: finalScores.talent < 40 ? 'LOW' : finalScores.talent >= 60 ? 'HIGH' : 'MEDIUM',
    dId: 'D4', name: 'Data Sovereignty',
    description: 'Audit all cross-border data flows and identify material sovereignty exposures.'
  },
  {
    rank: '#3 PRIORITY',
    score: finalScores.capital,
    status: finalScores.capital < 40 ? 'LOW' : finalScores.capital >= 60 ? 'HIGH' : 'MEDIUM',
    dId: 'D2', name: 'Capital Formation',
    description: 'Establish National AI Investment Committee with sovereign fund mandate.'
  }
];

const pX = rightPanelX + 15;
const pWidth = doc.page.width - rightPanelX - 25;
let pY = 55;

priorityItems.forEach((item, index) => {
  if (index > 0) {
    doc.moveTo(pX, pY - 8).lineTo(doc.page.width - 15, pY - 8).stroke('#2a2a4a').lineWidth(0.5);
  }
  
  let sColor = item.status === 'LOW' ? '#dc3545' : item.status === 'HIGH' ? '#28a745' : '#ffc107';

  // Rank label
  doc.font('Helvetica').fontSize(7).fillColor('#888888').text(item.rank, pX, pY);
  pY += 12;

  // Score large + status on same row
  doc.font('Helvetica-Bold').fontSize(28).fillColor(sColor).text(item.score.toString(), pX, pY);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(sColor).text(item.status, pX + 45, pY + 10);
  pY += 36;

  // D-number
  doc.font('Helvetica').fontSize(8).fillColor('#aaaaaa').text(item.dId, pX, pY);
  pY += 11;

  // Name
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(item.name, pX, pY, { width: pWidth });
  pY += 14;

  // Description
  doc.font('Helvetica').fontSize(8).fillColor('#aaaaaa').text(item.description, pX, pY, { width: pWidth, lineGap: 1 });
  pY += 50;
});

// Footer for third page
const footerY3 = 750;
doc.moveTo(cardX, footerY3).lineTo(rightPanelX - 5, footerY3).stroke('#d4a520').lineWidth(1);
doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('© 2025 The Sovereign AI Power Index', cardX, footerY3 + 12);
doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('sapi.ai', 180, footerY3 + 12);
doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('Classification: Restricted', rightPanelX - 120, footerY3 + 12);
doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text('3', rightPanelX - 30, footerY3 + 30);
      // Add fourth page for 12-18 Month Sovereign AI Roadmap
      doc.addPage({ size: 'A4', margin: 0 });

      // Set background for fourth page
      doc.fillColor('#1a1a36').rect(0, 0, doc.page.width, doc.page.height).fill();

      // Roadmap Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff').text('12-18 MONTH SOVEREIGN AI ROADMAP', 60, 50);
      doc.moveTo(60, 70).lineTo(535, 70).stroke('#d4a520').lineWidth(1);

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

      const phaseWidth = 160;
      const phaseSpacing = 20;
      let currentX = 60;

      phases.forEach((phase, index) => {
        doc.rect(currentX, 90, phaseWidth, 350).stroke('#d4a520').lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#d4a520').text(phase.title, currentX + 10, 100);
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text(phase.subtitle, currentX + 10, 115);
        doc.font('Helvetica').fontSize(8).fillColor('#aaaaaa').text(phase.months, currentX + 10, 130);

        let taskY = 155;
        phase.tasks.forEach(task => {
          doc.circle(currentX + 15, taskY + 3, 2).fill('#d4a520');
          doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text(task, currentX + 25, taskY, { width: phaseWidth - 30 });
          taskY += 35;
        });

        doc.rect(currentX, 400, phaseWidth, 40).fill('#14142b').stroke('#d4a520').lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#d4a520').text(phase.focus, currentX + 10, 415);

        currentX += phaseWidth + phaseSpacing;
      });

      // Unlock Deeper Diagnostic Capability section
      doc.rect(60, 470, 515, 80).fill('#14142b').stroke('#d4a520').lineWidth(1);
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text('UNLOCK DEEPER DIAGNOSTIC CAPABILITY', 80, 490);
      
      const capabilityText = 'Access comprehensive sovereign AI development analytics, benchmark against peer nations, and receive tailored intervention strategies through our premium diagnostic platform.';
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text(capabilityText, 80, 510, {
        width: 460,
        align: 'left'
      });

      // CTA button
      doc.rect(80, 540, 180, 15).fill('#d4a520');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text('REQUEST PREMIUM ACCESS', 90, 543);

      // Footer for fourth page
      const footerY4 = 750;
      doc.moveTo(60, footerY4).lineTo(535, footerY4).stroke('#d4a520').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('© 2025 The Sovereign AI Power Index', 60, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('sapi.ai', doc.page.width / 2 - 20, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#ffffff').text('Classification: Restricted', 480, footerY4 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#ffffff').text('4', 480, footerY4 + 35);

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
