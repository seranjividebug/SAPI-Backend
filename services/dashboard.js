// Dashboard Service
// Provides aggregated data for admin dashboard

async function getDashboardStats(pg) {
  const client = await pg.connect();
  try {
    // Total assessments with month-over-month comparison
    const totalQuery = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN a.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as current_month,
        COUNT(CASE WHEN a.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                   AND a.created_at < DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as last_month
      FROM assessments a
    `);

    // Average SAPI score
    const avgScoreQuery = await client.query(`
      SELECT 
        ROUND(AVG(sapi_score)::numeric, 1) as avg_score,
        COUNT(*) FILTER (WHERE a.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as current_month_count,
        ROUND(AVG(sapi_score) FILTER (WHERE a.created_at >= DATE_TRUNC('month', CURRENT_DATE))::numeric, 1) as current_month_avg
      FROM results r
      JOIN assessments a ON r.assessment_id = a.id
    `);

    // Completion rate (assessments with results vs total)
    const completionQuery = await client.query(`
      SELECT 
        ROUND(
          (COUNT(DISTINCT r.assessment_id)::numeric / NULLIF(COUNT(DISTINCT a.id), 0)::numeric) * 100, 
          0
        ) as completion_rate
      FROM assessments a
      LEFT JOIN results r ON a.id = r.assessment_id
    `);

    // Tier distribution for donut chart
    const tierDistribution = await client.query(`
      SELECT 
        sapi_tier as tier,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM results)::numeric * 100, 0) as percentage
      FROM results
      GROUP BY sapi_tier
    `);

    // Top scoring countries
    const topCountries = await client.query(`
      SELECT 
        up.country,
        ROUND(AVG(r.sapi_score)::numeric, 1) as avg_score
      FROM user_profiles up
      JOIN assessments a ON up.id = a.user_profile_id
      JOIN results r ON a.id = r.assessment_id
      GROUP BY up.country
      ORDER BY avg_score DESC
      LIMIT 5
    `);

    return {
      totalAssessments: {
        value: parseInt(totalQuery.rows[0].total) || 0,
        change: calculatePercentageChange(
          parseInt(totalQuery.rows[0].current_month) || 0,
          parseInt(totalQuery.rows[0].last_month) || 0
        )
      },
      avgSapiScore: {
        value: parseFloat(avgScoreQuery.rows[0].avg_score) || 0,
        change: 0 // Simplified - would need previous period comparison
      },
      completionRate: {
        value: parseInt(completionQuery.rows[0].completion_rate) || 0,
        change: 0
      },
      upgradeRequests: {
        value: 4, // Placeholder - would need upgrade requests table
        weeklyNew: 22
      },
      tierDistribution: tierDistribution.rows.map(row => ({
        tier: row.tier,
        count: parseInt(row.count),
        percentage: parseInt(row.percentage)
      })),
      topCountries: topCountries.rows.map(row => ({
        country: row.country,
        score: parseFloat(row.avg_score)
      }))
    };
  } finally {
    client.release();
  }
}

async function getAssessmentsList(pg, filters = {}) {
  const client = await pg.connect();
  try {
    const { 
      search, 
      country, 
      scoreMin, 
      scoreMax, 
      tier,
      dateFrom, 
      dateTo,
      page = 1, 
      limit = 10 
    } = filters;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Search filter (country, respondent name, ministry)
    if (search) {
      whereConditions.push(`(
        LOWER(up.country) LIKE LOWER($${paramIndex}) OR 
        LOWER(up.respondent_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(up.ministry_or_department) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Country filter
    if (country && country !== 'all') {
      whereConditions.push(`up.country = $${paramIndex}`);
      params.push(country);
      paramIndex++;
    }

    // Score range filter
    if (scoreMin !== undefined) {
      whereConditions.push(`r.sapi_score >= $${paramIndex}`);
      params.push(scoreMin);
      paramIndex++;
    }

    if (scoreMax !== undefined) {
      whereConditions.push(`r.sapi_score <= $${paramIndex}`);
      params.push(scoreMax);
      paramIndex++;
    }

    // Tier filter
    if (tier && tier !== 'all') {
      whereConditions.push(`r.sapi_tier = $${paramIndex}`);
      params.push(tier);
      paramIndex++;
    }

    // Date range filter
    if (dateFrom) {
      whereConditions.push(`a.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`a.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Get total count
    const countQuery = await client.query(`
      SELECT COUNT(*) as total
      FROM assessments a
      JOIN user_profiles up ON a.user_profile_id = up.id
      JOIN results r ON a.id = r.assessment_id
      ${whereClause}
    `, params);

    // Get paginated results
    const offset = (page - 1) * limit;
    const paginatedParams = [...params, limit, offset];

    const assessmentsQuery = await client.query(`
      SELECT 
        a.id as assessment_id,
        up.country,
        up.respondent_name,
        up.title,
        up.ministry_or_department,
        r.sapi_score as score,
        r.sapi_tier as tier,
        a.created_at as date,
        r.compute_capacity,
        r.capital_formation,
        r.regulatory_readiness,
        r.data_sovereignty,
        r.directed_intelligence
      FROM assessments a
      JOIN user_profiles up ON a.user_profile_id = up.id
      JOIN results r ON a.id = r.assessment_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, paginatedParams);

    return {
      total: parseInt(countQuery.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(parseInt(countQuery.rows[0].total) / limit),
      data: assessmentsQuery.rows.map(row => ({
        id: row.assessment_id,
        country: row.country,
        respondentName: row.respondent_name,
        title: row.title,
        ministry: row.ministry_or_department,
        score: parseFloat(row.score),
        tier: row.tier,
        date: row.date,
        dimensionScores: {
          computeCapacity: parseFloat(row.compute_capacity),
          capitalFormation: parseFloat(row.capital_formation),
          regulatoryReadiness: parseFloat(row.regulatory_readiness),
          dataSovereignty: parseFloat(row.data_sovereignty),
          directedIntelligence: parseFloat(row.directed_intelligence)
        }
      }))
    };
  } finally {
    client.release();
  }
}

async function getFilterOptions(pg) {
  const client = await pg.connect();
  try {
    // Get unique countries
    const countriesQuery = await client.query(`
      SELECT DISTINCT country 
      FROM user_profiles 
      WHERE country IS NOT NULL 
      ORDER BY country
    `);

    // Get score ranges based on actual data
    const scoreRangeQuery = await client.query(`
      SELECT 
        MIN(sapi_score) as min_score,
        MAX(sapi_score) as max_score
      FROM results
    `);

    // Get unique tiers
    const tiersQuery = await client.query(`
      SELECT DISTINCT sapi_tier as tier
      FROM results
      ORDER BY sapi_tier
    `);

    return {
      countries: countriesQuery.rows.map(r => r.country),
      scoreRange: {
        min: Math.floor(parseFloat(scoreRangeQuery.rows[0].min_score) || 0),
        max: Math.ceil(parseFloat(scoreRangeQuery.rows[0].max_score) || 100)
      },
      tiers: tiersQuery.rows.map(r => r.tier)
    };
  } finally {
    client.release();
  }
}

function calculatePercentageChange(current, previous) {
  if (!previous) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

module.exports = {
  getDashboardStats,
  getAssessmentsList,
  getFilterOptions
};
