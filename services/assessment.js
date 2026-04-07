const { v4: uuidv4 } = require('uuid');
const scoringService = require('./scoring');
const questionsService = require('./questions');

async function processAssessment(pg, answers, profileId) {
  const client = await pg.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify profile exists
    const profileCheck = await client.query(
      'SELECT id FROM sapi.user_profiles WHERE id = $1',
      [profileId]
    );
    
    if (profileCheck.rows.length === 0) {
      throw new Error(`Profile with id ${profileId} not found. Create a profile first using POST /api/profile`);
    }
    
    // Create assessment linked to existing user profile
    const assessmentId = uuidv4();
    const now = new Date(); // Use local server time
    await client.query(
      'INSERT INTO sapi.assessments (id, user_profile_id, created_at) VALUES ($1, $2, $3)',
      [assessmentId, profileId, now.toISOString()]
    );
    
    // Store answers and calculate scores
    const answerRecords = [];
    let totalScore = 0;
    
    for (const answer of answers) {
      const question = questionsService.getQuestionById(answer.question_id);
      if (!question) {
        throw new Error(`Question ${answer.question_id} not found`);
      }
      
      // Get score based on selected option
      const scoreMap = {
        'a': question.score_a,
        'b': question.score_b,
        'c': question.score_c,
        'd': question.score_d,
        'e': question.score_e
      };
      
      const score = scoreMap[answer.selected_option.toLowerCase()];
      if (score === null || score === undefined) {
        throw new Error(`Invalid option ${answer.selected_option} for question ${answer.question_id}`);
      }
      
      await client.query(
        'INSERT INTO sapi.answers (id, assessment_id, question_id, selected_option, score) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), assessmentId, answer.question_id, answer.selected_option, score]
      );
      
      answerRecords.push({
        question_id: answer.question_id,
        dimension: question.dimension,
        selected_option: answer.selected_option,
        score: score
      });
      
      totalScore += score;
    }
    
    // Calculate dimension scores
    const dimensionScores = scoringService.calculateDimensionScores(answerRecords);
    
    // Calculate SAPI composite score
    const sapiScore = scoringService.calculateSAPIScore(dimensionScores);
    
    // Determine tier
    const tier = scoringService.getTier(sapiScore);
    
    // Store results
    await client.query(
      `INSERT INTO sapi.results (
        id, assessment_id, compute_capacity, capital_formation, regulatory_readiness, 
        data_sovereignty, directed_intelligence, sapi_score, sapi_tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(),
        assessmentId,
        dimensionScores[1],
        dimensionScores[2],
        dimensionScores[3],
        dimensionScores[4],
        dimensionScores[5],
        sapiScore,
        tier.label
      ]
    );
    
    await client.query('COMMIT');
    
    // Format created_at as UK time using local server time
    const ukFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = ukFormatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    
    return {
      assessment_id: assessmentId,
      profile_id: profileId,
      created_at: createdAtUK,
      compute_capacity: dimensionScores[1],
      capital_formation: dimensionScores[2],
      regulatory_readiness: dimensionScores[3],
      data_sovereignty: dimensionScores[4],
      directed_intelligence: dimensionScores[5],
      sapi_score: sapiScore,
      tier: tier.label
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getResults(pg, assessmentId) {
  const result = await pg.query(
    `SELECT 
      r.compute_capacity,
      r.capital_formation,
      r.regulatory_readiness,
      r.data_sovereignty,
      r.directed_intelligence,
      r.sapi_score,
      r.sapi_tier as tier,
      a.created_at,
      a.user_profile_id,
      up.country,
      up.respondent_name,
      up.title,
      up.ministry_or_department,
      up.contact_email,
      up.development_stage
    FROM sapi.results r
    JOIN sapi.assessments a ON r.assessment_id = a.id
    LEFT JOIN sapi.user_profiles up ON a.user_profile_id = up.id
    WHERE r.assessment_id = $1`,
    [assessmentId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

async function getAssessmentDetails(pg, assessmentId) {
  const client = await pg.connect();
  
  try {
    // Get assessment results with profile info
    const assessmentResult = await client.query(
      `SELECT 
        a.id as assessment_id,
        a.created_at,
        r.compute_capacity,
        r.capital_formation,
        r.regulatory_readiness,
        r.data_sovereignty,
        r.directed_intelligence,
        r.sapi_score,
        r.sapi_tier,
        up.country,
        up.respondent_name,
        up.title,
        up.ministry_or_department,
        up.contact_email,
        up.development_stage
      FROM sapi.assessments a
      JOIN sapi.results r ON a.id = r.assessment_id
      LEFT JOIN sapi.user_profiles up ON a.user_profile_id = up.id
      WHERE a.id = $1`,
      [assessmentId]
    );
    
    if (assessmentResult.rows.length === 0) {
      return null;
    }
    
    const assessment = assessmentResult.rows[0];
    
    // Get all answers with question details
    const answersResult = await client.query(
      `SELECT 
        ans.question_id,
        ans.selected_option,
        ans.score,
        q.dimension,
        q.dimension_name,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.option_e,
        q.score_a,
        q.score_b,
        q.score_c,
        q.score_d,
        q.score_e
      FROM sapi.answers ans
      JOIN sapi.questions q ON ans.question_id = q.id
      WHERE ans.assessment_id = $1
      ORDER BY q.dimension, q.id`,
      [assessmentId]
    );
    
    // Group answers by dimension
    const dimensionQuestions = {};
    answersResult.rows.forEach(row => {
      if (!dimensionQuestions[row.dimension]) {
        dimensionQuestions[row.dimension] = {
          dimension_id: row.dimension,
          dimension_name: row.dimension_name,
          questions: []
        };
      }
      
      const optionText = {
        'a': row.option_a,
        'b': row.option_b,
        'c': row.option_c,
        'd': row.option_d,
        'e': row.option_e
      }[row.selected_option.toLowerCase()];
      
      dimensionQuestions[row.dimension].questions.push({
        question_id: row.question_id,
        question_text: row.question_text,
        selected_option: row.selected_option.toUpperCase(),
        selected_text: optionText,
        score: row.score
      });
    });
    
    // Format created_at as UK time
    const date = new Date(assessment.created_at);
    const ukFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = ukFormatter.formatToParts(date);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    
    return {
      assessment_id: assessment.assessment_id,
      created_at: createdAtUK,
      country: assessment.country,
      respondent_name: assessment.respondent_name,
      title: assessment.title,
      ministry_or_department: assessment.ministry_or_department,
      contact_email: assessment.contact_email,
      development_stage: assessment.development_stage,
      sapi_score: parseFloat(assessment.sapi_score),
      tier: assessment.sapi_tier,
      dimensions: {
        compute_capacity: {
          score: parseFloat(assessment.compute_capacity),
          name: 'Compute Capacity',
          weight: 0.175
        },
        capital_formation: {
          score: parseFloat(assessment.capital_formation),
          name: 'Capital Formation',
          weight: 0.225
        },
        regulatory_readiness: {
          score: parseFloat(assessment.regulatory_readiness),
          name: 'Regulatory Readiness',
          weight: 0.175
        },
        data_sovereignty: {
          score: parseFloat(assessment.data_sovereignty),
          name: 'Data Sovereignty',
          weight: 0.125
        },
        directed_intelligence: {
          score: parseFloat(assessment.directed_intelligence),
          name: 'Directed Intelligence',
          weight: 0.275
        }
      },
      dimension_breakdown: Object.values(dimensionQuestions)
    };
  } finally {
    client.release();
  }
}

module.exports = {
  processAssessment,
  getResults,
  getAssessmentDetails
};
