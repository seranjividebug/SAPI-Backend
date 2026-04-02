// Roadmap Generation Service
// Generates recommendations based on dimension scores

const DIMENSION_NAMES = {
  1: "Compute Capacity",
  2: "Capital Formation",
  3: "Regulatory Readiness",
  4: "Data Sovereignty",
  5: "Directed Intelligence Maturity"
};

// Intervention library by dimension and score band (from requirements)
const INTERVENTIONS = {
  1: { // Compute Capacity
    LOW: [
      "Commission a national compute audit to map current GPU/TPU assets and energy capacity",
      "Engage sovereign cloud providers for initial workload migration",
      "Begin semiconductor supply chain diversification planning"
    ],
    MEDIUM: [
      "Establish a National Compute Authority to coordinate procurement and benchmarking",
      "Secure dedicated energy supply agreements for AI data centres",
      "Launch sovereign cloud migration programme for government workloads"
    ],
    HIGH: [
      "Optimise existing compute for cost-per-inference efficiency",
      "Expand data centre capacity with renewable energy integration",
      "Establish strategic semiconductor stockpile or fabrication alliance"
    ]
  },
  2: { // Capital Formation
    LOW: [
      "Establish a dedicated AI budget line within government R&D",
      "Commission a DFI AI readiness review",
      "Engage sovereign wealth fund leadership on AI infrastructure investment thesis"
    ],
    MEDIUM: [
      "Create a multi-year (5+ year) committed AI infrastructure fund",
      "Establish AI-specific DFI financing vehicles",
      "Launch a domestic AI VC catalytic fund to stimulate private capital"
    ],
    HIGH: [
      "Optimise capital deployment velocity (target < 12 months from commitment to delivery)",
      "Expand SWF AI allocation",
      "Establish export financing for sovereign AI capabilities to allied nations"
    ]
  },
  3: { // Regulatory Readiness
    LOW: [
      "Publish a national AI strategy with measurable objectives and institutional ownership",
      "Establish an advisory AI ethics body",
      "Begin AI-specific legislation consultation"
    ],
    MEDIUM: [
      "Enact AI-specific legislation covering liability and IP",
      "Upgrade AI ethics body to statutory authority",
      "Deploy AI procurement sandboxes",
      "Join ISO/IEC AI standards working groups"
    ],
    HIGH: [
      "Achieve > 60% strategy-to-implementation ratio",
      "Establish centralised AI governance office",
      "Lead international standards development",
      "Institute mandatory algorithmic impact assessment"
    ]
  },
  4: { // Data Sovereignty
    LOW: [
      "Conduct a data residency audit for government workloads",
      "Establish enforceable data localisation requirements for strategic data",
      "Begin government data cataloguing programme"
    ],
    MEDIUM: [
      "Migrate majority of government workloads to sovereign cloud",
      "Implement cross-border data flow controls with enforcement",
      "Launch sovereign AI training data pipeline for priority use cases"
    ],
    HIGH: [
      "Achieve full sovereign cloud coverage for sensitive workloads",
      "Establish comprehensive data governance with real-time cataloguing",
      "Build domestic AI training data supply chain at scale"
    ]
  },
  5: { // Directed Intelligence Maturity
    LOW: [
      "Map all AI pilots to national strategy priorities",
      "Establish a cross-departmental AI coordination working group",
      "Begin systematic outcome measurement for existing deployments"
    ],
    MEDIUM: [
      "Formalise mission alignment: sovereign priorities must drive technology selection",
      "Define human-agent decision ratios per department",
      "Scale pilots to production (target: > 25% conversion rate)"
    ],
    HIGH: [
      "Achieve Intelligence Fabric: real-time AI coordination across government",
      "Institute systematic outcome attribution for all AI deployments",
      "Ensure institutional durability across political transitions"
    ]
  }
};

// Peer comparison benchmarks by development stage
const PEER_BENCHMARKS = {
  early: { median: 35, topQuartile: 55 },
  emerging: { median: 45, topQuartile: 65 },
  developing: { median: 55, topQuartile: 75 },
  advanced: { median: 70, topQuartile: 85 },
  leading: { median: 80, topQuartile: 95 }
};

function getPriorityLevel(score) {
  if (score <= 39) return 'LOW';
  if (score <= 64) return 'MEDIUM';
  return 'HIGH';
}

function determineDevelopmentStage(sapiScore) {
  if (sapiScore < 30) return 'early';
  if (sapiScore < 45) return 'emerging';
  if (sapiScore < 60) return 'developing';
  if (sapiScore < 75) return 'advanced';
  return 'leading';
}

function generatePeerComparison(dimensionScores, sapiScore) {
  const stage = determineDevelopmentStage(sapiScore);
  const benchmarks = PEER_BENCHMARKS[stage];
  
  const comparisons = {};
  for (const [dim, score] of Object.entries(dimensionScores)) {
    const dimNum = parseInt(dim);
    comparisons[dimNum] = {
      dimension_name: DIMENSION_NAMES[dimNum],
      current_score: score,
      peer_median: benchmarks.median,
      peer_top_quartile: benchmarks.topQuartile,
      vs_median: score > benchmarks.median ? 'above' : score < benchmarks.median ? 'below' : 'at',
      vs_top_quartile: score >= benchmarks.topQuartile ? 'in' : 'below',
      gap_to_top: Math.max(0, benchmarks.topQuartile - score)
    };
  }
  
  return {
    development_stage: stage,
    global_median: benchmarks.median,
    top_quartile_threshold: benchmarks.topQuartile,
    dimension_comparisons: comparisons
  };
}

