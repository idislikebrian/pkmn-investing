import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface GradingRecommendation {
  cardId: number
  cardName: string
  currentCondition: string
  recommendedGrade: string
  estimatedGrade: number
  confidence: number
  potentialValue: number
  currentValue: number
  roi: number
  reasoning: string[]
  marketDemand: "high" | "medium" | "low"
  turnaroundTime: string
  estimatedCost: number
}

export async function analyzeCardForGrading(cardId: number, userId: number): Promise<GradingRecommendation | null> {
  // Fetch card details
  const [card] = await sql`
    SELECT * FROM cards WHERE id = ${cardId} AND user_id = ${userId}
  `

  if (!card) return null

  // Placeholder AI analysis logic - in production would use ML model
  const estimatedGrade = calculateEstimatedGrade(card.condition)
  const currentValue = card.current_market_price || 0
  const potentialValue = calculateGradedValue(currentValue, estimatedGrade)
  const gradingCost = 50 // Placeholder cost
  const roi = ((potentialValue - currentValue - gradingCost) / (currentValue + gradingCost)) * 100

  const reasoning = generateReasoning(card, estimatedGrade, roi)
  const marketDemand = calculateMarketDemand(card)

  return {
    cardId: card.id,
    cardName: card.name,
    currentCondition: card.condition,
    recommendedGrade: estimatedGrade >= 9 ? "PSA" : estimatedGrade >= 8 ? "BGS" : "CGC",
    estimatedGrade,
    confidence: 85, // Placeholder confidence
    potentialValue,
    currentValue,
    roi,
    reasoning,
    marketDemand,
    turnaroundTime: estimatedGrade >= 9 ? "45-60 days" : "30-45 days",
    estimatedCost: gradingCost,
  }
}

export async function getGradingRecommendations(userId: number, minRoi = 20): Promise<GradingRecommendation[]> {
  const cards = await sql`
    SELECT * FROM cards 
    WHERE user_id = ${userId} 
    AND graded = false
    ORDER BY current_market_price DESC
    LIMIT 50
  `

  const recommendations: GradingRecommendation[] = []

  for (const card of cards) {
    const rec = await analyzeCardForGrading(card.id, userId)
    if (rec && rec.roi >= minRoi) {
      recommendations.push(rec)
    }
  }

  return recommendations.sort((a, b) => b.roi - a.roi)
}

function calculateEstimatedGrade(condition: string): number {
  const gradeMap: Record<string, number> = {
    Mint: 9.5,
    "Near Mint": 8.5,
    Excellent: 7.5,
    Good: 6.5,
    Fair: 5,
    Poor: 3,
  }
  return gradeMap[condition] || 7
}

function calculateGradedValue(currentValue: number, grade: number): number {
  // Multiplier based on grade
  const multipliers: Record<number, number> = {
    10: 3.5,
    9.5: 2.8,
    9: 2.2,
    8.5: 1.7,
    8: 1.4,
    7.5: 1.2,
    7: 1.1,
  }

  const multiplier = multipliers[grade] || 1
  return currentValue * multiplier
}

function generateReasoning(card: any, estimatedGrade: number, roi: number): string[] {
  const reasons: string[] = []

  if (estimatedGrade >= 9) {
    reasons.push("Card condition suggests high grade potential")
  }

  if (roi > 50) {
    reasons.push("Strong ROI potential based on market analysis")
  }

  if (card.current_market_price > 100) {
    reasons.push("High-value card with significant upside when graded")
  }

  if (card.set_name?.includes("Base Set") || card.set_name?.includes("1st Edition")) {
    reasons.push("Vintage/rare set increases graded value premium")
  }

  if (reasons.length === 0) {
    reasons.push("Moderate grading potential based on current condition")
  }

  return reasons
}

function calculateMarketDemand(card: any): "high" | "medium" | "low" {
  if (card.current_market_price > 200) return "high"
  if (card.current_market_price > 50) return "medium"
  return "low"
}
