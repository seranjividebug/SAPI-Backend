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
      // Dark blue background
doc.fillColor('#0F0830').rect(0, 0, doc.page.width, doc.page.height).fill();

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
  doc.image('assets/sapi-logo.png', 28, headerY, { width: logoSize, height: logoSize });
} catch (e) {
  // Fallback globe: outer circle + inner lines
  doc.circle(54, headerY + 26, 22).stroke('#ffffff').lineWidth(1.2);
  doc.ellipse(54, headerY + 26, 11, 22).stroke('#ffffff').lineWidth(0.8);
  doc.moveTo(32, headerY + 26).lineTo(76, headerY + 26).stroke('#ffffff').lineWidth(0.8);
  doc.moveTo(32, headerY + 18).lineTo(76, headerY + 18).stroke('#ffffff').lineWidth(0.5);
  doc.moveTo(32, headerY + 34).lineTo(76, headerY + 34).stroke('#ffffff').lineWidth(0.5);
}

// Header text
doc.font('Times-Roman').fontSize(11).fillColor('#FBF5E6')
  .text('THE SOVEREIGN AI POWER INDEX', 92, headerY + 14);
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
  .text('SOVEREIGN AI ASSESSMENT PLATFORM', 92, headerY + 30);

// Gold line under header
doc.moveTo(28, headerY + 52).lineTo(doc.page.width - 28, headerY + 52)
  .stroke('#C9963A').lineWidth(0.8);

// === MAIN TITLE (left-aligned, medium weight) ===
const titleY = 220;
doc.font('Times-Roman').fontSize(38).fillColor('#FBF5E6')
  .text('THE SOVEREIGN AI', 130, titleY, { align: 'left' });
doc.font('Times-Roman').fontSize(38).fillColor('#FBF5E6')
  .text('POWER INDEX', 130, titleY + 48, { align: 'left' });

// Subtitle
doc.font('Helvetica').fontSize(11).fillColor('#FBF5E6')
  .text('TIER 1 SELF-ASSESSMENT REPORT', 130, titleY + 100);

// Gold line under subtitle
doc.moveTo(130, titleY + 122).lineTo(400, titleY + 122)
  .stroke('#C9963A').lineWidth(0.8);

// === AUTHOR SECTION — right side with gold vertical line ===
const authorLineX = 348;
const authorY = 370;

// Gold vertical line
doc.moveTo(authorLineX, authorY - 10).lineTo(authorLineX, authorY + 90)
  .stroke('#C9963A').lineWidth(1);

// Author text — right of vertical line (dynamic from assessment data)
doc.font('Times-Roman').fontSize(12).fillColor('#FBF5E6')
  .text(assessmentData.author_name || 'H.E. Dr. Khalid Al-Mansouri', authorLineX + 12, authorY);
doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6')
  .text(assessmentData.author_position || 'Minister for Digital Infrastructure', authorLineX + 12, authorY + 20);
doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6')
  .text(assessmentData.author_ministry || 'Ministry of Digital Economy & AI', authorLineX + 12, authorY + 36);
doc.font('Times-Roman').fontSize(9).fillColor('#C9963A')
  .text(assessmentData.country || 'United Arab Emirates', authorLineX + 12, authorY + 52);

// === FOOTER ===
const footerY = 750;
doc.moveTo(28, footerY).lineTo(doc.page.width - 28, footerY)
  .stroke('#C9963A').lineWidth(0.8);

// Generated date — bottom left, grey
const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
  .text(`Generated: ${currentDate}`, 28, footerY + 18);

// Footer row
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('© 2026 The Sovereign AI Power Index', 28, footerY + 35);
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('sapi.ai', doc.page.width / 2 - 15, footerY + 35);
doc.font('Helvetica').fontSize(7.5).fillColor('#FBF5E6')
  .text('Classification: Restricted', doc.page.width - 140, footerY + 35);

// Page number
doc.font('Times-Roman').fontSize(9).fillColor('#FBF5E6')
  .text('1', doc.page.width - 35, footerY + 33);
      // Add second page for Executive Summary
      doc.addPage({ size: 'A4', margin: 0 });

      // Set background for second page
      doc.fillColor('#0F0830').rect(0, 0, doc.page.width, doc.page.height).fill();

      // Executive Summary Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FBF5E6').text('EXECUTIVE SUMMARY', 60, 50);
      doc.moveTo(60, 70).lineTo(200, 70).stroke('#C9963A').lineWidth(1);

      // Score display
      doc.font('Helvetica-Bold').fontSize(50).fillColor('#C9963A').text(sapiScore, 60, 100);
      doc.font('Helvetica').fontSize(18).fillColor('#FBF5E6').text('/100', 170, 125);

      // Status badge
      const statusText = tier === 'DEVELOPING' ? 'DEVELOPING SOVEREIGN AI CAPACITY' : tier + ' SOVEREIGN AI CAPACITY';
      doc.rect(60, 170, 300, 20).fill('#1A1540');
      doc.font('Helvetica').fontSize(10).fillColor('#C9963A').text(statusText, 70, 176);

      // Description paragraph
      const description = "Your nation's AI infrastructure reflects structured effort across select dimensions, with identifiable constraints in capital formation and compute sovereignty that limit composite readiness. Closing these gaps requires deliberate prioritisation rather than broad-spectrum investment.";
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text(description, 60, 210, {
        width: 480,
        align: 'left'
      });

      // Dimension Readiness Overview
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#FBF5E6').text('DIMENSION READINESS OVERVIEW', 60, 310);
      doc.moveTo(60, 325).lineTo(250, 325).stroke('#C9963A').lineWidth(1);

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
        doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text(dim.name, startX + maxBarWidth + 20, y + 5);

        // Score and status
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#FBF5E6').text(dim.score.toString(), startX + maxBarWidth + 200, y + 5);
        doc.font('Helvetica').fontSize(9).fillColor('#FBF5E6').text(dim.status, startX + maxBarWidth + 240, y + 6);
      });

      // Note about dimension scores
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Dimension scores are calculated based on weighted indicators across infrastructure, policy, and implementation maturity.', 60, 540, {
        width: 480,
        align: 'left'
      });

      // Footer for second page
      const footerY2 = 750;
      doc.moveTo(60, footerY2).lineTo(535, footerY2).stroke('#C9963A').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', 60, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', doc.page.width / 2 - 20, footerY2 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', 480, footerY2 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('2', 480, footerY2 + 35);

      // Add third page for Dimension Scorecard
     // Add third page for Dimension Scorecard
