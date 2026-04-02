const { v4: uuidv4 } = require('uuid');
const scoringService = require('./scoring');
const questionsService = require('./questions');

async function processAssessment(pg, answers, userProfile) {
  const client = await pg.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create user profile first
    const profileId = uuidv4();
    await client.query(
      `INSERT INTO user_profiles (id, country, respondent_name, title, ministry_or_department, contact_email, development_stage) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        profileId,
        userProfile.country,
        userProfile.respondent_name,
        userProfile.title || '',
        userProfile.ministry_or_department || '',
        userProfile.contact_email,
        userProfile.development_stage || ''
      ]
    );
    
    // Create assessment linked to user profile
    const assessmentId = uuidv4();
    await client.query(
      'INSERT INTO assessments (id, user_profile_id, created_at) VALUES ($1, $2, NOW()) RETURNING id, created_at',
      [assessmentId, profileId]
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
        'INSERT INTO answers (id, assessment_id, question_id, selected_option, score) VALUES ($1, $2, $3, $4, $5)',
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
      `INSERT INTO results (
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
    
    return {
      assessment_id: assessmentId,
      profile_id: profileId,
      user_profile: userProfile,
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
    FROM results r
    JOIN assessments a ON r.assessment_id = a.id
    LEFT JOIN user_profiles up ON a.user_profile_id = up.id
    WHERE r.assessment_id = $1`,
    [assessmentId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

module.exports = {
  processAssessment,
  getResults
};
