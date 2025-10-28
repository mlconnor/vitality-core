import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import Ajv from 'ajv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// File paths
const RECIPE_CONCEPTS_FILE = path.join(__dirname, '../../../data/recipe_concepts.json');
const RECIPE_SCHEMA_FILE = path.join(__dirname, '../schemas/recipe.schema.json');
const RECIPES_OUTPUT_DIR = path.join(__dirname, '../../../data/recipes');
const AFFINITY_TIPS_FILE = path.join(__dirname, '../../../data/affinity_tips.json');

// Ensure output directory exists
if (!fs.existsSync(RECIPES_OUTPUT_DIR)) {
  fs.mkdirSync(RECIPES_OUTPUT_DIR, { recursive: true });
  console.log(`Created recipes directory: ${RECIPES_OUTPUT_DIR}`);
}

// Load the recipe schema for validation
const recipeSchema = JSON.parse(fs.readFileSync(RECIPE_SCHEMA_FILE, 'utf-8'));
const ajv = new Ajv({ allErrors: true });
const validateRecipe = ajv.compile(recipeSchema);

// Load affinity tips
const affinityTips = JSON.parse(fs.readFileSync(AFFINITY_TIPS_FILE, 'utf-8'));

// Function to generate system prompt with recipe details
function buildSystemPrompt(concept) {
  const { recipe_name, chef, cuisine, flavor_profile, course, ingredients_combo } = concept;
  
  // Parse ingredients from the combo string (split by + with optional whitespace)
  const ingredients = ingredients_combo ? ingredients_combo.split(/\s*\+\s*/).map(i => i.trim().toLowerCase()) : [];
  
  // Check that ALL ingredients have tips - throw error if any are missing
  const missingTips = ingredients.filter(ingredient => !affinityTips[ingredient]);
  if (missingTips.length > 0) {
    throw new Error(
      `Missing affinity tips for ingredients: ${missingTips.join(', ')}\n` +
      `Recipe: ${recipe_name}\n` +
      `All ingredients: ${ingredients.join(', ')}`
    );
  }
  
  // Build ingredient tips section
  let ingredientTipsSection = '';
  
  if (ingredients.length > 0) {
    ingredientTipsSection = '\n\n# Ingredient Tips\n\n';
    
    for (const ingredient of ingredients) {
      const tips = affinityTips[ingredient];
      const capitalizedIngredient = ingredient.charAt(0).toUpperCase() + ingredient.slice(1);
      
      if (tips.pairing_tips && tips.pairing_tips.length > 0) {
        ingredientTipsSection += `## ${capitalizedIngredient} Pairing Tips\n`;
        tips.pairing_tips.forEach(tip => {
          ingredientTipsSection += `- ${tip}\n`;
        });
        ingredientTipsSection += '\n';
      }
      
      if (tips.cooking_tips && tips.cooking_tips.length > 0) {
        ingredientTipsSection += `## ${capitalizedIngredient} Cooking Tips\n`;
        tips.cooking_tips.forEach(tip => {
          ingredientTipsSection += `- ${tip}\n`;
        });
        ingredientTipsSection += '\n';
      }
    }
  }
  
  return `You are a professional chef and recipe developer, drawing from real-world experience to create recipes that prioritize 1) taste, 2) health, 3) convenience, and 4) value. Use simple, easy to understand langauge that is not flowery or fancy.
  
Your task is to take the Recipe Description and Recipe Guidelines and create detailed, high-quality recipes that follow this EXACT JSON schema.

JSON SCHEMA:
${JSON.stringify(recipeSchema, null, 2)}

# Key JSON Requirements:
1. Every ingredient MUST have a "measurements" array with at least one weight measurement in grams
2. Every instruction MUST have "description" (using descriptive cues and adaptive language), "activeTimeMinutes" (as an estimate or range, e.g., 5-10), "totalTimeMinutes" (as an estimate or range), and "equipment" array
3. SubRecipes use "title" (NOT "name"), and follow the same ingredient/instruction rules
4. Metadata must include ALL required fields: primaryProtein, cookingMethod (array), dishCategory, weight, prepTime, complexity, seasonality, flavorProfile (array), temperature, theme
5. Top-level must include: title, description, ingredients, instructions, servings, prepTimeMinutes, cookTimeMinutes, totalTimeMinutes
6. Do NOT add any additional properties not defined in the schema

CRITICAL: In all 'description' fields for instructions and subrecipes, incorporate the appropriate 'Cooking technique and doneness cues' for the ingredients/methods involved. Use sensory descriptors to guide doneness.

CRITICAL: Your response must be ONLY valid JSON matching the schema above. Do not include any explanatory text, markdown formatting, or code blocks. Return ONLY the JSON object.

# Recipe Description
Create a recipe for: "${recipe_name}"
Chef Style: ${chef}
Cuisine: ${cuisine}
Flavor Profile: ${flavor_profile}
Course: ${course}
Number of Servings: 4

This recipe should reflect ${chef}'s distinctive cooking style within ${cuisine} cuisine, and capture the essence of the "${flavor_profile}" flavor profile.

# Recipe guidelines:

1. TASTE: First and foremost, the recipe must taste delicious.
2. HEALTH: As long as taste is not compromised, use the Healthy Ingredient Tips, and other to make the recipe healthy.
3. CONVENIENCE: Focus on recipes that are straightforward and use ingredients that can sourced easily.
4. VALUE: Be thoughtful of the cost of a recipe and try to avoid overly expensive ingredients.
5. In the description of the recipe, weave in how the recipe reflects the cuisine, flavor profile, and any thematic affinities (e.g., health-focused elements). Do not mention the chef's style in the recipe or description.
6. Provide minimum internal cooking temperatures for seafood and meats only where necessary for safety (e.g., 145°F for fish, 165°F for poultry), but always pair them with descriptive doneness cues from the 'Cooking technique and doneness cues' section. Prioritize sensory indicators over exact temps in instructions.
7. Include safety instructions for food handling (e.g., 'wash fruits thoroughly under running water') integrated naturally into relevant instruction descriptions, without adding extra fields.

# Healthy Ingredient Tips

## In General
Avoid highly processed foods and use whole, nutrient dense, natural foods whenever possible.

## Fruits
Prioritize low-glycemic fruits with high ANDI scores like berries, cherries, and citrus fruits for their rich polyphenol content and antioxidant properties that support brain health. Avoid high-sugar tropical fruits and focus on seasonal, organic options to minimize pesticide exposure.

## Vegetables
Select non-starchy vegetables with high ANDI scores such as leafy greens (kale, spinach), cruciferous veggies (broccoli, cauliflower), and colorful options like bell peppers for their bioactive compounds including polyphenols and sulforaphane that promote neuroprotection and metabolic stability. Incorporate a variety to maximize nutrient diversity while keeping portions generous for fiber benefits.

## Oils and Fats
Choose natural, unrefined oils like extra-virgin olive oil, avocado oil, and coconut oil for their healthy monounsaturated and medium-chain fats that support metabolic health and reduce inflammation. Avoid high omega-6 seed oils such as soybean, corn, and sunflower oils to maintain a balanced omega-3 to omega-6 ratio beneficial for brain function.

## Animal Proteins
Opt for fatty fish like salmon, mackerel, and sardines rich in omega-3 fatty acids (DHA and EPA) for neuroprotective effects, and grass-fed meats or pasture-raised poultry for higher nutrient profiles and lower inflammatory compounds. Limit processed meats and ensure moderate portions to align with metabolic goals.

## Plant-Based Proteins
Incorporate legumes like lentils and chickpeas, along with tofu and tempeh from non-GMO sources, for their fiber and plant sterols that aid metabolic regulation and provide anti-inflammatory benefits. Supplement with quinoa or hemp seeds for complete amino acid profiles supporting brain repair.

## Grains and Starches
Favor whole, ancient grains such as quinoa, barley, and oats in moderation for their lower glycemic index and beta-glucan content that supports gut-brain axis health. Avoid refined grains and limit overall intake to prevent blood sugar spikes, prioritizing resistant starch sources like cooled potatoes for metabolic benefits.

## Dairy and Alternatives
Select full-fat, fermented dairy like Greek yogurt or kefir from grass-fed sources for probiotics and conjugated linoleic acid that enhance metabolic and cognitive function. Choose unsweetened nut milks (almond, coconut) fortified with vitamins but free from additives for non-dairy options.

## Nuts and Seeds
Emphasize omega-3 rich options like walnuts, flaxseeds, and chia seeds for their neuroprotective ALA content, and include almonds or Brazil nuts for selenium and vitamin E antioxidants. Consume in moderation to balance calorie intake while benefiting from their healthy fats and polyphenols.

## Sweeteners
When appropriate, use natural sweeteners like honey, maple syrup, or agave nectar to sweeten the recipe. Sugar is also an acceptable sweetener but prioritize raw sources over refined.

## Herbs and Spices
Incorporate anti-inflammatory herbs like turmeric (with black pepper for absorption), ginger, and rosemary for their curcumin and polyphenol content that supports brain health and metabolic processes. Use fresh or dried varieties liberally to enhance flavor without adding calories or sugars.

# Cooking technique and doneness cues
Baking and Pastries: Generate recipes using cues like 'golden brown edges' or 'clean toothpick test' instead of exact times, noting oven variability and visual checks.
Seafood: Use sensory indicators like 'flakes easily' or 'shrimp turn pink and curl into a C-shape' over specific temps, except for safety minima (e.g., 145°F).
Vegetables: Describe endpoints like 'fork-tender with caramelized edges' or 'tender-crisp,' avoiding fixed times and encouraging tasting for seasoning.
Eggs and Dairy: Focus on cues like 'whites set, yolk jiggles' or 'soft peaks form,' minimizing temps and emphasizing low-and-slow visual checks.
Grains, Pasta, Legumes: Use descriptors like 'al dente' or 'fluffy and absorbed,' promoting gradual broth addition and tasting over timed steps.
Sauces and Reductions: Suggest 'coats the back of a spoon' or 'syrupy consistency' instead of times, with adjustments for pan size and flavor.
Frying and Oil-Based Cooking: Describe oil readiness as 'shimmers, sizzles with a breadcrumb' and doneness as 'golden and crisp,' alongside temp ranges if needed.
${ingredientTipsSection}`;
}

