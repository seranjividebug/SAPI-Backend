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
    'Country',
    'Respondent Name',
    'Title',
    'Ministry/Department',
    'SAPI Score',
    'Tier',
    'Date',
    'Compute Capacity',
    'Capital Formation',
    'Regulatory Readiness',
    'Data Sovereignty',
    'Directed Intelligence'
  ];

  const rows = data.map(item => [
    item.country,
    item.respondentName,
    item.title,
    item.ministry,
    item.score,
    item.tier,
    new Date(item.date).toISOString().split('T')[0],
    item.dimensionScores.computeCapacity,
    item.dimensionScores.capitalFormation,
    item.dimensionScores.regulatoryReadiness,
    item.dimensionScores.dataSovereignty,
    item.dimensionScores.directedIntelligence
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

module.exports = {
  getDashboardStats,
  getAssessments,
  getFilterOptions,
  exportAssessments
};
