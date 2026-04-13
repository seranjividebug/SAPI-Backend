const dashboardService = require('../services/dashboard');

async function getDashboardStats(request, reply) {
  try {
    const stats = await dashboardService.getDashboardStats(request.server.pg);

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getAssessments(request, reply) {
  try {
    const { 
      search, 
      country,
      development_stage, 
      score_min, 
      score_max, 
      tier,
      date_from, 
      date_to,
      page = 1, 
      limit = 10 
    } = request.query;

    const filters = {
      search,
      country,
      developmentStage: development_stage,
      scoreMin: score_min ? parseFloat(score_min) : undefined,
      scoreMax: score_max ? parseFloat(score_max) : undefined,
      tier,
      dateFrom: date_from,
      dateTo: date_to,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const assessments = await dashboardService.getAssessmentsList(request.server.pg, filters);

    return {
      success: true,
      data: assessments
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getFilterOptions(request, reply) {
  try {
    const options = await dashboardService.getFilterOptions(request.server.pg);

    return {
      success: true,
      data: options
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

async function exportAssessments(request, reply) {
  try {
    const { format } = request.params;
    
    const filters = {
      search: request.query.search,
      country: request.query.country,
      developmentStage: request.query.development_stage,
      scoreMin: request.query.score_min ? parseFloat(request.query.score_min) : undefined,
      scoreMax: request.query.score_max ? parseFloat(request.query.score_max) : undefined,
      tier: request.query.tier,
      dateFrom: request.query.date_from,
      dateTo: request.query.date_to,
      page: 1,
      limit: 1000 // Get all for export
    };

    const result = await dashboardService.getAssessmentsList(request.server.pg, filters);

    if (format === 'csv') {
      const csv = generateCSV(result.data);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="assessments.csv"');
      return csv;
    } else if (format === 'pdf') {
      // For PDF, return JSON that can be used by frontend PDF library
      return {
        success: true,
        data: {
          assessments: result.data,
          total: result.total
        }
      };
    } else {
      reply.code(400);
      return {
        success: false,
        error: 'Unsupported export format. Use "csv" or "pdf"'
      };
    }
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

function generateCSV(data) {
  const headers = [
    'Assessment ID',
    'Country',
    'Respondent Name',
    'Title',
    'Ministry/Department',
    'Development Stage',
    'SAPI Score',
    'Tier',
    'Date',
    'Compute Capacity',
    'Capital Formation',
    'Regulatory Readiness',
    'Data Sovereignty',
    'Directed Intelligence'
  ];

  // Helper function to escape CSV fields
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const rows = data.map(item => {
    let dateStr = 'N/A';
    if (item.date) {
      try {
        dateStr = new Date(item.date).toISOString().split('T')[0];
      } catch (e) {
        dateStr = 'Invalid Date';
      }
    }
    return [
      item.id || '',
      item.country || '',
      item.respondentName || '',
      item.title || '',
      item.ministry || '',
      item.developmentStage || '',
      item.score || 0,
      item.tier || '',
      dateStr,
      item.dimensionScores?.computeCapacity || 0,
      item.dimensionScores?.capitalFormation || 0,
      item.dimensionScores?.regulatoryReadiness || 0,
      item.dimensionScores?.dataSovereignty || 0,
      item.dimensionScores?.directedIntelligence || 0
    ].map(escapeCSV);
  });

  return [headers.map(escapeCSV).join(','), ...rows.map(row => row.join(','))].join('\n');
}

module.exports = {
  getDashboardStats,
  getAssessments,
  getFilterOptions,
  exportAssessments
};