// Function to sanitize filename
function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

// Function to check if recipe file exists
function recipeExists(recipeName) {
  const filename = `${sanitizeFilename(recipeName)}.recipe.json`;
  const filepath = path.join(RECIPES_OUTPUT_DIR, filename);
  return fs.existsSync(filepath);
}

// Function to save recipe to file
function saveRecipe(recipeName, recipeData) {
  const filename = `${sanitizeFilename(recipeName)}.recipe.json`;
  const filepath = path.join(RECIPES_OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(recipeData, null, 2), 'utf-8');
  console.log(`✓ Saved: ${filename}`);
  return filepath;
}

// Pricing constants (per 1M tokens) - GPT-5
const PRICING = {
  input: 1.250,        // $1.250 per 1M input tokens
  cachedInput: 0.125,  // $0.125 per 1M cached input tokens
  output: 10.000       // $10.000 per 1M output tokens
};

// Function to calculate cost based on token usage
function calculateCost(usage) {
  const inputCost = (usage.prompt_tokens / 1_000_000) * PRICING.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * PRICING.output;
  
  // Check if cached tokens are available in the response
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  const uncachedInputTokens = usage.prompt_tokens - cachedTokens;
  
  const uncachedInputCost = (uncachedInputTokens / 1_000_000) * PRICING.input;
  const cachedInputCost = (cachedTokens / 1_000_000) * PRICING.cachedInput;
  
  return {
    inputCost: cachedTokens > 0 ? uncachedInputCost + cachedInputCost : inputCost,
    outputCost,
    totalCost: (cachedTokens > 0 ? uncachedInputCost + cachedInputCost : inputCost) + outputCost,
    tokens: usage
  };
}

