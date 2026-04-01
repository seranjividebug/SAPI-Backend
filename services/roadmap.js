// Roadmap Generation Service
// Generates recommendations based on dimension scores

const DIMENSION_NAMES = {
  1: "Compute Capacity",
  2: "Capital Formation",
  3: "Regulatory Readiness",
  4: "Data Sovereignty",
  5: "Directed Intelligence Maturity"
};

const INTERVENTIONS = {
  1: { // Compute Capacity
    LOW: [
      "Establish sovereign AI compute task force with dedicated funding",
      "Conduct national AI infrastructure audit and gap analysis",
      "Develop public-private partnerships for domestic GPU clusters",
      "Create incentives for hyperscalers to build local data centres"
    ],
    MEDIUM: [
      "Expand sovereign capacity with next-generation hardware procurement",
      "Establish AI compute energy security planning",
      "Develop national AI model training facility"
    ],
    HIGH: [
      "Maintain technology refresh cycles for competitive advantage",
      "Export surplus compute capacity to regional allies",
      "Establish AI compute R&D partnerships with domestic universities"
    ]
  },
  2: { // Capital Formation
    LOW: [
      "Establish national AI investment fund with initial £100M+ commitment",
      "Create tax incentives for domestic AI infrastructure investment",
      "Develop sovereign wealth fund AI allocation policy",
      "Launch public-private AI investment partnership programme"
    ],
    MEDIUM: [
      "Scale AI fund to £500M+ with multi-year budget certainty",
      "Establish AI venture capital co-investment programme",
      "Create pension fund AI infrastructure allocation guidelines"
    ],
    HIGH: [
      "Develop export financing for AI technology transfer",
      "Establish regional AI investment hub status",
      "Create AI infrastructure green bond programme"
    ]
  },
  3: { // Regulatory Readiness
    LOW: [
      "Draft national AI governance framework with stakeholder consultation",
      "Designate interim AI oversight body within existing regulator",
      "Establish AI risk classification working group",
      "Develop AI incident reporting pilot programme"
    ],
    MEDIUM: [
      "Enact comprehensive AI legislation with enforcement powers",
      "Establish dedicated AI regulator with licensing authority",
      "Implement sector-specific AI regulations for critical sectors",
      "Launch AI standards certification programme"
    ],
    HIGH: [
      "Develop international AI governance leadership initiatives",
      "Export regulatory frameworks to allied nations",
      "Establish AI regulatory sandbox for emerging technologies"
    ]
  },
  4: { // Data Sovereignty
    LOW: [
      "Enact comprehensive data residency legislation",
      "Establish sovereign cloud procurement requirements",
      "Develop cross-border data transfer governance framework",
      "Create national data catalogue initiative"
    ],
    MEDIUM: [
      "Implement air-gapped computing environments for strategic workloads",
      "Establish whole-of-government data governance framework",
      "Deploy sovereign AI training data pipeline",
      "Create data quality management standards"
    ],
    HIGH: [
      "Develop regional data sharing agreements with allies",
      "Establish data sovereignty certification programme",
      "Create data commons for non-sensitive AI training datasets"
    ]
  },
  5: { // Directed Intelligence Maturity
    LOW: [
      "Map national AI initiatives to sovereign priority areas",
      "Establish cross-departmental AI coordination body",
      "Develop AI outcome measurement framework",
      "Create human-agent decision governance guidelines"
    ],
    MEDIUM: [
      "Implement systematic AI production deployment programme",
      "Establish formal AI coordination with shared budgets",
      "Deploy comprehensive outcome attribution across all AI systems",
      "Create institutional durability protocols for AI programmes"
    ],
    HIGH: [
      "Export AI deployment expertise to developing nations",
      "Establish international AI coordination leadership",
      "Create AI-first government transformation academy"
    ]
  }
};

function getPriorityLevel(score) {
  if (score <= 39) return 'LOW';
  if (score <= 64) return 'MEDIUM';
  return 'HIGH';
}

function generateRoadmap(dimensionScores) {
  // Find lowest scoring dimensions
  const sortedDimensions = Object.entries(dimensionScores)
    .map(([dim, score]) => ({ dimension: parseInt(dim), score }))
    .sort((a, b) => a.score - b.score);
  
  const lowestDimension = sortedDimensions[0];
  const lowestScore = lowestDimension.score;
  
  // Generate dimension scorecard
  const scorecard = sortedDimensions.map(dim => ({
    dimension_id: dim.dimension,
    dimension_name: DIMENSION_NAMES[dim.dimension],
    score: Math.round(dim.score),
    priority_level: getPriorityLevel(dim.score),
    weight: getDimensionWeight(dim.dimension)
  }));
  
  // Generate priority interventions (focus on lowest 2 dimensions)
  const priorityInterventions = [];
  const targetDimensions = sortedDimensions.slice(0, 2);
  
  for (const dim of targetDimensions) {
    const level = getPriorityLevel(dim.score);
    const interventions = INTERVENTIONS[dim.dimension][level];
    
    priorityInterventions.push({
      dimension_id: dim.dimension,
      dimension_name: DIMENSION_NAMES[dim.dimension],
      current_score: Math.round(dim.score),
      target_score: Math.min(Math.round(dim.score) + 25, 95),
      priority_level: level,
      interventions: interventions
    });
  }
  
  // Generate executive summary
  const summary = generateExecutiveSummary(lowestScore, lowestDimension.dimension);
  
  return {
    executive_summary: summary,
    dimension_scorecard: scorecard,
    priority_interventions: priorityInterventions,
    overall_recommendation: generateOverallRecommendation(lowestScore)
  };
}

function getDimensionWeight(dimension) {
  const weights = {
    1: "17.5%",
    2: "22.5%",
    3: "17.5%",
    4: "12.5%",
    5: "27.5%"
  };
  return weights[dimension];
}

function generateExecutiveSummary(lowestScore, lowestDimension) {
  const dimName = DIMENSION_NAMES[lowestDimension];
  
  if (lowestScore <= 39) {
    return `Your nation's SAPI assessment reveals significant gaps in ${dimName}, which is constraining your overall Sovereign AI readiness. Priority focus should be placed on establishing foundational capabilities in this dimension before advancing others. Immediate intervention is recommended to prevent widening the capability gap with peer nations.`;
  } else if (lowestScore <= 64) {
    return `Your SAPI assessment indicates moderate maturity across most dimensions, with ${dimName} representing your primary development opportunity. Targeted investments in this dimension will yield the highest marginal return on sovereign AI capability. A structured improvement programme is recommended.`;
  } else {
    return `Your nation demonstrates strong Sovereign AI maturity with ${dimName} as your relative development area. Maintain current trajectories in high-performing dimensions while optimizing the identified opportunity for comprehensive capability consolidation.`;
  }
}

function generateOverallRecommendation(lowestScore) {
  if (lowestScore <= 39) {
    return "URGENT: Implement foundational interventions in the lowest-scoring dimension immediately. Consider establishing a sovereign AI task force with executive sponsorship.";
  } else if (lowestScore <= 64) {
    return "PRIORITISE: Focus on medium-term capacity building in identified gaps. Establish dedicated budget lines and accountability frameworks.";
  } else {
    return "OPTIMISE: Continue current programmes while addressing refinement opportunities. Consider international leadership initiatives.";
  }
}

module.exports = {
  generateRoadmap
};
