// SAPI Composite Score Calculation
// Formula: SAPI Score = D1^0.175 × D2^0.225 × D3^0.175 × D4^0.125 × D5^0.275

const DIMENSION_WEIGHTS = {
  1: 0.175, // Compute Capacity
  2: 0.225, // Capital Formation
  3: 0.175, // Regulatory Readiness
  4: 0.125, // Data Sovereignty
  5: 0.275  // Directed Intelligence Maturity
};

function calculateDimensionScores(answerRecords) {
  const dimensionScores = {
    1: [], // Compute Capacity
    2: [], // Capital Formation
    3: [], // Regulatory Readiness
    4: [], // Data Sovereignty
    5: []  // Directed Intelligence Maturity
  };
  
  // Group scores by dimension
  for (const record of answerRecords) {
    if (dimensionScores[record.dimension]) {
      dimensionScores[record.dimension].push(record.score);
    }
  }
  
  // Calculate average for each dimension
  const averages = {};
  for (let dim = 1; dim <= 5; dim++) {
    const scores = dimensionScores[dim];
    if (scores.length > 0) {
      averages[dim] = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else {
      averages[dim] = 0;
    }
  }
  
  return averages;
}

function calculateSAPIScore(dimensionScores) {
  // Ensure minimum score of 1 to avoid zero multiplication
  const d1 = Math.max(dimensionScores[1] || 1, 1);
  const d2 = Math.max(dimensionScores[2] || 1, 1);
  const d3 = Math.max(dimensionScores[3] || 1, 1);
  const d4 = Math.max(dimensionScores[4] || 1, 1);
  const d5 = Math.max(dimensionScores[5] || 1, 1);
  
  // SAPI Score = D1^0.175 × D2^0.225 × D3^0.175 × D4^0.125 × D5^0.275
  const compositeScore = Math.pow(d1, 0.175) * 
                         Math.pow(d2, 0.225) * 
                         Math.pow(d3, 0.175) * 
                         Math.pow(d4, 0.125) * 
                         Math.pow(d5, 0.275);
  
  return Math.round(compositeScore);
}

function getTier(score) {
  if (score >= 80) {
    return { label: "Sovereign AI Leader", color: "#28A868" };
  }
  if (score >= 60) {
    return { label: "Advanced", color: "#4A7AE0" };
  }
  if (score >= 40) {
    return { label: "Developing", color: "#F0C050" };
  }
  if (score >= 20) {
    return { label: "Nascent", color: "#C9963A" };
  }
  return { label: "Pre-conditions Unmet", color: "#C03058" };
}

module.exports = {
  calculateDimensionScores,
  calculateSAPIScore,
  getTier,
  DIMENSION_WEIGHTS
};