// Function to generate recipe using OpenAI
async function generateRecipe(concept, showPrompt = false, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Generating recipe (attempt ${attempt}/${retries})...`);
      
      const systemPrompt = buildSystemPrompt(concept);
      
      // Log the full prompt only if flag is set
      if (showPrompt) {
        console.log('\n--- FULL PROMPT ---');
        console.log(systemPrompt);
        console.log('--- END PROMPT ---\n');
      }
      
      const response = await openai.chat.completions.create({
        model: 'gpt-5', // GPT-4.1 model
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        //max_tokens: 4096,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content.trim();
      
      // Calculate cost
      const usage = response.usage;
      const cost = calculateCost(usage);
      
      // Parse the JSON response
      let recipe;
      try {
        recipe = JSON.parse(content);
      } catch (parseError) {
        console.error(`  ✗ JSON parse error: ${parseError.message}`);
        if (attempt === retries) throw parseError;
        continue;
      }

      // Validate against schema
      const valid = validateRecipe(recipe);
      if (!valid) {
        console.error(`  ✗ Schema validation failed:`, validateRecipe.errors);
        if (attempt === retries) {
          throw new Error(`Schema validation failed: ${JSON.stringify(validateRecipe.errors)}`);
        }
        continue;
      }

      // Log cost information
      console.log(`  💰 Cost: $${cost.totalCost.toFixed(4)} (Input: ${cost.tokens.prompt_tokens} tokens/$${cost.inputCost.toFixed(4)}, Output: ${cost.tokens.completion_tokens} tokens/$${cost.outputCost.toFixed(4)})`);

      return { recipe, cost };
    } catch (error) {
      console.error(`  ✗ Attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

// Main function
async function main() {
  console.log('Recipe Generator');
  console.log('================\n');

  // Check for command-line arguments
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  const showPrompt = process.argv.includes('--show-prompt');

  // Load recipe concepts
  console.log('Loading recipe concepts...');
  const recipeConcepts = JSON.parse(fs.readFileSync(RECIPE_CONCEPTS_FILE, 'utf-8'));
  
  // Flatten and filter for entrees only
  const entreeConcepts = [];
  for (const [ingredients, concepts] of Object.entries(recipeConcepts)) {
    for (const concept of concepts) {
      if (concept.course === 'Entree') {
        entreeConcepts.push({
          ingredients_combo: ingredients,
          ...concept
        });
      }
    }
  }

  console.log(`Found ${entreeConcepts.length} entree concepts`);
  if (limit) {
    console.log(`Limiting to first ${limit} recipes\n`);
  } else {
    console.log();
  }

  // Process each entree concept
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let generated = 0;
  
  // Cost tracking
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const totalToProcess = limit ? Math.min(limit, entreeConcepts.length) : entreeConcepts.length;

  for (let i = 0; i < totalToProcess; i++) {
    const concept = entreeConcepts[i];
    const { recipe_name } = concept;
    
    console.log(`\n[${i + 1}/${totalToProcess}] ${recipe_name}`);
    
    // Check if recipe already exists
    if (recipeExists(recipe_name)) {
      console.log(`  ⊘ Skipped: Recipe already exists`);
      skipped++;
      processed++;
      continue;
    }

    try {
      // Generate the recipe
      const result = await generateRecipe(concept, showPrompt);
      
      // Save to file
      saveRecipe(recipe_name, result.recipe);
      generated++;
      processed++;
      
      // Track costs
      totalCost += result.cost.totalCost;
      totalInputTokens += result.cost.tokens.prompt_tokens;
      totalOutputTokens += result.cost.tokens.completion_tokens;

      // Rate limiting - wait 1 second between API calls
      if (i < totalToProcess - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ✗ Error generating recipe: ${error.message}`);
      errors++;
      processed++;
    }
  }

  // Summary
  console.log('\n\n=== Summary ===');
  console.log(`Total processed: ${processed}`);
  console.log(`Generated: ${generated}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nRecipes saved to: ${RECIPES_OUTPUT_DIR}`);
  
  // Cost summary
  if (generated > 0) {
    console.log('\n=== Cost Summary ===');
    console.log(`Total tokens used:`);
    console.log(`  Input tokens:  ${totalInputTokens.toLocaleString()}`);
    console.log(`  Output tokens: ${totalOutputTokens.toLocaleString()}`);
    console.log(`  Total tokens:  ${(totalInputTokens + totalOutputTokens).toLocaleString()}`);
    console.log(`\nTotal cost: $${totalCost.toFixed(4)}`);
    console.log(`Average cost per recipe: $${(totalCost / generated).toFixed(4)}`);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