function generateActionPlan(priorityInterventions) {
  const quickWins = [];
  const structural = [];
  const strategic = [];
  
  for (const intervention of priorityInterventions) {
    const level = intervention.priority_level;
    
    if (level === 'LOW') {
      quickWins.push(...intervention.interventions.slice(0, 2).map(i => 
        `${intervention.dimension_name}: ${i}`));
      structural.push(...intervention.interventions.slice(0, 2).map(i => 
        `${intervention.dimension_name}: ${i}`));
      strategic.push(...intervention.interventions.slice(2).map(i => 
        `${intervention.dimension_name}: ${i}`));
    } else if (level === 'MEDIUM') {
      quickWins.push(...intervention.interventions.slice(0, 1).map(i => 
        `${intervention.dimension_name}: ${i}`));
      structural.push(...intervention.interventions.slice(0, 2).map(i => 
        `${intervention.dimension_name}: ${i}`));
      strategic.push(...intervention.interventions.slice(2).map(i => 
        `${intervention.dimension_name}: ${i}`));
    } else {
      quickWins.push(`${intervention.dimension_name}: Review current optimisation metrics`);
      structural.push(...intervention.interventions.slice(0, 2).map(i => 
        `${intervention.dimension_name}: ${i}`));
      strategic.push(...intervention.interventions.slice(2).map(i => 
        `${intervention.dimension_name}: ${i}`));
    }
  }
  
  return {
    quick_wins: {
      timeframe: '3 months',
      actions: [...new Set(quickWins)]
    },
    structural_improvements: {
      timeframe: '6-12 months',
      actions: [...new Set(structural)]
    },
    strategic_initiatives: {
      timeframe: '12-18 months',
      actions: [...new Set(strategic)]
    }
  };
}

function generateRoadmap(dimensionScores, sapiScore) {
  // Step 1: Rank all dimensions by score (ascending)
  const sortedDimensions = Object.entries(dimensionScores)
    .map(([dim, score]) => ({ dimension: parseInt(dim), score }))
    .sort((a, b) => a.score - b.score);
  
  const lowestDimension = sortedDimensions[0];
  const lowestScore = lowestDimension.score;
  
  // Step 2: Generate dimension scorecard with bands
  const scorecard = sortedDimensions.map(dim => ({
    dimension_id: dim.dimension,
    dimension_name: DIMENSION_NAMES[dim.dimension],
    score: Math.round(dim.score),
    priority_level: getPriorityLevel(dim.score),
    band: getPriorityLevel(dim.score) === 'LOW' ? '1–39' : getPriorityLevel(dim.score) === 'MEDIUM' ? '40–64' : '65–100',
    weight: getDimensionWeight(dim.dimension)
  }));
  
  // Step 3: Generate peer comparison
  const peerComparison = generatePeerComparison(dimensionScores, sapiScore);
  
  // Generate priority interventions for all dimensions (ranked)
  const priorityInterventions = [];
  
  for (const dim of sortedDimensions) {
    const level = getPriorityLevel(dim.score);
    const interventions = INTERVENTIONS[dim.dimension][level];
    
    priorityInterventions.push({
      dimension_id: dim.dimension,
      dimension_name: DIMENSION_NAMES[dim.dimension],
      current_score: Math.round(dim.score),
      target_score: Math.min(Math.round(dim.score) + 25, 95),
      priority_level: level,
      rank: sortedDimensions.findIndex(d => d.dimension === dim.dimension) + 1,
      interventions: interventions
    });
  }
  
  // Step 4: Generate 12-18 month action plan
  const actionPlan = generateActionPlan(priorityInterventions.slice(0, 3));
  
  // Generate executive summary
  const summary = generateExecutiveSummary(lowestScore, lowestDimension.dimension, sapiScore);
  
  return {
    executive_summary: summary,
    dimension_scorecard: scorecard,
    peer_comparison: peerComparison,
    priority_interventions: priorityInterventions,
    action_plan: actionPlan,
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

function generateExecutiveSummary(lowestScore, lowestDimension, sapiScore) {
  const dimName = DIMENSION_NAMES[lowestDimension];
  const stage = determineDevelopmentStage(sapiScore);
  
  let summary = `Your nation's SAPI composite score of ${sapiScore.toFixed(1)} places you in the ${stage} stage of sovereign AI development. `;
  
  if (lowestScore <= 39) {
    summary += `${dimName} is your primary constraint with a score of ${lowestScore.toFixed(1)} (Low band: 1–39). `;
    summary += `This significantly limits your geometric mean aggregation. Immediate foundational interventions are required.`;
  } else if (lowestScore <= 64) {
    summary += `${dimName} represents your primary development opportunity at ${lowestScore.toFixed(1)} (Medium band: 40–64). `;
    summary += `Targeted investments here will yield the highest marginal return on sovereign AI capability.`;
  } else {
    summary += `All dimensions show strong maturity with ${dimName} at ${lowestScore.toFixed(1)} (High band: 65–100) as your relative development area. `;
    summary += `Focus on optimisation and international leadership initiatives.`;
  }
  
  return summary;
}

function generateOverallRecommendation(lowestScore) {
  if (lowestScore <= 39) {
    return "URGENT: Implement foundational interventions in the lowest-scoring dimension immediately. Focus on 3-month quick wins and 12-month structural establishment.";
  } else if (lowestScore <= 64) {
    return "PRIORITISE: Focus on medium-term capacity building in identified gaps. Execute 6-12 month structural improvements while planning 12-18 month strategic initiatives.";
  } else {
    return "OPTIMISE: Continue current programmes while addressing refinement opportunities. Consider 12-18 month strategic initiatives for regional leadership.";
  }
}

module.exports = {
  generateRoadmap
};
