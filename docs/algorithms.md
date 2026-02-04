# Food Service Platform - Core Algorithms & Functions

This document details the computational algorithms and business logic functions required to power the agentic food service management platform.

---

## Table of Contents

1. [Forecasting & Demand Prediction](#1-forecasting--demand-prediction)
2. [Menu Planning & Optimization](#2-menu-planning--optimization)
3. [Recipe Scaling & Costing](#3-recipe-scaling--costing)
4. [Inventory Management](#4-inventory-management)
5. [Production Scheduling](#5-production-scheduling)
6. [Dietary Compliance](#6-dietary-compliance)
7. [Waste Prediction & Reduction](#7-waste-prediction--reduction)
8. [Procurement Optimization](#8-procurement-optimization)

---

## 1. Forecasting & Demand Prediction

### 1.1 Census Forecasting

Predicts total number of diners for a given meal period.

```typescript
interface CensusForecast {
  date: Date;
  mealPeriod: string;
  siteId: string;
  predictedCount: number;
  confidenceInterval: [number, number];
  factors: AdjustmentFactor[];
}

interface AdjustmentFactor {
  name: string;           // 'weather', 'holiday', 'event', 'day_of_week'
  impact: number;         // multiplier (e.g., 0.85 for 15% reduction)
  confidence: number;     // 0-1 confidence in this factor
}
```

**Algorithm: Exponential Smoothing with Adjustments**

```typescript
function forecastCensus(
  historicalData: DailyCensus[],
  targetDate: Date,
  mealPeriod: string,
  siteId: string
): CensusForecast {
  // 1. Calculate base forecast using exponential smoothing
  const alpha = 0.3; // smoothing factor (higher = more weight on recent)
  let forecast = historicalData[0].count;
  
  for (const day of historicalData) {
    forecast = alpha * day.count + (1 - alpha) * forecast;
  }
  
  // 2. Apply day-of-week seasonality
  const dayOfWeek = targetDate.getDay();
  const dayMultiplier = calculateDayOfWeekIndex(historicalData, dayOfWeek);
  forecast *= dayMultiplier;
  
  // 3. Apply adjustment factors
  const factors = getAdjustmentFactors(targetDate, siteId);
  for (const factor of factors) {
    forecast *= factor.impact;
  }
  
  // 4. Calculate confidence interval based on historical variance
  const variance = calculateVariance(historicalData);
  const stdDev = Math.sqrt(variance);
  
  return {
    date: targetDate,
    mealPeriod,
    siteId,
    predictedCount: Math.round(forecast),
    confidenceInterval: [
      Math.round(forecast - 1.96 * stdDev),
      Math.round(forecast + 1.96 * stdDev)
    ],
    factors
  };
}
```

### 1.2 Menu Item Selection Forecasting

Predicts how many diners will select each menu item.

```typescript
interface ItemForecast {
  recipeId: string;
  predictedPortions: number;
  selectionRate: number;      // percentage of diners expected to select
  historicalAverage: number;
  popularityTrend: 'rising' | 'stable' | 'declining';
}

function forecastMenuItemSelection(
  recipeId: string,
  totalCensus: number,
  menuPosition: MenuPosition,
  historicalSelections: SelectionHistory[]
): ItemForecast {
  // 1. Calculate base selection rate from history
  const baseRate = calculateAverageSelectionRate(historicalSelections);
  
  // 2. Apply menu position effects
  // - First item in category gets ~15% boost
  // - Items with "Choice" designation split demand
  const positionMultiplier = getPositionMultiplier(menuPosition);
  
  // 3. Apply competition effects (how many alternatives?)
  const competitionFactor = 1 / menuPosition.alternativesCount;
  
  // 4. Apply recency effect (was this served recently?)
  const recencyPenalty = calculateRecencyPenalty(recipeId, historicalSelections);
  
  // 5. Calculate final selection rate
  const adjustedRate = baseRate * positionMultiplier * competitionFactor * recencyPenalty;
  
  // 6. Apply to census
  const predictedPortions = Math.round(totalCensus * adjustedRate);
  
  return {
    recipeId,
    predictedPortions,
    selectionRate: adjustedRate,
    historicalAverage: baseRate,
    popularityTrend: calculateTrend(historicalSelections)
  };
}
```

### 1.3 Moving Average Methods

```typescript
// Simple Moving Average
function simpleMovingAverage(data: number[], periods: number): number {
  const recent = data.slice(-periods);
  return recent.reduce((sum, val) => sum + val, 0) / recent.length;
}

// Weighted Moving Average (more weight on recent)
function weightedMovingAverage(data: number[], weights: number[]): number {
  const recent = data.slice(-weights.length);
  let weightedSum = 0;
  let weightTotal = 0;
  
  for (let i = 0; i < recent.length; i++) {
    weightedSum += recent[i] * weights[i];
    weightTotal += weights[i];
  }
  
  return weightedSum / weightTotal;
}

// Double Exponential Smoothing (Holt's method) - captures trends
function holtForecast(
  data: number[],
  alpha: number,  // level smoothing
  beta: number,   // trend smoothing
  periodsAhead: number
): number {
  let level = data[0];
  let trend = data[1] - data[0];
  
  for (let i = 1; i < data.length; i++) {
    const newLevel = alpha * data[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    trend = newTrend;
  }
  
  return level + periodsAhead * trend;
}
```

---

## 2. Menu Planning & Optimization

### 2.1 Protein Spreading Algorithm

Ensures variety in protein sources across the menu cycle.

```typescript
interface ProteinCategory {
  id: string;
  name: string;           // 'Beef', 'Poultry', 'Pork', 'Seafood', 'Vegetarian'
  minDaysBetween: number; // minimum days before repeating
  maxPerWeek: number;     // maximum appearances per week
}

interface ProteinSpreadResult {
  isValid: boolean;
  violations: ProteinViolation[];
  suggestions: ProteinSuggestion[];
  varietyScore: number;   // 0-100
}

function analyzeProteinSpread(
  menuItems: MenuItemWithRecipe[],
  cycleWeeks: number
): ProteinSpreadResult {
  const proteinCategories: ProteinCategory[] = [
    { id: 'beef', name: 'Beef', minDaysBetween: 2, maxPerWeek: 2 },
    { id: 'poultry', name: 'Poultry', minDaysBetween: 1, maxPerWeek: 3 },
    { id: 'pork', name: 'Pork', minDaysBetween: 2, maxPerWeek: 2 },
    { id: 'seafood', name: 'Seafood', minDaysBetween: 2, maxPerWeek: 2 },
    { id: 'vegetarian', name: 'Vegetarian', minDaysBetween: 0, maxPerWeek: 7 }
  ];
  
  const violations: ProteinViolation[] = [];
  const proteinByDay = mapProteinsByDay(menuItems);
  
  // Check each protein category
  for (const category of proteinCategories) {
    const appearances = getAppearances(proteinByDay, category.id);
    
    // Check minimum days between
    for (let i = 1; i < appearances.length; i++) {
      const daysBetween = appearances[i].day - appearances[i-1].day;
      if (daysBetween < category.minDaysBetween) {
        violations.push({
          type: 'too_close',
          protein: category.name,
          day1: appearances[i-1].day,
          day2: appearances[i].day,
          message: `${category.name} appears on day ${appearances[i-1].day} and ${appearances[i].day} (min ${category.minDaysBetween} days apart)`
        });
      }
    }
    
    // Check max per week
    for (let week = 1; week <= cycleWeeks; week++) {
      const weekAppearances = appearances.filter(a => a.week === week);
      if (weekAppearances.length > category.maxPerWeek) {
        violations.push({
          type: 'too_frequent',
          protein: category.name,
          week,
          count: weekAppearances.length,
          message: `${category.name} appears ${weekAppearances.length} times in week ${week} (max ${category.maxPerWeek})`
        });
      }
    }
  }
  
  // Calculate variety score
  const varietyScore = calculateProteinVarietyScore(proteinByDay, cycleWeeks);
  
  // Generate suggestions for violations
  const suggestions = generateProteinSwapSuggestions(violations, menuItems);
  
  return {
    isValid: violations.length === 0,
    violations,
    suggestions,
    varietyScore
  };
}

function calculateProteinVarietyScore(
  proteinByDay: Map<number, string[]>,
  cycleWeeks: number
): number {
  const totalDays = cycleWeeks * 7;
  const categories = ['beef', 'poultry', 'pork', 'seafood', 'vegetarian'];
  
  // Ideal distribution (equal representation)
  const idealPerCategory = totalDays / categories.length;
  
  // Actual distribution
  const counts = new Map<string, number>();
  for (const [_, proteins] of proteinByDay) {
    for (const protein of proteins) {
      counts.set(protein, (counts.get(protein) || 0) + 1);
    }
  }
  
  // Calculate deviation from ideal
  let totalDeviation = 0;
  for (const category of categories) {
    const actual = counts.get(category) || 0;
    totalDeviation += Math.abs(actual - idealPerCategory);
  }
  
  // Convert to 0-100 score (lower deviation = higher score)
  const maxDeviation = idealPerCategory * categories.length;
  return Math.round(100 * (1 - totalDeviation / maxDeviation));
}
```

### 2.2 Color Balance Analysis

Ensures visual appeal of plated meals.

```typescript
interface ColorProfile {
  primary: FoodColor;
  secondary: FoodColor[];
}

type FoodColor = 'red' | 'orange' | 'yellow' | 'green' | 'white' | 'brown' | 'purple';

interface ColorBalanceResult {
  score: number;          // 0-100
  issues: ColorIssue[];
  suggestions: string[];
}

function analyzeColorBalance(
  mealComponents: RecipeWithColor[]  // entrée, starch, vegetable, etc.
): ColorBalanceResult {
  const colors = mealComponents.map(c => c.primaryColor);
  const issues: ColorIssue[] = [];
  
  // Rule 1: Avoid monochromatic meals
  const uniqueColors = new Set(colors);
  if (uniqueColors.size < 3) {
    issues.push({
      type: 'monochromatic',
      message: 'Meal lacks color variety - only has ' + [...uniqueColors].join(', ')
    });
  }
  
  // Rule 2: Should include at least one vibrant color (not brown/white)
  const vibrantColors = ['red', 'orange', 'yellow', 'green', 'purple'];
  const hasVibrant = colors.some(c => vibrantColors.includes(c));
  if (!hasVibrant) {
    issues.push({
      type: 'dull',
      message: 'Meal needs a vibrant color accent'
    });
  }
  
  // Rule 3: Green should appear (vegetable presence)
  if (!colors.includes('green')) {
    issues.push({
      type: 'missing_green',
      message: 'Consider adding a green vegetable for visual appeal and nutrition'
    });
  }
  
  // Calculate score
  let score = 100;
  score -= issues.filter(i => i.type === 'monochromatic').length * 30;
  score -= issues.filter(i => i.type === 'dull').length * 20;
  score -= issues.filter(i => i.type === 'missing_green').length * 15;
  
  // Generate suggestions
  const suggestions = generateColorSuggestions(mealComponents, issues);
  
  return {
    score: Math.max(0, score),
    issues,
    suggestions
  };
}
```

### 2.3 Cuisine Diversity Checker

```typescript
interface CuisineDiversityResult {
  score: number;
  distribution: Map<string, number>;  // cuisine -> count
  suggestions: string[];
}

function analyzeCuisineDiversity(
  weekMenu: MenuItemWithRecipe[],
  targetDiversity: number = 4  // minimum different cuisines per week
): CuisineDiversityResult {
  const cuisineCounts = new Map<string, number>();
  
  for (const item of weekMenu) {
    if (item.recipe.cuisineType) {
      const current = cuisineCounts.get(item.recipe.cuisineType) || 0;
      cuisineCounts.set(item.recipe.cuisineType, current + 1);
    }
  }
  
  const uniqueCuisines = cuisineCounts.size;
  const score = Math.min(100, Math.round((uniqueCuisines / targetDiversity) * 100));
  
  const suggestions: string[] = [];
  if (uniqueCuisines < targetDiversity) {
    const missingCuisines = getAllCuisines().filter(c => !cuisineCounts.has(c));
    suggestions.push(`Consider adding ${missingCuisines.slice(0, 3).join(', ')} dishes`);
  }
  
  // Check for over-representation
  const totalItems = weekMenu.length;
  for (const [cuisine, count] of cuisineCounts) {
    if (count / totalItems > 0.4) {
      suggestions.push(`${cuisine} cuisine is over-represented (${Math.round(count/totalItems*100)}%)`);
    }
  }
  
  return {
    score,
    distribution: cuisineCounts,
    suggestions
  };
}
```

### 2.4 Diet Extension Generator

Automatically creates modified versions of menu items for therapeutic diets.

```typescript
interface DietExtension {
  baseDietId: string;           // 'DIET-REG'
  targetDietId: string;         // 'DIET-LOWNA'
  modifications: Modification[];
  isAutoGenerated: boolean;
  requiresReview: boolean;
}

interface Modification {
  type: 'substitute' | 'omit' | 'reduce' | 'prepare_differently';
  originalIngredient?: string;
  replacement?: string;
  instruction: string;
}

function generateDietExtensions(
  recipe: Recipe,
  targetDiet: DietType
): DietExtension | null {
  const modifications: Modification[] = [];
  
  switch (targetDiet.dietTypeId) {
    case 'DIET-LOWNA':
      modifications.push(...generateLowSodiumMods(recipe));
      break;
    case 'DIET-DIAB':
      modifications.push(...generateDiabeticMods(recipe));
      break;
    case 'DIET-GF':
      modifications.push(...generateGlutenFreeMods(recipe));
      break;
    case 'DIET-RENAL':
      modifications.push(...generateRenalMods(recipe));
      break;
    case 'DIET-PUREED':
      modifications.push(...generatePureedMods(recipe));
      break;
    // ... other diets
  }
  
  if (modifications.length === 0) {
    // Recipe is already suitable
    return null;
  }
  
  return {
    baseDietId: 'DIET-REG',
    targetDietId: targetDiet.dietTypeId,
    modifications,
    isAutoGenerated: true,
    requiresReview: modifications.some(m => m.type === 'substitute')
  };
}

function generateLowSodiumMods(recipe: Recipe): Modification[] {
  const mods: Modification[] = [];
  
  // Check each ingredient for sodium content
  for (const ingredient of recipe.ingredients) {
    if (isHighSodium(ingredient)) {
      if (hasLowSodiumAlternative(ingredient)) {
        mods.push({
          type: 'substitute',
          originalIngredient: ingredient.name,
          replacement: getLowSodiumAlternative(ingredient),
          instruction: `Use ${getLowSodiumAlternative(ingredient)} instead of ${ingredient.name}`
        });
      } else {
        mods.push({
          type: 'omit',
          originalIngredient: ingredient.name,
          instruction: `Omit ${ingredient.name}`
        });
      }
    }
  }
  
  // Add general low-sodium instructions
  mods.push({
    type: 'prepare_differently',
    instruction: 'Do not add salt during cooking. Season with herbs and lemon.'
  });
  
  return mods;
}

function generatePureedMods(recipe: Recipe): Modification[] {
  return [{
    type: 'prepare_differently',
    instruction: `After cooking, puree all components to smooth consistency. 
                  Add broth or sauce as needed to achieve proper texture.
                  Ensure no lumps remain. Mold if desired for presentation.`
  }];
}
```

### 2.5 Menu Cost Optimizer

```typescript
interface CostOptimizationResult {
  currentCost: number;
  targetCost: number;
  optimizedMenu: OptimizedMenuItem[];
  totalSavings: number;
  substitutions: Substitution[];
}

interface Substitution {
  originalRecipeId: string;
  suggestedRecipeId: string;
  costDifference: number;
  nutritionalImpact: string;
  reason: string;
}

function optimizeMenuCost(
  menu: MenuItemWithCost[],
  targetCostPerMeal: number,
  constraints: OptimizationConstraints
): CostOptimizationResult {
  const currentCost = calculateAverageMealCost(menu);
  
  if (currentCost <= targetCostPerMeal) {
    return {
      currentCost,
      targetCost: targetCostPerMeal,
      optimizedMenu: menu,
      totalSavings: 0,
      substitutions: []
    };
  }
  
  // Sort items by cost (highest first)
  const sortedByOverage = menu
    .filter(item => item.costPerPortion > targetCostPerMeal * 1.2)
    .sort((a, b) => b.costPerPortion - a.costPerPortion);
  
  const substitutions: Substitution[] = [];
  
  for (const expensiveItem of sortedByOverage) {
    // Find cheaper alternatives in same category
    const alternatives = findAlternativeRecipes(
      expensiveItem.recipe,
      constraints,
      targetCostPerMeal
    );
    
    if (alternatives.length > 0) {
      const best = alternatives[0];
      substitutions.push({
        originalRecipeId: expensiveItem.recipeId,
        suggestedRecipeId: best.recipeId,
        costDifference: expensiveItem.costPerPortion - best.costPerPortion,
        nutritionalImpact: compareNutrition(expensiveItem.recipe, best),
        reason: `${best.recipeName} is $${(expensiveItem.costPerPortion - best.costPerPortion).toFixed(2)} cheaper per portion`
      });
    }
  }
  
  // Apply substitutions and recalculate
  const optimizedMenu = applySubstitutions(menu, substitutions);
  const optimizedCost = calculateAverageMealCost(optimizedMenu);
  
  return {
    currentCost,
    targetCost: targetCostPerMeal,
    optimizedMenu,
    totalSavings: (currentCost - optimizedCost) * estimateTotalPortions(menu),
    substitutions
  };
}
```

---

## 3. Recipe Scaling & Costing

### 3.1 Factor Method Scaling

The standard method for scaling recipes up or down.

```typescript
interface ScaledRecipe {
  originalYield: number;
  targetYield: number;
  scaleFactor: number;
  scaledIngredients: ScaledIngredient[];
  warnings: string[];
}

interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  originalQuantity: number;
  originalUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  roundedQuantity: number;  // practical measurement
  practicalUnit: string;
}

function scaleRecipe(
  recipe: Recipe,
  targetYield: number
): ScaledRecipe {
  const scaleFactor = targetYield / recipe.yieldQuantity;
  const warnings: string[] = [];
  const scaledIngredients: ScaledIngredient[] = [];
  
  for (const ingredient of recipe.ingredients) {
    const scaledQty = ingredient.quantity * scaleFactor;
    
    // Convert to practical measurements
    const { quantity: practical, unit: practicalUnit } = 
      convertToPracticalMeasurement(scaledQty, ingredient.unit);
    
    scaledIngredients.push({
      ingredientId: ingredient.ingredientId,
      ingredientName: ingredient.ingredientName,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      scaledQuantity: scaledQty,
      scaledUnit: ingredient.unit,
      roundedQuantity: practical,
      practicalUnit
    });
    
    // Check for scaling issues
    if (scaleFactor > 4) {
      warnings.push(`Large scale factor (${scaleFactor.toFixed(1)}x) may affect quality`);
    }
    
    // Check seasoning (doesn't scale linearly above 4x)
    if (isSeasoningIngredient(ingredient) && scaleFactor > 4) {
      warnings.push(`${ingredient.ingredientName}: Scale to 75% for large batches`);
    }
  }
  
  // Equipment warnings
  if (scaleFactor > 2 && recipe.panSize) {
    warnings.push(`Will require ${Math.ceil(recipe.pansPerBatch * scaleFactor)} pans`);
  }
  
  return {
    originalYield: recipe.yieldQuantity,
    targetYield,
    scaleFactor,
    scaledIngredients,
    warnings
  };
}

// Convert awkward measurements to practical ones
function convertToPracticalMeasurement(
  quantity: number, 
  unit: string
): { quantity: number; unit: string } {
  // Example: 0.75 cups -> 3/4 cup or 12 Tbsp
  // Example: 2.5 lb -> 2 lb 8 oz
  // Example: 0.33 cup -> 1/3 cup or 5 Tbsp + 1 tsp
  
  const conversionRules: ConversionRule[] = [
    { fromUnit: 'cup', threshold: 0.25, toQuantity: 4, toUnit: 'Tbsp' },
    { fromUnit: 'Tbsp', threshold: 1, toQuantity: 3, toUnit: 'tsp' },
    { fromUnit: 'lb', threshold: 0.5, toQuantity: 16, toUnit: 'oz' },
    // ... more rules
  ];
  
  for (const rule of conversionRules) {
    if (unit === rule.fromUnit && quantity < rule.threshold) {
      return {
        quantity: roundToFraction(quantity * rule.toQuantity),
        unit: rule.toUnit
      };
    }
  }
  
  return {
    quantity: roundToFraction(quantity),
    unit
  };
}

// Round to common fractions (1/4, 1/3, 1/2, 2/3, 3/4)
function roundToFraction(value: number): number {
  const fractions = [0, 0.25, 0.33, 0.5, 0.67, 0.75, 1];
  const wholePart = Math.floor(value);
  const fractionalPart = value - wholePart;
  
  let closest = fractions[0];
  let minDiff = Math.abs(fractionalPart - closest);
  
  for (const fraction of fractions) {
    const diff = Math.abs(fractionalPart - fraction);
    if (diff < minDiff) {
      minDiff = diff;
      closest = fraction;
    }
  }
  
  return wholePart + closest;
}
```

### 3.2 Recipe Costing

```typescript
interface RecipeCost {
  recipeId: string;
  recipeName: string;
  totalCost: number;
  costPerPortion: number;
  ingredientCosts: IngredientCost[];
  laborCost: number;
  overheadCost: number;
  suggestedPrice: number;
  foodCostPercent: number;
}

interface IngredientCost {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  extendedCost: number;
  percentOfTotal: number;
  isAPorEP: 'AP' | 'EP';
  yieldAdjustedCost?: number;  // cost after accounting for waste
}

function calculateRecipeCost(
  recipe: Recipe,
  includeLabor: boolean = false,
  targetFoodCostPercent: number = 0.33
): RecipeCost {
  const ingredientCosts: IngredientCost[] = [];
  let totalIngredientCost = 0;
  
  for (const ri of recipe.ingredients) {
    const ingredient = getIngredient(ri.ingredientId);
    
    // Convert quantity to cost unit if needed
    const costQuantity = convertUnits(ri.quantity, ri.unit, ingredient.commonUnit);
    
    // Calculate base cost
    let extendedCost = costQuantity * ingredient.costPerUnit;
    
    // Adjust for yield if EP quantity specified but cost is AP
    if (ri.isAPorEP === 'EP' && ingredient.yieldPercent < 1) {
      extendedCost = extendedCost / ingredient.yieldPercent;
    }
    
    totalIngredientCost += extendedCost;
    
    ingredientCosts.push({
      ingredientId: ri.ingredientId,
      ingredientName: ingredient.ingredientName,
      quantity: ri.quantity,
      unit: ri.unit,
      unitCost: ingredient.costPerUnit,
      extendedCost,
      percentOfTotal: 0,  // calculated after total known
      isAPorEP: ri.isAPorEP,
      yieldAdjustedCost: ri.isAPorEP === 'EP' ? extendedCost : undefined
    });
  }
  
  // Calculate percentages
  for (const ic of ingredientCosts) {
    ic.percentOfTotal = ic.extendedCost / totalIngredientCost;
  }
  
  // Calculate per-portion cost
  const costPerPortion = totalIngredientCost / recipe.yieldQuantity;
  
  // Calculate labor cost if requested
  let laborCost = 0;
  if (includeLabor) {
    const totalMinutes = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
    const avgHourlyRate = 15; // could be configurable
    laborCost = (totalMinutes / 60) * avgHourlyRate / recipe.yieldQuantity;
  }
  
  // Calculate suggested price based on target food cost percent
  const suggestedPrice = costPerPortion / targetFoodCostPercent;
  
  return {
    recipeId: recipe.recipeId,
    recipeName: recipe.recipeName,
    totalCost: totalIngredientCost,
    costPerPortion,
    ingredientCosts,
    laborCost,
    overheadCost: 0,  // could add facility costs
    suggestedPrice,
    foodCostPercent: targetFoodCostPercent
  };
}
```

### 3.3 Unit Conversion System

```typescript
interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}

class UnitConverter {
  private conversions: Map<string, Map<string, number>> = new Map();
  
  constructor(unitsOfMeasure: UnitOfMeasure[]) {
    this.buildConversionGraph(unitsOfMeasure);
  }
  
  convert(quantity: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return quantity;
    
    const factor = this.getConversionFactor(fromUnit, toUnit);
    if (factor === null) {
      throw new Error(`Cannot convert ${fromUnit} to ${toUnit}`);
    }
    
    return quantity * factor;
  }
  
  private getConversionFactor(from: string, to: string): number | null {
    // Direct conversion
    if (this.conversions.get(from)?.has(to)) {
      return this.conversions.get(from)!.get(to)!;
    }
    
    // Try converting through base unit
    const fromUnit = this.getUnitInfo(from);
    const toUnit = this.getUnitInfo(to);
    
    if (fromUnit.baseUnit && toUnit.baseUnit && fromUnit.baseUnit === toUnit.baseUnit) {
      // Both can convert to same base unit
      const toBase = fromUnit.conversionToBase;
      const fromBase = 1 / toUnit.conversionToBase;
      return toBase * fromBase;
    }
    
    return null;
  }
}

// Volume equivalents
const volumeConversions: UnitConversion[] = [
  { fromUnit: 'gal', toUnit: 'qt', factor: 4 },
  { fromUnit: 'qt', toUnit: 'pt', factor: 2 },
  { fromUnit: 'pt', toUnit: 'cup', factor: 2 },
  { fromUnit: 'cup', toUnit: 'fl oz', factor: 8 },
  { fromUnit: 'cup', toUnit: 'Tbsp', factor: 16 },
  { fromUnit: 'Tbsp', toUnit: 'tsp', factor: 3 },
  { fromUnit: 'L', toUnit: 'ml', factor: 1000 },
  { fromUnit: 'gal', toUnit: 'L', factor: 3.785 },
];

// Weight equivalents
const weightConversions: UnitConversion[] = [
  { fromUnit: 'lb', toUnit: 'oz', factor: 16 },
  { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
  { fromUnit: 'lb', toUnit: 'kg', factor: 0.4536 },
  { fromUnit: 'oz', toUnit: 'g', factor: 28.35 },
];
```

---

## 4. Inventory Management

### 4.1 Par Level Calculator

```typescript
interface ParLevelCalculation {
  ingredientId: string;
  calculatedParLevel: number;
  calculatedReorderPoint: number;
  safetyStock: number;
  averageDailyUsage: number;
  leadTimeDays: number;
  usageVariability: number;
  recommendations: string[];
}

function calculateParLevel(
  ingredientId: string,
  usageHistory: DailyUsage[],
  vendorLeadTime: number,
  deliveryFrequency: number,  // days between deliveries
  serviceLevel: number = 0.95  // probability of not stocking out
): ParLevelCalculation {
  // Calculate average daily usage
  const avgDailyUsage = usageHistory.reduce((sum, u) => sum + u.quantity, 0) / usageHistory.length;
  
  // Calculate usage variability (standard deviation)
  const variance = usageHistory.reduce((sum, u) => {
    return sum + Math.pow(u.quantity - avgDailyUsage, 2);
  }, 0) / usageHistory.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate safety stock based on service level
  // Z-score for 95% service level is 1.645
  const zScore = getZScore(serviceLevel);
  const safetyStock = zScore * stdDev * Math.sqrt(vendorLeadTime);
  
  // Reorder point = (Average daily usage × Lead time) + Safety stock
  const reorderPoint = (avgDailyUsage * vendorLeadTime) + safetyStock;
  
  // Par level = Reorder point + (Average daily usage × Days between deliveries)
  const parLevel = reorderPoint + (avgDailyUsage * deliveryFrequency);
  
  const recommendations: string[] = [];
  
  // High variability warning
  if (stdDev / avgDailyUsage > 0.3) {
    recommendations.push('High usage variability - consider increasing safety stock');
  }
  
  // Low turnover warning
  if (avgDailyUsage < parLevel / 14) {
    recommendations.push('Slow-moving item - consider reducing par level');
  }
  
  return {
    ingredientId,
    calculatedParLevel: Math.ceil(parLevel),
    calculatedReorderPoint: Math.ceil(reorderPoint),
    safetyStock: Math.ceil(safetyStock),
    averageDailyUsage: avgDailyUsage,
    leadTimeDays: vendorLeadTime,
    usageVariability: stdDev / avgDailyUsage,
    recommendations
  };
}
```

### 4.2 Economic Order Quantity (EOQ)

```typescript
interface EOQResult {
  optimalOrderQuantity: number;
  ordersPerYear: number;
  averageInventory: number;
  totalAnnualCost: number;
  orderingCosts: number;
  holdingCosts: number;
}

function calculateEOQ(
  annualDemand: number,      // units per year
  orderingCost: number,      // cost per order (paperwork, receiving, etc.)
  holdingCostPercent: number, // annual holding cost as % of unit cost
  unitCost: number
): EOQResult {
  // EOQ = sqrt((2 × D × S) / H)
  // D = annual demand
  // S = ordering cost per order
  // H = holding cost per unit per year
  
  const holdingCost = unitCost * holdingCostPercent;
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
  
  const ordersPerYear = annualDemand / eoq;
  const averageInventory = eoq / 2;
  
  // Total annual cost = Ordering costs + Holding costs
  const totalOrderingCosts = ordersPerYear * orderingCost;
  const totalHoldingCosts = averageInventory * holdingCost;
  
  return {
    optimalOrderQuantity: Math.round(eoq),
    ordersPerYear: Math.round(ordersPerYear),
    averageInventory: Math.round(averageInventory),
    totalAnnualCost: totalOrderingCosts + totalHoldingCosts,
    orderingCosts: totalOrderingCosts,
    holdingCosts: totalHoldingCosts
  };
}
```

### 4.3 FIFO Tracking & Expiration Alerting

```typescript
interface InventoryLot {
  lotId: string;
  ingredientId: string;
  quantity: number;
  receivedDate: Date;
  expirationDate: Date;
  unitCost: number;
}

interface ExpirationAlert {
  ingredientId: string;
  ingredientName: string;
  lotId: string;
  quantity: number;
  expirationDate: Date;
  daysUntilExpiry: number;
  estimatedValue: number;
  suggestedAction: string;
  usageSuggestions: RecipeSuggestion[];
}

function checkExpirations(
  inventory: InventoryLot[],
  alertDays: number = 7
): ExpirationAlert[] {
  const today = new Date();
  const alerts: ExpirationAlert[] = [];
  
  for (const lot of inventory) {
    const daysUntilExpiry = Math.ceil(
      (lot.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry <= alertDays && lot.quantity > 0) {
      const ingredient = getIngredient(lot.ingredientId);
      
      // Find recipes that use this ingredient
      const recipes = findRecipesUsingIngredient(lot.ingredientId);
      const usageSuggestions = recipes.map(r => ({
        recipeId: r.recipeId,
        recipeName: r.recipeName,
        quantityNeeded: r.quantityPerBatch,
        batchesUsingRemaining: Math.floor(lot.quantity / r.quantityPerBatch)
      }));
      
      alerts.push({
        ingredientId: lot.ingredientId,
        ingredientName: ingredient.ingredientName,
        lotId: lot.lotId,
        quantity: lot.quantity,
        expirationDate: lot.expirationDate,
        daysUntilExpiry,
        estimatedValue: lot.quantity * lot.unitCost,
        suggestedAction: getSuggestedAction(daysUntilExpiry, ingredient),
        usageSuggestions
      });
    }
  }
  
  // Sort by urgency
  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

function getSuggestedAction(daysUntilExpiry: number, ingredient: Ingredient): string {
  if (daysUntilExpiry <= 0) {
    return 'DISCARD - Past expiration date';
  } else if (daysUntilExpiry <= 1) {
    return 'USE TODAY - Prioritize in production';
  } else if (daysUntilExpiry <= 3) {
    return 'Use within 3 days - Add to tomorrow\'s menu';
  } else if (ingredient.storageType === 'Fresh Produce') {
    return 'Monitor closely - Check quality daily';
  } else {
    return 'Plan usage - Schedule before expiration';
  }
}

function issueByFIFO(
  ingredientId: string,
  quantityNeeded: number,
  availableLots: InventoryLot[]
): { lots: LotIssue[]; fulfilled: boolean } {
  // Sort by expiration date (oldest first)
  const sortedLots = availableLots
    .filter(l => l.ingredientId === ingredientId && l.quantity > 0)
    .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
  
  const issues: LotIssue[] = [];
  let remaining = quantityNeeded;
  
  for (const lot of sortedLots) {
    if (remaining <= 0) break;
    
    const issueQty = Math.min(lot.quantity, remaining);
    issues.push({
      lotId: lot.lotId,
      quantity: issueQty,
      unitCost: lot.unitCost,
      expirationDate: lot.expirationDate
    });
    remaining -= issueQty;
  }
  
  return {
    lots: issues,
    fulfilled: remaining <= 0
  };
}
```

---

## 5. Production Scheduling

### 5.1 Production Schedule Generator

```typescript
interface ProductionSchedule {
  date: Date;
  siteId: string;
  mealPeriod: string;
  items: ScheduledItem[];
  totalPrepTime: number;
  criticalPath: string[];
  equipmentAllocation: EquipmentSlot[];
}

interface ScheduledItem {
  recipeId: string;
  recipeName: string;
  portionsNeeded: number;
  batchCount: number;
  prepStartTime: Date;
  cookStartTime: Date;
  readyTime: Date;
  assignedEmployee?: string;
  assignedStation?: string;
  dependencies: string[];  // recipe IDs that must complete first
}

function generateProductionSchedule(
  date: Date,
  siteId: string,
  mealPeriod: MealPeriod,
  menuItems: MenuItemWithForecast[],
  employees: Employee[],
  equipment: Equipment[]
): ProductionSchedule {
  const serviceStartTime = parseTime(mealPeriod.typicalStartTime);
  const items: ScheduledItem[] = [];
  
  // Calculate portions needed for each item
  for (const menuItem of menuItems) {
    const recipe = getRecipe(menuItem.recipeId);
    const portionsNeeded = menuItem.forecastedPortions;
    const batchCount = Math.ceil(portionsNeeded / recipe.yieldQuantity);
    
    // Calculate timing working backwards from service
    const totalTime = (recipe.prepTimeMinutes || 30) + (recipe.cookTimeMinutes || 30);
    const readyTime = new Date(serviceStartTime.getTime() - 15 * 60 * 1000); // 15 min buffer
    const cookStartTime = new Date(readyTime.getTime() - (recipe.cookTimeMinutes || 30) * 60 * 1000);
    const prepStartTime = new Date(cookStartTime.getTime() - (recipe.prepTimeMinutes || 30) * 60 * 1000);
    
    items.push({
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      portionsNeeded,
      batchCount,
      prepStartTime,
      cookStartTime,
      readyTime,
      dependencies: findDependencies(recipe)
    });
  }
  
  // Sort by prep start time
  items.sort((a, b) => a.prepStartTime.getTime() - b.prepStartTime.getTime());
  
  // Allocate employees and equipment
  allocateResources(items, employees, equipment);
  
  // Calculate critical path
  const criticalPath = findCriticalPath(items);
  
  return {
    date,
    siteId,
    mealPeriod: mealPeriod.mealPeriodId,
    items,
    totalPrepTime: calculateTotalPrepTime(items),
    criticalPath,
    equipmentAllocation: getAllEquipmentSlots(items)
  };
}

function findCriticalPath(items: ScheduledItem[]): string[] {
  // Find the sequence of items that determines minimum completion time
  // (longest path through dependencies)
  
  const path: string[] = [];
  let currentTime = Math.min(...items.map(i => i.prepStartTime.getTime()));
  
  while (true) {
    // Find item that starts at current time with longest duration
    const candidates = items.filter(i => 
      i.prepStartTime.getTime() === currentTime &&
      !path.includes(i.recipeId)
    );
    
    if (candidates.length === 0) break;
    
    const longest = candidates.reduce((prev, curr) => {
      const prevDuration = prev.readyTime.getTime() - prev.prepStartTime.getTime();
      const currDuration = curr.readyTime.getTime() - curr.prepStartTime.getTime();
      return currDuration > prevDuration ? curr : prev;
    });
    
    path.push(longest.recipeId);
    currentTime = longest.readyTime.getTime();
  }
  
  return path;
}
```

### 5.2 Equipment Scheduling

```typescript
interface EquipmentSlot {
  equipmentId: string;
  equipmentName: string;
  recipeId: string;
  startTime: Date;
  endTime: Date;
  temperature?: number;
}

function scheduleEquipment(
  items: ScheduledItem[],
  availableEquipment: Equipment[]
): { allocation: EquipmentSlot[]; conflicts: EquipmentConflict[] } {
  const allocation: EquipmentSlot[] = [];
  const conflicts: EquipmentConflict[] = [];
  
  // Group equipment by type
  const equipmentByType = groupBy(availableEquipment, 'equipmentType');
  
  for (const item of items) {
    const recipe = getRecipe(item.recipeId);
    const requiredEquipment = parseEquipmentRequired(recipe.equipmentRequired);
    
    for (const req of requiredEquipment) {
      const available = equipmentByType.get(req.type) || [];
      
      // Find equipment that's free during the cooking window
      const freeEquipment = available.find(eq => 
        !hasConflict(allocation, eq.equipmentId, item.cookStartTime, item.readyTime)
      );
      
      if (freeEquipment) {
        allocation.push({
          equipmentId: freeEquipment.equipmentId,
          equipmentName: freeEquipment.equipmentName,
          recipeId: item.recipeId,
          startTime: item.cookStartTime,
          endTime: item.readyTime,
          temperature: recipe.cookingTempF
        });
      } else {
        conflicts.push({
          recipeId: item.recipeId,
          equipmentType: req.type,
          neededFrom: item.cookStartTime,
          neededUntil: item.readyTime,
          suggestion: `Adjust start time or use alternative cooking method`
        });
      }
    }
  }
  
  return { allocation, conflicts };
}
```

---

## 6. Dietary Compliance

### 6.1 Allergen Detection

```typescript
interface AllergenCheckResult {
  isCompliant: boolean;
  detectedAllergens: DetectedAllergen[];
  crossContactRisks: CrossContactRisk[];
}

interface DetectedAllergen {
  allergenId: string;
  allergenName: string;
  sourceIngredient: string;
  severity: 'contains' | 'may_contain' | 'processed_in_facility';
}

function checkAllergens(
  recipeId: string,
  dinerAllergens: string[]
): AllergenCheckResult {
  const recipe = getRecipeWithIngredients(recipeId);
  const detectedAllergens: DetectedAllergen[] = [];
  const crossContactRisks: CrossContactRisk[] = [];
  
  for (const ingredient of recipe.ingredients) {
    const ingredientAllergens = parseAllergenFlags(ingredient.allergenFlags);
    
    for (const allergen of ingredientAllergens) {
      if (dinerAllergens.includes(allergen)) {
        detectedAllergens.push({
          allergenId: allergen,
          allergenName: getAllergenName(allergen),
          sourceIngredient: ingredient.ingredientName,
          severity: 'contains'
        });
      }
    }
    
    // Check cross-contact risks
    const allergenInfo = getAllergen(allergen);
    if (allergenInfo.crossContactRisk) {
      crossContactRisks.push({
        allergenId: allergen,
        risk: allergenInfo.crossContactRisk,
        mitigationSteps: getCrossContactMitigation(allergen)
      });
    }
  }
  
  return {
    isCompliant: detectedAllergens.length === 0,
    detectedAllergens,
    crossContactRisks
  };
}

function validateMealOrder(
  diner: Diner,
  menuItemId: string
): ValidationResult {
  const menuItem = getMenuItem(menuItemId);
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 1. Check allergens
  if (diner.allergies) {
    const allergenCheck = checkAllergens(menuItem.recipeId, parseAllergens(diner.allergies));
    if (!allergenCheck.isCompliant) {
      errors.push({
        type: 'allergen',
        severity: 'critical',
        message: `Contains allergens: ${allergenCheck.detectedAllergens.map(a => a.allergenName).join(', ')}`,
        blocksOrder: true
      });
    }
  }
  
  // 2. Check diet restrictions
  const dietCheck = checkDietCompatibility(menuItem.recipeId, diner.primaryDietTypeId);
  if (!dietCheck.isCompatible) {
    errors.push({
      type: 'diet',
      severity: dietCheck.severity,
      message: dietCheck.message,
      blocksOrder: dietCheck.severity === 'critical'
    });
  }
  
  // 3. Check texture requirements
  if (diner.textureModification && diner.textureModification !== 'Regular') {
    const textureCheck = checkTextureCompatibility(menuItem.recipeId, diner.textureModification);
    if (!textureCheck.isCompatible) {
      warnings.push({
        type: 'texture',
        message: `Recipe needs ${diner.textureModification} modification`,
        autoModifiable: textureCheck.canAutoModify
      });
    }
  }
  
  // 4. Check dislikes (warning only)
  if (diner.dislikes) {
    const dislikeCheck = checkDislikes(menuItem.recipeId, diner.dislikes);
    if (dislikeCheck.hasDislikedIngredients) {
      warnings.push({
        type: 'preference',
        message: `Contains disliked: ${dislikeCheck.dislikedIngredients.join(', ')}`
      });
    }
  }
  
  return {
    isValid: errors.filter(e => e.blocksOrder).length === 0,
    errors,
    warnings,
    diner,
    menuItem
  };
}
```

### 6.2 Nutrient Constraint Checking

```typescript
interface NutrientCheckResult {
  meetsRequirements: boolean;
  nutrientLevels: NutrientLevel[];
  violations: NutrientViolation[];
}

interface NutrientLevel {
  nutrient: string;
  amount: number;
  unit: string;
  limit?: number;
  percentOfLimit?: number;
}

function checkNutrientConstraints(
  recipeId: string,
  dietType: DietType
): NutrientCheckResult {
  const recipe = getRecipeWithNutrition(recipeId);
  const violations: NutrientViolation[] = [];
  const levels: NutrientLevel[] = [];
  
  // Check sodium
  if (dietType.sodiumLimitMg && recipe.sodiumMg) {
    const percent = (recipe.sodiumMg / dietType.sodiumLimitMg) * 100;
    levels.push({
      nutrient: 'Sodium',
      amount: recipe.sodiumMg,
      unit: 'mg',
      limit: dietType.sodiumLimitMg,
      percentOfLimit: percent
    });
    
    if (recipe.sodiumMg > dietType.sodiumLimitMg) {
      violations.push({
        nutrient: 'Sodium',
        actual: recipe.sodiumMg,
        limit: dietType.sodiumLimitMg,
        overage: recipe.sodiumMg - dietType.sodiumLimitMg,
        message: `Exceeds sodium limit by ${recipe.sodiumMg - dietType.sodiumLimitMg}mg`
      });
    }
  }
  
  // Check carbs (for diabetic)
  if (dietType.carbLimitG && recipe.carbsG) {
    const percent = (recipe.carbsG / dietType.carbLimitG) * 100;
    levels.push({
      nutrient: 'Carbohydrates',
      amount: recipe.carbsG,
      unit: 'g',
      limit: dietType.carbLimitG,
      percentOfLimit: percent
    });
    
    if (recipe.carbsG > dietType.carbLimitG) {
      violations.push({
        nutrient: 'Carbohydrates',
        actual: recipe.carbsG,
        limit: dietType.carbLimitG,
        overage: recipe.carbsG - dietType.carbLimitG,
        message: `Exceeds carb limit by ${recipe.carbsG - dietType.carbLimitG}g per portion`
      });
    }
  }
  
  // Check calories
  if (dietType.calorieTarget) {
    const mealPercent = getMealPercentOfDaily(recipe.category); // e.g., lunch = 30%
    const mealCalorieTarget = dietType.calorieTarget * mealPercent;
    
    levels.push({
      nutrient: 'Calories',
      amount: recipe.caloriesPerPortion,
      unit: 'kcal',
      limit: mealCalorieTarget,
      percentOfLimit: (recipe.caloriesPerPortion / mealCalorieTarget) * 100
    });
  }
  
  return {
    meetsRequirements: violations.length === 0,
    nutrientLevels: levels,
    violations
  };
}
```

---

## 7. Waste Prediction & Reduction

### 7.1 Leftover Prediction

```typescript
interface LeftoverPrediction {
  recipeId: string;
  predictedLeftoverPercent: number;
  predictedPortionsLeftover: number;
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
}

function predictLeftovers(
  recipeId: string,
  forecastedPortions: number,
  historicalLeftovers: LeftoverHistory[]
): LeftoverPrediction {
  // Calculate base leftover rate from history
  const avgLeftoverRate = historicalLeftovers.reduce((sum, h) => 
    sum + (h.portionsLeftover / h.portionsProduced), 0
  ) / historicalLeftovers.length;
  
  // Identify factors that affect leftover rate
  const factors: PredictionFactor[] = [];
  
  // Factor: Recipe popularity trend
  const popularityTrend = calculatePopularityTrend(recipeId);
  if (popularityTrend < -0.1) {
    factors.push({
      name: 'Declining popularity',
      impact: 1.15,  // 15% more leftovers expected
      confidence: 0.7
    });
  }
  
  // Factor: Day of week patterns
  const dayOfWeek = new Date().getDay();
  const dowFactor = getDayOfWeekLeftoverFactor(recipeId, dayOfWeek);
  if (dowFactor !== 1) {
    factors.push({
      name: `${getDayName(dayOfWeek)} pattern`,
      impact: dowFactor,
      confidence: 0.8
    });
  }
  
  // Factor: Weather (hot weather reduces hot food consumption)
  const weather = getCurrentWeather();
  if (weather.temperature > 85 && isHotDish(recipeId)) {
    factors.push({
      name: 'Hot weather',
      impact: 1.2,
      confidence: 0.6
    });
  }
  
  // Calculate adjusted leftover rate
  let adjustedRate = avgLeftoverRate;
  for (const factor of factors) {
    adjustedRate *= factor.impact;
  }
  
  const predictedPortions = Math.round(forecastedPortions * adjustedRate);
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (adjustedRate > 0.15) {
    recommendations.push('Consider reducing production by 10-15%');
  }
  if (factors.some(f => f.name === 'Declining popularity')) {
    recommendations.push('Recipe may need refreshing or replacement');
  }
  
  return {
    recipeId,
    predictedLeftoverPercent: adjustedRate * 100,
    predictedPortionsLeftover: predictedPortions,
    confidence: calculateOverallConfidence(factors),
    factors,
    recommendations
  };
}
```

### 7.2 Repurposing Suggestions

```typescript
interface RepurposeSuggestion {
  leftoverRecipeId: string;
  suggestedRecipeId: string;
  suggestedRecipeName: string;
  portionsCanMake: number;
  additionalIngredientsNeeded: IngredientNeed[];
  savingsEstimate: number;
  qualityRating: 'excellent' | 'good' | 'acceptable';
}

function suggestRepurposing(
  leftoverRecipeId: string,
  leftoverQuantity: number,
  leftoverQuality: 'Usable' | 'Marginal'
): RepurposeSuggestion[] {
  const suggestions: RepurposeSuggestion[] = [];
  
  // Get leftover recipe details
  const leftoverRecipe = getRecipe(leftoverRecipeId);
  const leftoverCategory = leftoverRecipe.category;
  const leftoverProtein = getProteinType(leftoverRecipe);
  
  // Find recipes that could use this as an ingredient
  const repurposeRecipes = findRepurposeRecipes(leftoverProtein, leftoverCategory);
  
  for (const targetRecipe of repurposeRecipes) {
    // Calculate how much of target we can make
    const conversionRatio = getRepurposeConversionRatio(leftoverRecipeId, targetRecipe.recipeId);
    const portionsCanMake = Math.floor(leftoverQuantity * conversionRatio);
    
    if (portionsCanMake < 10) continue;  // Not worth it for small quantities
    
    // Determine additional ingredients needed
    const additionalNeeds = calculateAdditionalNeeds(
      targetRecipe,
      leftoverRecipeId,
      portionsCanMake
    );
    
    // Calculate savings
    const newRecipeCost = calculateRecipeCost(targetRecipe.recipeId);
    const leftoverValue = leftoverQuantity * leftoverRecipe.foodCostPerPortion;
    const additionalCost = additionalNeeds.reduce((sum, n) => sum + n.cost, 0);
    const savings = leftoverValue - additionalCost;
    
    suggestions.push({
      leftoverRecipeId,
      suggestedRecipeId: targetRecipe.recipeId,
      suggestedRecipeName: targetRecipe.recipeName,
      portionsCanMake,
      additionalIngredientsNeeded: additionalNeeds,
      savingsEstimate: savings,
      qualityRating: leftoverQuality === 'Usable' ? 'excellent' : 'good'
    });
  }
  
  // Sort by savings
  return suggestions.sort((a, b) => b.savingsEstimate - a.savingsEstimate);
}

// Common repurposing patterns
const repurposePatterns: RepurposePattern[] = [
  { from: 'Roasted Chicken', to: ['Chicken Salad', 'Chicken Soup', 'Chicken Pot Pie', 'Chicken Quesadillas'] },
  { from: 'Roast Beef', to: ['Beef Stroganoff', 'Beef Hash', 'French Dip Sandwiches', 'Beef Barley Soup'] },
  { from: 'Roasted Turkey', to: ['Turkey Salad', 'Turkey Tetrazzini', 'Turkey Soup'] },
  { from: 'Mashed Potatoes', to: ['Potato Pancakes', 'Shepherd\'s Pie Topping', 'Potato Soup'] },
  { from: 'Rice', to: ['Fried Rice', 'Rice Pudding', 'Stuffed Peppers'] },
  { from: 'Pasta', to: ['Pasta Salad', 'Baked Pasta', 'Pasta Frittata'] },
];
```

---

## 8. Procurement Optimization

### 8.1 Purchase Order Generator

```typescript
interface GeneratedPO {
  vendorId: string;
  vendorName: string;
  suggestedDeliveryDate: Date;
  lineItems: POLineItem[];
  estimatedTotal: number;
  justification: string[];
}

interface POLineItem {
  ingredientId: string;
  ingredientName: string;
  quantityNeeded: number;
  orderQuantity: number;  // rounded to pack size
  unit: string;
  estimatedPrice: number;
  reason: 'below_reorder' | 'menu_forecast' | 'expiring_need_replacement' | 'new_menu_item';
}

function generatePurchaseOrder(
  vendorId: string,
  forecastDays: number = 7
): GeneratedPO {
  const vendor = getVendor(vendorId);
  const vendorIngredients = getIngredientsForVendor(vendorId);
  const lineItems: POLineItem[] = [];
  const justification: string[] = [];
  
  for (const ingredient of vendorIngredients) {
    const currentInventory = getInventoryLevel(ingredient.ingredientId);
    const forecastedUsage = forecastIngredientUsage(ingredient.ingredientId, forecastDays);
    
    // Check if we need to order
    const projectedLevel = currentInventory - forecastedUsage;
    
    if (projectedLevel < ingredient.reorderPoint) {
      // Calculate order quantity
      const shortage = ingredient.parLevel - projectedLevel;
      
      // Round up to purchase unit
      const purchaseUnits = Math.ceil(shortage / ingredient.unitsPerPurchaseUnit);
      const orderQuantity = purchaseUnits * ingredient.unitsPerPurchaseUnit;
      
      lineItems.push({
        ingredientId: ingredient.ingredientId,
        ingredientName: ingredient.ingredientName,
        quantityNeeded: shortage,
        orderQuantity,
        unit: ingredient.purchaseUnit,
        estimatedPrice: purchaseUnits * ingredient.purchaseUnitCost,
        reason: projectedLevel < 0 ? 'below_reorder' : 'menu_forecast'
      });
      
      justification.push(
        `${ingredient.ingredientName}: Current ${currentInventory}, ` +
        `forecasted usage ${forecastedUsage}, ordering ${orderQuantity}`
      );
    }
  }
  
  // Calculate optimal delivery date
  const suggestedDeliveryDate = calculateDeliveryDate(vendor, lineItems);
  
  return {
    vendorId,
    vendorName: vendor.vendorName,
    suggestedDeliveryDate,
    lineItems,
    estimatedTotal: lineItems.reduce((sum, li) => sum + li.estimatedPrice, 0),
    justification
  };
}

function forecastIngredientUsage(
  ingredientId: string,
  days: number
): number {
  // Get upcoming menu items that use this ingredient
  const upcomingMenuItems = getUpcomingMenuItems(days);
  let totalUsage = 0;
  
  for (const menuItem of upcomingMenuItems) {
    const recipe = getRecipe(menuItem.recipeId);
    const recipeIngredient = recipe.ingredients.find(i => i.ingredientId === ingredientId);
    
    if (recipeIngredient) {
      const forecastedPortions = menuItem.forecastedPortions;
      const batchesNeeded = forecastedPortions / recipe.yieldQuantity;
      totalUsage += recipeIngredient.quantity * batchesNeeded;
    }
  }
  
  return totalUsage;
}
```

### 8.2 Vendor Price Comparison

```typescript
interface PriceComparison {
  ingredientId: string;
  ingredientName: string;
  vendorPrices: VendorPrice[];
  bestValue: VendorPrice;
  potentialSavings: number;
  recommendation: string;
}

interface VendorPrice {
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  packSize: string;
  pricePerUnit: number;  // normalized to common unit
  qualityRating: number;
  deliveryReliability: number;
  valueScore: number;    // combined price/quality/reliability score
}

function compareVendorPrices(ingredientId: string): PriceComparison {
  const ingredient = getIngredient(ingredientId);
  const vendorPrices: VendorPrice[] = [];
  
  // Get prices from all vendors carrying this ingredient
  const vendors = getVendorsForIngredient(ingredientId);
  
  for (const vendor of vendors) {
    const pricing = getVendorPricing(vendor.vendorId, ingredientId);
    const vendorMetrics = getVendorMetrics(vendor.vendorId);
    
    // Normalize price to common unit
    const pricePerUnit = pricing.unitPrice / pricing.unitsPerPack;
    
    // Calculate value score (lower is better)
    // Weight: 60% price, 25% quality, 15% reliability
    const valueScore = 
      (pricePerUnit / getAveragePrice(ingredientId)) * 0.6 +
      (1 - vendorMetrics.qualityRating / 5) * 0.25 +
      (1 - vendorMetrics.deliveryReliability) * 0.15;
    
    vendorPrices.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      unitPrice: pricing.unitPrice,
      packSize: pricing.packSize,
      pricePerUnit,
      qualityRating: vendorMetrics.qualityRating,
      deliveryReliability: vendorMetrics.deliveryReliability,
      valueScore
    });
  }
  
  // Sort by value score
  vendorPrices.sort((a, b) => a.valueScore - b.valueScore);
  
  const bestValue = vendorPrices[0];
  const currentVendor = vendorPrices.find(v => v.vendorId === ingredient.preferredVendorId);
  
  const potentialSavings = currentVendor 
    ? (currentVendor.pricePerUnit - bestValue.pricePerUnit) * estimateAnnualUsage(ingredientId)
    : 0;
  
  return {
    ingredientId,
    ingredientName: ingredient.ingredientName,
    vendorPrices,
    bestValue,
    potentialSavings,
    recommendation: generateRecommendation(bestValue, currentVendor, potentialSavings)
  };
}
```

### 8.3 Substitution Engine

```typescript
interface SubstitutionSuggestion {
  originalIngredientId: string;
  substituteIngredientId: string;
  substituteName: string;
  costSavings: number;
  conversionRatio: number;  // how much substitute per original unit
  flavorImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  nutritionalImpact: NutrientDifference[];
  applicableRecipes: string[];
  restrictions: string[];  // diets this sub doesn't work for
}

function findSubstitutions(
  ingredientId: string,
  reason: 'cost' | 'availability' | 'dietary'
): SubstitutionSuggestion[] {
  const original = getIngredient(ingredientId);
  const suggestions: SubstitutionSuggestion[] = [];
  
  // Get substitutes from substitution database
  const knownSubstitutes = getKnownSubstitutes(ingredientId);
  
  for (const sub of knownSubstitutes) {
    const substitute = getIngredient(sub.substituteId);
    
    // Calculate cost savings
    const costSavings = original.costPerUnit - (substitute.costPerUnit * sub.ratio);
    
    // Skip if not actually cheaper (for cost-based search)
    if (reason === 'cost' && costSavings <= 0) continue;
    
    // Check availability
    if (reason === 'availability') {
      const inventory = getInventoryLevel(sub.substituteId);
      if (inventory <= 0) continue;
    }
    
    // Find recipes where this substitution applies
    const recipes = findRecipesUsingIngredient(ingredientId);
    const applicableRecipes = recipes
      .filter(r => isSubstitutionValid(r.recipeId, ingredientId, sub.substituteId))
      .map(r => r.recipeId);
    
    suggestions.push({
      originalIngredientId: ingredientId,
      substituteIngredientId: sub.substituteId,
      substituteName: substitute.ingredientName,
      costSavings,
      conversionRatio: sub.ratio,
      flavorImpact: sub.flavorImpact,
      nutritionalImpact: compareNutrition(original, substitute),
      applicableRecipes,
      restrictions: sub.dietaryRestrictions
    });
  }
  
  // Sort by cost savings (highest first)
  return suggestions.sort((a, b) => b.costSavings - a.costSavings);
}

// Common substitution rules
const substitutionRules: SubstitutionRule[] = [
  { original: 'butter', substitute: 'margarine', ratio: 1, flavorImpact: 'minimal' },
  { original: 'heavy cream', substitute: 'half and half', ratio: 1, flavorImpact: 'moderate' },
  { original: 'beef chuck', substitute: 'pork shoulder', ratio: 1, flavorImpact: 'moderate' },
  { original: 'shrimp', substitute: 'tilapia', ratio: 1.2, flavorImpact: 'significant' },
  { original: 'fresh herbs', substitute: 'dried herbs', ratio: 0.33, flavorImpact: 'moderate' },
  { original: 'chicken breast', substitute: 'turkey breast', ratio: 1, flavorImpact: 'minimal' },
];
```

---

## Summary: Algorithm Categories

| Category | Key Algorithms | Primary Use Cases |
|----------|----------------|-------------------|
| **Forecasting** | Exponential smoothing, moving averages, factor adjustments | Census prediction, menu item selection |
| **Menu Planning** | Protein spreading, color balance, diversity scoring | Cycle menu creation, quality assurance |
| **Recipe** | Factor scaling, unit conversion, costing | Production planning, pricing |
| **Inventory** | Par level calculation, EOQ, FIFO tracking | Stock management, ordering |
| **Production** | Schedule generation, critical path, resource allocation | Kitchen workflow |
| **Compliance** | Allergen detection, nutrient checking, diet validation | Patient safety, regulatory |
| **Waste** | Leftover prediction, repurposing matching | Cost control, sustainability |
| **Procurement** | PO generation, price comparison, substitution | Purchasing efficiency |

---

## Implementation Notes

### Performance Considerations

1. **Caching**: Cache frequently accessed data (recipes, ingredients, nutrition)
2. **Batch Processing**: Run forecasts overnight for next-day planning
3. **Incremental Updates**: Update inventory levels incrementally vs. full recalc

### Data Dependencies

```
Forecasts ─────► Production Schedules ─────► Storeroom Issues
    │                    │                         │
    ▼                    ▼                         ▼
Menu Items         Ingredient Needs           Inventory Updates
    │                    │                         │
    ▼                    ▼                         ▼
Recipe Costing    Purchase Orders          Par Level Alerts
```

### Testing Strategy

- Unit tests for all calculation functions
- Integration tests for multi-step workflows
- Historical data validation (backtest forecasts against actuals)
- Edge case testing (zero inventory, extreme scales, missing data)