doc.addPage({ size: 'A4', margin: 0 });
doc.fillColor('#0F0830').rect(0, 0, doc.page.width, doc.page.height).fill();

// Right panel background (Priority Interventions)
const rightPanelX = 375;
doc.fillColor('#1A1540').rect(rightPanelX, 0, doc.page.width - rightPanelX, doc.page.height).fill();
// Gold vertical separator line
doc.moveTo(rightPanelX, 0).lineTo(rightPanelX, doc.page.height).stroke('#C9963A').lineWidth(1);

// === LEFT SECTION HEADER ===
doc.font('Helvetica-Bold').fontSize(16).fillColor('#FBF5E6').text('DIMENSION SCORECARD', 25, 22);
doc.moveTo(25, 42).lineTo(200, 42).stroke('#C9963A').lineWidth(1.5);

// === RIGHT SECTION HEADER ===
doc.font('Helvetica-Bold').fontSize(9).fillColor('#FBF5E6').text('PRIORITY INTERVENTIONS', rightPanelX + 15, 22);
doc.moveTo(rightPanelX + 15, 37).lineTo(doc.page.width - 15, 37).stroke('#C9963A').lineWidth(1);

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
  doc.fillColor('#1A1540').rect(cardX, y, cardWidth, cardHeight).fill();

  // Left colored vertical strip
  doc.fillColor(barColor).rect(cardX, y, 4, cardHeight).fill();

  // Top row: "D1 — Compute Capacity" on left, score on right
  const titleX = cardX + 14;
  const scoreX = cardX + cardWidth - 55;

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#FBF5E6')
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
  doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6')
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
  doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text(item.description, pX, pY, { width: pWidth, lineGap: 1 });
  pY += 50;
});

// Footer for third page
const footerY3 = 750;
doc.moveTo(28, footerY3).lineTo(doc.page.width - 28, footerY3).stroke('#C9963A').lineWidth(1);
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', 28, footerY3 + 12);
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', doc.page.width / 2 - 20, footerY3 + 12);
doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', doc.page.width - 140, footerY3 + 12);
doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('3', doc.page.width - 35, footerY3 + 30);
      // Add fourth page for 12-18 Month Sovereign AI Roadmap
      doc.addPage({ size: 'A4', margin: 0 });

      // Set background for fourth page
      doc.fillColor('#0F0830').rect(0, 0, doc.page.width, doc.page.height).fill();

      // Roadmap Header
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FBF5E6').text('12-18 MONTH SOVEREIGN AI ROADMAP', 60, 50);
      doc.moveTo(60, 70).lineTo(535, 70).stroke('#C9963A').lineWidth(1);

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
      doc.rect(60, 470, 515, 80).fill('#14142b').stroke('#C9963A').lineWidth(1);
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#FBF5E6').text('UNLOCK DEEPER DIAGNOSTIC CAPABILITY', 80, 490);
      
      const capabilityText = 'Access comprehensive sovereign AI development analytics, benchmark against peer nations, and receive tailored intervention strategies through our premium diagnostic platform.';
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text(capabilityText, 80, 510, {
        width: 460,
        align: 'left'
      });

      // CTA button
      doc.rect(80, 540, 180, 15).fill('#d4a520');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#FBF5E6').text('REQUEST PREMIUM ACCESS', 90, 543);

      // Footer for fourth page
      const footerY4 = 750;
      doc.moveTo(60, footerY4).lineTo(535, footerY4).stroke('#C9963A').lineWidth(1);
      
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('© 2025 The Sovereign AI Power Index', 60, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('sapi.ai', doc.page.width / 2 - 20, footerY4 + 15);
      doc.font('Helvetica').fontSize(8).fillColor('#FBF5E6').text('Classification: Restricted', 480, footerY4 + 15);
      doc.font('Helvetica').fontSize(10).fillColor('#FBF5E6').text('4', 480, footerY4 + 35);

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
