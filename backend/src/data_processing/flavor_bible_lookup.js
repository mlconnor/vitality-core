import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Course configuration in YAML format
const COURSE_CONFIG = yaml.load(`
# Feature flags
features:
  include_pairing_reasons: false  # Set to true to include 10-word reasons for each pairing (adds ~4-8 seconds per request)

courses:
  vegetables:
    display_name: "Vegetables"
    database_category: "VEGETABLE"
    max_recommendations: 16
    target_categories:
      - Proteins
      - Seafood
      - Cheeses
      - Cuisines
    sql_query: |
      WITH options AS (
        SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
        FROM drive 
        WHERE ItemCat = 'VEGETABLE' 
        AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' 
        AND AllStoreSiteItemName NOT LIKE '%SB6%' 
        AND AllStoreSiteItemName NOT LIKE '%PU4%' 
        AND AllStoreSiteItemName NOT LIKE '%MM5%'
        AND AllStoreSiteItemName NOT LIKE '%(Puree)%'
      )
      SELECT DISTINCT AllStoreSiteItemName, AllStoreSiteItemDescription 
      FROM options
      ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select vegetables suitable as standalone side dishes for a dinner setting, ensuring they are prepared (e.g., roasted, sautéed, steamed) rather than raw or used as seasonings (e.g., exclude items like minced garlic, herbs, or spices unless part of a prepared vegetable dish).
      - Theme: Choose vegetables that are a good match for the theme of the entrée. While the Flavor Bible recommendations are important, we never want to go against the theme of the entrée.
      - Flavor Balance: Choose vegetables that pair well with the main ingredient of the entrée, complementing or balancing its flavor profile to create a cohesive and harmonious dinner experience.
      - Flavor Bible Recommendations: Prioritize vegetables based on the Flavor Bible's compatibility levels for the entrée's main ingredient (Level 4 as highest priority, followed by Level 3, Level 2, and Level 1).
      - Avoid Duplication: Avoid including multiple variations of the same vegetable (e.g., do not include both "Sliced Red Onions" and "Diced Red Onions" or multiple tomato preparations). Select the most dinner-appropriate preparation for each vegetable type.
      - Exact Spelling: Ensure all vegetable names in the JSON array match the exact spellings from the provided vegetable list, with no deviations.

  starches:
    display_name: "Starches"
    database_category: "STARCH"
    max_recommendations: 15
    target_categories:
      - Proteins
      - Seafood
      - Cheeses
      - Cuisines
    sql_query: |
      WITH options AS (
        SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
        FROM drive 
        WHERE ItemCat = 'STARCH' 
        AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' 
        AND AllStoreSiteItemName NOT LIKE '%SB6%' 
        AND AllStoreSiteItemName NOT LIKE '%PU4%' 
        AND AllStoreSiteItemName NOT LIKE '%MM5%'
        AND AllStoreSiteItemName NOT LIKE '%(Puree)%'
      )
      SELECT DISTINCT AllStoreSiteItemName, AllStoreSiteItemDescription 
      FROM options
      ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select starches that serve as substantial side dishes or bases for a dinner setting, including rice dishes, pasta, potatoes, bread, and grain-based preparations.
      - Theme: Choose starches that complement the cultural and culinary theme of the entrée. For example, select rice for Asian dishes, pasta for Italian dishes, or bread for European-style meals.
      - Flavor Balance: Choose starches that provide a neutral or complementary base that doesn't compete with the entrée but rather supports and enhances the overall meal experience.
      - Flavor Bible Recommendations: Prioritize starches based on the Flavor Bible's compatibility levels for the entrée's main ingredient, focusing on traditional pairings and cultural authenticity.
      - Preparation Style: Consider the cooking method and seasoning of the starch to match the entrée's preparation style (e.g., herb-crusted potatoes with roasted meats, garlic rice with seafood).
      - Portion Consideration: Select starches appropriate for side dish portions rather than main course servings.
      - Exact Spelling: Ensure all starch names in the JSON array match the exact spellings from the provided starch list, with no deviations.

  fruits:
    display_name: "Fruits"
    database_category: "FRUIT"
    max_recommendations: 12
    target_categories:
      - Proteins
      - Seafood
      - Cheeses
      - Cuisines
    sql_query: |
      WITH options AS (
        SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
        FROM drive 
        WHERE ItemCat = 'FRUIT' 
        AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' 
        AND AllStoreSiteItemName NOT LIKE '%SB6%' 
        AND AllStoreSiteItemName NOT LIKE '%PU4%'
        AND AllStoreSiteItemName NOT LIKE '%MM5%'
        AND AllStoreSiteItemName NOT LIKE '%(Puree)%'
      )
      SELECT DISTINCT AllStoreSiteItemName, AllStoreSiteItemDescription 
      FROM options
      ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select fruits that are appropriate for a dinner setting.
      - Theme: Choose fruits that align with the culinary tradition and flavor profile of the entrée. For example, citrus for Mediterranean dishes, tropical fruits for Caribbean/Latin cuisine, or stone fruits for American/European preparations.
      - Flavor Balance: Select fruits that provide complementary sweetness, acidity, or freshness to balance rich, savory, or heavy entrées. Consider how the fruit's natural sugars and acids will interact with the main dish.
      - Flavor Bible Recommendations: Prioritize fruits based on the Flavor Bible's compatibility levels for the entrée's main ingredient, focusing on classic pairings like pork with apples, duck with cherries, or fish with citrus.
      - Preparation Style: Consider fruits that are prepared in ways appropriate for dinner service - grilled pineapple, roasted pears, fruit salsas, chutneys, or reductions rather than simple fresh fruit.
      - Seasonal Appropriateness: When possible, select fruits that would be seasonally appropriate and enhance the overall dining experience.
      - Exact Spelling: Ensure all fruit names in the JSON array match the exact spellings from the provided fruit list, with no deviations.

  soups:
    display_name: "Soups"
    database_category: "SOUP"
    max_recommendations: 10
    notes: |
      There are currently 528 soups that come back from the query. This query gets only 
      unique AllStoreSiteItemName, whereas for other recipes we care more about the description.
    target_categories:
      - Proteins
      - Seafood
      - Cuisines
    sql_query: |
        WITH options AS (
            SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
            FROM drive 
            WHERE ItemCat = 'SOUP'
            AND AllStoreSiteItemName NOT LIKE '%Puree%' 
            AND AllStoreSiteItemName NOT LIKE '%SB6%' 
            AND AllStoreSiteItemName NOT LIKE '%PU4%' 
            AND AllStoreSiteItemName NOT LIKE '%MM5%'
        )
        SELECT AllStoreSiteItemName, MAX(AllStoreSiteItemDescription) AS AllStoreSiteItemDescription
        FROM options
        GROUP BY AllStoreSiteItemName
        ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select soups suitable as starters or accompaniments for a dinner setting, ensuring they complement rather than overwhelm the main course.
      - Theme: Choose soups that align with the culinary tradition and regional style of the entrée. For example, French onion soup with French cuisine, miso soup with Asian dishes, or minestrone with Italian meals.
      - Flavor Balance: Select soups that provide complementary flavors and temperature contrast to the entrée. Consider lighter, broth-based soups for rich entrées and heartier soups for lighter mains.
      - Flavor Bible Recommendations: Prioritize soups based on the Flavor Bible's compatibility levels for the entrée's main ingredient, focusing on traditional pairings and regional authenticity.
      - Portion Consideration: Select soups appropriate for starter portions that won't fill up diners before the main course.
      - Exact Spelling: Ensure all soup names in the JSON array match the exact spellings from the provided soup list, with no deviations.

  salads:
    display_name: "Salads"
    database_category: "SALAD"
    max_recommendations: 12
    target_categories:
      - Proteins
      - Seafood
      - Cuisines
    sql_query: |
      WITH options AS (
        SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
        FROM drive 
        WHERE ItemCat = 'SALAD' 
        AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' 
        AND AllStoreSiteItemName NOT LIKE '%SB6%' 
        AND AllStoreSiteItemName NOT LIKE '%PU4%'
        AND AllStoreSiteItemName NOT LIKE '%MM5%'
      )
      SELECT DISTINCT AllStoreSiteItemName, AllStoreSiteItemDescription 
      FROM options
      ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select salads suitable as starters or side dishes for a dinner setting, ensuring they are well-composed and appropriate for plated service.
      - Theme: Choose salads that align with the culinary tradition and regional style of the entrée. For example, Caesar salad with Italian cuisine, Greek salad with Mediterranean dishes, or Asian slaw with Asian entrées.
      - Flavor Balance: Select salads that provide complementary freshness, acidity, or crunch to balance the entrée. Consider the dressing style and how it will pair with the main course.
      - Flavor Bible Recommendations: Prioritize salads based on the Flavor Bible's compatibility levels for the entrée's main ingredient, focusing on traditional pairings and cultural authenticity.
      - Preparation Style: Consider the salad's complexity and whether it serves as a starter or side dish. Match the sophistication level to the entrée.
      - Exact Spelling: Ensure all salad names in the JSON array match the exact spellings from the provided salad list, with no deviations.

  bakery:
    display_name: "Bakery"
    database_category: "BAKERY"
    max_recommendations: 8
    target_categories:
      - Proteins
      - Cuisines
    sql_query: |
      WITH options AS (
        SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost 
        FROM drive 
        WHERE ItemCat = 'BAKERY' 
        AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' 
        AND AllStoreSiteItemName NOT LIKE '%SB6%' 
        AND AllStoreSiteItemName NOT LIKE '%PU4%'
        AND AllStoreSiteItemName NOT LIKE '%MM5%'
      )
      SELECT DISTINCT AllStoreSiteItemName, AllStoreSiteItemDescription 
      FROM options
      ORDER BY AllStoreSiteItemName
    prompt_guidelines: |
      - Dinner Appropriateness: Select breads and baked goods suitable for dinner service, focusing on items that complement the meal rather than sweet breakfast pastries.
      - Theme: Choose breads that align with the culinary tradition of the entrée. For example, French baguette with French cuisine, focaccia with Italian dishes, naan with Indian food, or dinner rolls with American classics.
      - Flavor Balance: Select breads that provide a neutral or complementary base to soak up sauces, balance rich flavors, or add texture to the meal.
      - Flavor Bible Recommendations: Prioritize breads based on the Flavor Bible's compatibility levels for the entrée's cuisine type, focusing on traditional regional pairings.
      - Preparation Style: Consider whether the bread should be rustic, refined, soft, or crusty based on the entrée's style and any sauces that might be served.
      - Portion Consideration: Select breads appropriate for dinner service that complement rather than overshadow the main course.
      - Exact Spelling: Ensure all bakery item names in the JSON array match the exact spellings from the provided bakery list, with no deviations.
`);

/**
 
WITH stuff AS (
  SELECT DISTINCT TRIM(
    CASE 
      WHEN INSTR(AllStoreSiteItemName, ',') > 0 
        THEN SUBSTR(AllStoreSiteItemName, 1, INSTR(AllStoreSiteItemName, ',') - 1)
      WHEN INSTR(AllStoreSiteItemName, '(') > 0 
        THEN SUBSTR(AllStoreSiteItemName, 1, INSTR(AllStoreSiteItemName, '(') - 1)
      ELSE AllStoreSiteItemName
    END
  ) AS recipe
  FROM drive
  WHERE ItemCat = 'VEGETABLE'
SELECT * FROM stuff;


Soup -> Choose soup from entree theme
Salad -> Choose salad from entree theme
Vegetable -> Choose vegettable from entree flavor pairing
Starch -> Choose starch from entree flavor pairing
Other Entrees -> Choose other entrees based on theme and protein from main
Bakery -> Choose bread from entree theme
Dessert -> Choose dessert from entree theme
Beverage -> Choose beverage from entree theme
Dressings & Saucees -> Choose dressing based on salad choice and entree theme

Startup
1. Load the flavor bible data

Realtime
1. Chef choosesan entree (passed in via command line for now)
2. Lookup flavor bible then run LLM to generate a list of ingredients in the flavor bible file that match the entree.
  a) first we select all Proteins, Seafood, Cheeses, and Cuisines from flavor bible.
  b) then we run LLM to ask for a prioritized list of flavor bible entries, sorted by most specific first.
  c) (deferred for now: we filter the compatible_ingredients in the flavor bible to only include vegetables, seasonings, spices, and herbs)
2. Query db to curate items (non commissary, not sb6, not pu4, not mm5). The DB is sqlite3 in /Users/mlconnor/vitality-for-communities/data/meals.db
 > SQL: SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost from drive where ItemCat = 'VEGETABLE' AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' AND AllStoreSiteItemName NOT LIKE '%SB6%' AND AllStoreSiteItemName NOT LIKE '%PU4%' AND AllStoreSiteItemName NOT LIKE '%MM5%'
 > Returns 779 options
3. We run LLM and give it the flavor bible entries and the list of vegetables and ask for a list of prioritized pairings. We need to reformat the flavor bible entries to be more condensed. These would only include the name of the ingredient, combinations, and compatible_ingredients. The compatible ingredients would only innclude the name and the level.
Here is the prompt for the LLM:
    Given the provided list of vegetables and an entrée specified as a variable (ENTRÉE), provide vegetable pairings for the entrée (at most 20), prioritizing the best matches at the top of the list. Return the result as a JSON string array, ensuring the vegetable names match the exact spellings from the provided list. Adhere to the following guidelines:Dinner Appropriateness: Select vegetables suitable as standalone side dishes for a dinner setting, ensuring they are prepared (e.g., roasted, sautéed, steamed) rather than raw or used as seasonings (e.g., exclude items like minced garlic, herbs, or spices unless part of a prepared vegetable dish).
    Flavor Balance: Choose vegetables that pair well with the main ingredient of the entrée, complementing or balancing its flavor profile to create a cohesive and harmonious dinner experience. Consider the entrée’s likely taste and texture based on its main ingredient (e.g., mild and flaky for fish, rich and savory for meats).
    Flavor Bible Recommendations: Prioritize vegetables based on the Flavor Bible’s compatibility levels for the entrée’s main ingredient (Level 4 as highest priority, followed by Level 3, Level 2, and Level 1). If necessary, include vegetables not explicitly listed but aligned with the entrée’s culinary style (e.g., Mediterranean, Asian), supported by the Flavor Bible’s flavor affinities or example dishes.
    Avoid Duplication: Avoid including multiple variations of the same vegetable (e.g., do not include both “Sliced Red Onions” and “Diced Red Onions” or multiple tomato preparations). Select the most dinner-appropriate preparation for each vegetable type.
    Exact Spelling: Ensure all vegetable names in the JSON array match the exact spellings from the provided vegetable list, with no deviations.
4. For each of the pairings recommended by the LLM, we need to verify that the match one of the vegetable items in the list we sent into the LLM. If not, we need to select the next best match (fuzzy matching).
5. Save results to disk in JSON.
6. Return results

This is the list of valid vegetables...
WITH options AS (SELECT AllStoreSiteItemName, AllStoreSiteItemDescription, RecipeCost from drive where ItemCat = 'VEGETABLE' AND AllStoreSiteItemDescription NOT LIKE '%Commissary%' AND AllStoreSiteItemName NOT LIKE '%SB6%' AND AllStoreSiteItemName NOT LIKE '%PU4%' AND AllStoreSiteItemName NOT LIKE '%MM5%')
SELECT distinct AllStoreSiteItemName FROM options;
> 779 Options

 */

/**
 * Read and parse the flavor bible processed JSON file
 */
class FlavorBibleReader {
    constructor() {
        this.data = null;
        this.filePath = path.join(__dirname, '../../../data/flavor_bible_expanded.json');
        this.dbPath = '/Users/mlconnor/vitality-for-communities/data/meals.db';
        this.courseConfig = COURSE_CONFIG.courses;
        this.features = COURSE_CONFIG.features;
    }

    /**
     * Load the flavor bible data from the JSON file
     */
    async loadData() {
        try {
            console.log('Loading flavor bible data...');
            const rawData = fs.readFileSync(this.filePath, 'utf8');
            this.data = JSON.parse(rawData);
            
            console.log(`✅ Loaded ${this.data.ingredients.length} ingredients`);
            return this.data;
        } catch (error) {
            console.error('❌ Error loading flavor bible data:', error.message);
            throw error;
        }
    }




    /**
     * Analyze a recipe and find matching ingredients using LLM
     */
    async analyzeRecipe(recipeName, recipeDescription) {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Get all ingredient names
        const ingredientNames = this.getAllIngredientNames();
        const ingredientList = ingredientNames.join('\n');

        console.log(`🔍 Analyzing recipe: ${recipeName}`);
        console.log(`📝 Description: ${recipeDescription}`);
        console.log(`🤖 Submitting to LLM for ingredient matching...`);

        const prompt = `The following are cuisines, styles, flavors, and ingredients from the Flavor Bible.
${ingredientList}

Your job is to analyze the recipe and return a JSON object with the items from the list that most closely match the recipe. Be sure to use the exact names provided in the list.

# Recipe
Name: ${recipeName}
${recipeDescription}

Return ONLY a JSON object in this exact format:
{
  "matches": [
    ... list of ingredients, styles, flavors, etc.
  ]
}`;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 1000
            });

            const responseText = completion.choices[0].message.content.trim();
            
            console.log(`🤖 LLM Response:`);
            console.log(responseText);
            console.log(''); // Empty line for readability
            
            // Parse the JSON response
            let parsedResponse;
            let matchedIngredients;
            try {
                parsedResponse = JSON.parse(responseText);
                if (!parsedResponse.matches || !Array.isArray(parsedResponse.matches)) {
                    throw new Error('Response does not contain a valid matches array');
                }
                matchedIngredients = parsedResponse.matches;
            } catch (parseError) {
                console.error('❌ Failed to parse LLM response as JSON:', parseError.message);
                console.error('Raw response:', responseText);
                return null;
            }

            console.log(`✅ LLM identified ${matchedIngredients.length} matching ingredients`);
            
            // Find matching ingredients with fuzzy matching
            const foundIngredients = this.findMatchingIngredients(matchedIngredients);
            
            if (foundIngredients.length === 0) {
                console.log('❌ No ingredients found in Flavor Bible data');
                return null;
            }

            console.log(`🎯 Found ${foundIngredients.length} ingredients in Flavor Bible data`);
            
            // Create superset of compatible ingredients
            const compatibleSuperset = this.createCompatibleSuperset(foundIngredients);
            
            return {
                recipeName,
                recipeDescription,
                matchedIngredients: foundIngredients,
                compatibleIngredients: compatibleSuperset
            };

        } catch (error) {
            console.error('❌ Error calling LLM:', error.message);
            return null;
        }
    }

    /**
     * Find matching ingredients with fuzzy matching from a specific list
     */
    findMatchingIngredientsFromList(ingredientNames, ingredientList) {
        const foundIngredients = [];
        const notFound = [];

        ingredientNames.forEach(name => {
            // First try exact match
            let ingredient = ingredientList.find(ing => 
                ing.name.toLowerCase() === name.toLowerCase().trim()
            );
            
            if (!ingredient) {
                // Try fuzzy matching - look for partial matches
                ingredient = ingredientList.find(ing =>
                    ing.name.toLowerCase().includes(name.toLowerCase().trim()) ||
                    name.toLowerCase().includes(ing.name.toLowerCase())
                );
                
                if (ingredient) {
                    console.log(`🔄 Fuzzy matched "${name}" → "${ingredient.name}"`);
                } else {
                    notFound.push(name);
                }
            } else {
                console.log(`✅ Exact match: "${name}"`);
            }
            
            if (ingredient) {
                foundIngredients.push(ingredient);
            }
        });

        if (notFound.length > 0) {
            console.log(`⚠️  Could not find matches for: ${notFound.join(', ')}`);
        }

        return foundIngredients;
    }

    /**
     * Find matching ingredients with fuzzy matching
     */
    findMatchingIngredients(ingredientNames) {
        const foundIngredients = [];
        const notFound = [];

        ingredientNames.forEach(name => {
            // First try exact match
            let ingredient = this.findIngredient(name);
            
            if (!ingredient) {
                // Try fuzzy matching - look for partial matches
                const searchResults = this.searchIngredients(name);
                if (searchResults.length > 0) {
                    // Take the first (best) match
                    ingredient = searchResults[0];
                    console.log(`🔄 Fuzzy matched "${name}" → "${ingredient.name}"`);
                } else {
                    notFound.push(name);
                }
            } else {
                console.log(`✅ Exact match: "${name}"`);
            }
            
            if (ingredient) {
                foundIngredients.push(ingredient);
            }
        });

        if (notFound.length > 0) {
            console.log(`⚠️  Could not find matches for: ${notFound.join(', ')}`);
        }

        return foundIngredients;
    }

    /**
     * Create a superset of compatible ingredients from multiple base ingredients
     */
    createCompatibleSuperset(baseIngredients) {
        const compatibleMap = new Map();

        console.log(`🔗 Creating compatibility superset from ${baseIngredients.length} base ingredients...`);

        baseIngredients.forEach(ingredient => {
            console.log(`  Processing: ${ingredient.name} (${ingredient.compatible_ingredients.length} compatibilities)`);
            
            ingredient.compatible_ingredients.forEach(compatible => {
                const key = compatible.n.toLowerCase();
                
                if (compatibleMap.has(key)) {
                    // Ingredient already exists, sum the levels and track sources
                    const existing = compatibleMap.get(key);
                    existing.totalLevel += compatible.l;
                    existing.count += 1;
                    existing.sources.push(ingredient.name);
                    existing.averageLevel = existing.totalLevel / existing.count;
                } else {
                    // New ingredient
                    compatibleMap.set(key, {
                        name: compatible.n,
                        level: compatible.l,
                        totalLevel: compatible.l,
                        count: 1,
                        averageLevel: compatible.l,
                        sources: [ingredient.name],
                        examples: compatible.e || null
                    });
                }
            });
        });

        // Convert map to array and sort by average level (highest first), then by count
        const sortedCompatible = Array.from(compatibleMap.values())
            .sort((a, b) => {
                // First sort by average level (descending)
                if (b.averageLevel !== a.averageLevel) {
                    return b.averageLevel - a.averageLevel;
                }
                // Then by count (descending) - more sources = better
                return b.count - a.count;
            });

        console.log(`✅ Created superset with ${sortedCompatible.length} unique compatible ingredients`);
        
        return sortedCompatible;
    }

    /**
     * Print recipe analysis results
     */
    printRecipeAnalysis(analysis) {
        if (!analysis) {
            console.log('❌ No analysis results to display');
            return;
        }

        console.log(`\n🍽️  RECIPE ANALYSIS: ${analysis.recipeName.toUpperCase()}`);
        console.log('=' .repeat(50));
        console.log(`📝 Description: ${analysis.recipeDescription}`);
        
        console.log(`\n🎯 MATCHED BASE INGREDIENTS (${analysis.matchedIngredients.length}):`);
        analysis.matchedIngredients.forEach(ingredient => {
            console.log(`  • ${ingredient.name} (${ingredient.compatible_ingredients.length} compatibilities)`);
        });

        console.log(`\n🔗 COMPATIBLE INGREDIENTS (${analysis.compatibleIngredients.length}):`);
        console.log('Sorted by compatibility level (highest first)\n');

        // Group by average level for better display
        const byLevel = {};
        analysis.compatibleIngredients.forEach(item => {
            const levelKey = Math.round(item.averageLevel * 10) / 10; // Round to 1 decimal
            if (!byLevel[levelKey]) byLevel[levelKey] = [];
            byLevel[levelKey].push(item);
        });

        // Sort level keys in descending order
        const sortedLevels = Object.keys(byLevel).sort((a, b) => b - a);

        sortedLevels.forEach(level => {
            const levelName = level >= 3 ? 'HIGHLY COMPATIBLE' : 
                             level >= 2 ? 'MODERATELY COMPATIBLE' : 'BASIC COMPATIBILITY';
            console.log(`\n${levelName} (Level ${level}):`);
            
            byLevel[level].forEach(item => {
                const sources = item.count > 1 ? ` [from ${item.count} ingredients: ${item.sources.join(', ')}]` : ` [from ${item.sources[0]}]`;
                const examples = item.examples ? ` (e.g., ${item.examples})` : '';
                console.log(`  • ${item.name}${examples}${sources}`);
            });
        });

        console.log(`\n📊 SUMMARY:`);
        console.log(`  Base ingredients analyzed: ${analysis.matchedIngredients.length}`);
        console.log(`  Compatible ingredients found: ${analysis.compatibleIngredients.length}`);
        console.log(`  Highly compatible (≥3.0): ${analysis.compatibleIngredients.filter(i => i.averageLevel >= 3).length}`);
        console.log(`  Moderately compatible (2.0-2.9): ${analysis.compatibleIngredients.filter(i => i.averageLevel >= 2 && i.averageLevel < 3).length}`);
        console.log(`  Basic compatibility (1.0-1.9): ${analysis.compatibleIngredients.filter(i => i.averageLevel >= 1 && i.averageLevel < 2).length}`);
    }


    /**
     * Get all ingredient names
     */
    getAllIngredientNames() {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }
        return this.data.ingredients.map(ingredient => ingredient.name);
    }

    /**
     * Find an ingredient by name (case-insensitive)
     */
    findIngredient(name) {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }
        
        const searchName = name.toLowerCase().trim();
        return this.data.ingredients.find(ingredient => 
            ingredient.name.toLowerCase() === searchName
        );
    }

    /**
     * Search for ingredients containing a term (case-insensitive)
     */
    searchIngredients(searchTerm) {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }
        
        const term = searchTerm.toLowerCase().trim();
        return this.data.ingredients.filter(ingredient =>
            ingredient.name.toLowerCase().includes(term)
        );
    }

    /**
     * Get compatible ingredients for a given ingredient
     */
    getCompatibleIngredients(ingredientName) {
        const ingredient = this.findIngredient(ingredientName);
        if (!ingredient) {
            return null;
        }
        return ingredient.compatible_ingredients;
    }

    /**
     * Get compatible ingredients with specific compatibility level
     * @param {string} ingredientName - Name of the ingredient
     * @param {number} level - Compatibility level (1, 2, 3, etc.)
     */
    getCompatibleByLevel(ingredientName, level) {
        const compatible = this.getCompatibleIngredients(ingredientName);
        if (!compatible) {
            return null;
        }
        return compatible.filter(item => item.l === level);
    }

    /**
     * Get highly compatible ingredients (level 3)
     */
    getHighlyCompatible(ingredientName) {
        return this.getCompatibleByLevel(ingredientName, 3);
    }

    /**
     * Get moderately compatible ingredients (level 2)
     */
    getModeratelyCompatible(ingredientName) {
        return this.getCompatibleByLevel(ingredientName, 2);
    }

    /**
     * Get basic compatible ingredients (level 1)
     */
    getBasicCompatible(ingredientName) {
        return this.getCompatibleByLevel(ingredientName, 1);
    }

    /**
     * Get statistics about the flavor bible data
     */
    getStats() {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        const stats = {
            totalIngredients: this.data.ingredients.length,
            totalCompatibilities: 0,
            compatibilityLevels: {},
            ingredientsWithExamples: 0
        };

        this.data.ingredients.forEach(ingredient => {
            // Check if compatible_ingredients exists and is an array
            if (!ingredient.compatible_ingredients || !Array.isArray(ingredient.compatible_ingredients)) {
                return; // Skip ingredients without valid compatible_ingredients
            }
            
            const compatibleCount = ingredient.compatible_ingredients.length;
            stats.totalCompatibilities += compatibleCount;

            // Count ingredients with examples
            const hasExamples = ingredient.compatible_ingredients.some(comp => comp.e);
            if (hasExamples) {
                stats.ingredientsWithExamples++;
            }

            // Count compatibility levels
            ingredient.compatible_ingredients.forEach(comp => {
                const level = comp.l;
                stats.compatibilityLevels[level] = (stats.compatibilityLevels[level] || 0) + 1;
            });
        });

        stats.averageCompatibilities = (stats.totalCompatibilities / stats.totalIngredients).toFixed(2);

        return stats;
    }

    /**
     * Get items from the database by course type
     */
    async getItemsFromDB(courseType) {
        if (!this.courseConfig[courseType]) {
            throw new Error(`Unknown course type: ${courseType}. Available types: ${Object.keys(this.courseConfig).join(', ')}`);
        }

        try {
            const db = new Database(this.dbPath, { readonly: true });
            const config = this.courseConfig[courseType];
            
            // Use the SQL query from the YAML configuration
            const query = config.sql_query;
            
            if (!query) {
                throw new Error(`No SQL query defined for course type: ${courseType}`);
            }

            const stmt = db.prepare(query);
            const rows = stmt.all();
            
            db.close();
            console.log(`✅ Loaded ${rows.length} ${config.display_name.toLowerCase()} from database`);
            return rows;
            
        } catch (error) {
            throw new Error(`Database operation failed: ${error.message}`);
        }
    }


    /**
     * Find flavor bible ingredients that match the entree using LLM
     */
    async findEntreeIngredients(entreeName, courseType = 'vegetables') {
        if (!this.data) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Get target categories from course configuration
        const config = this.courseConfig[courseType];
        if (!config) {
            throw new Error(`Unknown course type: ${courseType}`);
        }
        
        const targetCategories = config.target_categories || ['Proteins', 'Seafood', 'Cheeses', 'Cuisines'];
        
        // Filter ingredients by desired categories
        const filteredIngredients = this.data.ingredients.filter(ingredient => {
            return ingredient.category && targetCategories.some(category => 
                ingredient.category.toLowerCase().includes(category.toLowerCase())
            );
        });

        const ingredientNames = filteredIngredients.map(ingredient => ingredient.name);
        const ingredientList = ingredientNames.join('\n');

        console.log(`🔍 Filtering flavor bible to ${targetCategories.join(', ')} categories`);
        console.log(`📊 Found ${filteredIngredients.length} ingredients in target categories (out of ${this.data.ingredients.length} total)`);
        console.log(`🎯 Target categories: ${targetCategories.join(', ')}`);
        
        // Debug: Show some category examples
        const categoryCount = {};
        filteredIngredients.forEach(ing => {
            categoryCount[ing.category] = (categoryCount[ing.category] || 0) + 1;
        });
        console.log(`📋 Category breakdown:`, categoryCount);

        console.log(`🔍 Finding flavor bible ingredients for entree: ${entreeName}`);

        const prompt = `Given the following list of ingredients from the Flavor Bible and an entree name, identify which ingredients from the list are most relevant to the entree. Focus on the main ingredients, proteins, cooking styles, and cuisines that would be associated with this dish.

Flavor Bible Ingredients:
${ingredientList}

Entree: ${entreeName}

Guidlines:
  - Return up to two matches for protein
  - Up to one cheese if there is cheese in the entree
  - Up to one cuisine type if it is a good match.
Return ONLY a JSON object with the most relevant ingredients in this exact format:
{
  "matches": [
    ... list of ingredient names that match exactly from the provided list
  ]
}`;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            });

            const responseText = completion.choices[0].message.content.trim();
            console.log(`🤖 LLM Response for entree matching:`);
            console.log(responseText);
            
            // Log token usage
            if (completion.usage) {
                console.log(`📊 Token Usage - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);
            }
            
            // Parse the JSON response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
                if (!parsedResponse.matches || !Array.isArray(parsedResponse.matches)) {
                    throw new Error('Response does not contain a valid matches array');
                }
            } catch (parseError) {
                console.error('❌ Failed to parse LLM response as JSON:', parseError.message);
                console.error('Response text:', responseText);
                return [];
            }

            // Find matching ingredients with fuzzy matching from filtered ingredients
            const foundIngredients = this.findMatchingIngredientsFromList(parsedResponse.matches, filteredIngredients);
            console.log(`✅ Found ${foundIngredients.length} matching ingredients in Flavor Bible`);
            
            return foundIngredients;

        } catch (error) {
            console.error('❌ Error calling LLM for entree matching:', error.message);
            return [];
        }
    }

    /**
     * Generate course pairings for an entree
     */
    async generateCoursePairings(entreeName, entreeIngredients, courseItems, courseType) {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        if (!this.courseConfig[courseType]) {
            throw new Error(`Unknown course type: ${courseType}`);
        }

        const config = this.courseConfig[courseType];
        
        // Create condensed flavor bible data for the matched ingredients
        const condensedFlavorData = entreeIngredients.map(ingredient => ({
            name: ingredient.name,
            compatible_ingredients: ingredient.compatible_ingredients.map(comp => ({
                name: comp.n,
                level: comp.l
            }))
        }));

        // Create numbered list of items (1-indexed)
        const numberedItems = courseItems.map((item, index) => 
            `${index + 1}. ${item.AllStoreSiteItemName}`
        );

        console.log(`🍽️ Generating ${config.display_name.toLowerCase()} pairings for ${entreeName} using ${entreeIngredients.length} flavor bible ingredients`);
        console.log(`📋 Available ${config.display_name.toLowerCase()}: ${courseItems.length}`);

        // Build prompt based on whether reasons are enabled
        const includeReasons = this.features.include_pairing_reasons;
        const reasonInstruction = includeReasons 
            ? 'For each recommendation, provide a brief reason (10 words or less) explaining why this pairing works with the entrée.' 
            : '';
        
        const exampleFormat = includeReasons
            ? `{"number": 5, "reason": "Sweet acidity cuts through rich flavors"}`
            : `{"number": 5}`;

        const prompt = `Given the provided numbered list of ${config.display_name.toLowerCase()} and an entrée specified as "${entreeName}", provide ${config.display_name.toLowerCase()} pairings for the entrée (at most ${config.max_recommendations}), prioritizing the best matches at the top of the list.

Flavor Bible Data for Entree:
${JSON.stringify(condensedFlavorData, null, 2)}

Available ${config.display_name} (numbered list):
${numberedItems.join('\n')}

Adhere to the following guidelines:
${config.prompt_guidelines}

IMPORTANT: Return ONLY the item numbers from the list above, NOT the item names. ${reasonInstruction}

Return ONLY a JSON object in this exact format:
{
  "recommendations": [
    ${exampleFormat},
    ${exampleFormat}
  ]
}`;
        const maxTokens = includeReasons ? 2000 : 500;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: maxTokens,
                response_format: { type: "json_object" }
            });

            const responseText = completion.choices[0].message.content.trim();
            console.log(`🤖 LLM ${config.display_name} Pairing Response:`);
            console.log(responseText);
            
            // Log token usage
            if (completion.usage) {
                console.log(`📊 Token Usage - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);
            }
            
            // Parse the JSON response
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
                
                if (!parsedResponse.recommendations || !Array.isArray(parsedResponse.recommendations)) {
                    throw new Error('Response does not contain a valid recommendations array');
                }
                
                // Map the item numbers back to actual items with reasoning
                const recommendedItems = parsedResponse.recommendations.map(rec => {
                    const itemIndex = rec.number - 1; // Convert to 0-indexed
                    if (itemIndex < 0 || itemIndex >= courseItems.length) {
                        console.warn(`⚠️  Invalid item number: ${rec.number} (out of range)`);
                        return null;
                    }
                    
                    const item = {
                        ...courseItems[itemIndex],
                        item_number: rec.number
                    };
                    
                    // Only add pairing_reason if reasons are enabled
                    if (includeReasons) {
                        item.pairing_reason = rec.reason || 'No reason provided';
                    }
                    
                    return item;
                }).filter(item => item !== null); // Remove invalid entries
                
                console.log(`✅ Mapped ${recommendedItems.length} numbered recommendations to database items`);
                return recommendedItems;
                
            } catch (parseError) {
                console.error('❌ Failed to parse LLM response as JSON:', parseError.message);
                console.error('Response text:', responseText);
                return [];
            }

        } catch (error) {
            console.error(`❌ Error calling LLM for ${config.display_name.toLowerCase()} pairing:`, error.message);
            return [];
        }
    }


    /**
     * Validate course recommendations
     * Recommendations should already be validated and include full item data with optional pairing reasons
     */
    validateCourseRecommendations(recommendations, availableItems, courseType) {
        const config = this.courseConfig[courseType];
        const includeReasons = this.features.include_pairing_reasons;
        
        console.log(`✅ Validating ${recommendations.length} ${config.display_name.toLowerCase()} recommendations`);
        
        // Log the recommendations with reasons if enabled
        recommendations.forEach((item, idx) => {
            if (includeReasons && item.pairing_reason) {
                console.log(`${idx + 1}. ${item.AllStoreSiteItemName} - "${item.pairing_reason}"`);
            } else {
                console.log(`${idx + 1}. ${item.AllStoreSiteItemName}`);
            }
        });
        
        return recommendations;
    }


    /**
     * Complete entree pairing workflow
     */
    async pairCoursesWithEntree(entreeName, courseType = 'vegetables') {
        if (!this.courseConfig[courseType]) {
            throw new Error(`Unknown course type: ${courseType}. Available types: ${Object.keys(this.courseConfig).join(', ')}`);
        }

        const config = this.courseConfig[courseType];
        
        console.log(`\n🍽️  STARTING ENTREE PAIRING WORKFLOW`);
        console.log('=' .repeat(50));
        console.log(`🎯 Entree: ${entreeName}`);
        console.log(`🍽️ Course Type: ${config.display_name}`);

        try {
            // Step 1: Load flavor bible data
            if (!this.data) {
                await this.loadData();
            }

            // Step 2: Find matching ingredients in flavor bible
            console.log(`\n📚 Step 2: Finding flavor bible ingredients for entree...`);
            const entreeIngredients = await this.findEntreeIngredients(entreeName, courseType);
            
            if (entreeIngredients.length === 0) {
                console.log('❌ No matching ingredients found in flavor bible');
                return null;
            }

            // Step 3: Get course items from database
            console.log(`\n🍽️ Step 3: Loading ${config.display_name.toLowerCase()} from database...`);
            const courseItems = await this.getItemsFromDB(courseType);

            // Step 4: Generate course pairings using LLM
            console.log(`\n🤖 Step 4: Generating ${config.display_name.toLowerCase()} pairings...`);
            const recommendations = await this.generateCoursePairings(entreeName, entreeIngredients, courseItems, courseType);
            
            if (recommendations.length === 0) {
                console.log(`❌ No ${config.display_name.toLowerCase()} recommendations generated`);
                return null;
            }

            // Step 5: Validate recommendations with fuzzy matching
            console.log(`\n✅ Step 5: Validating recommendations...`);
            const validatedPairings = this.validateCourseRecommendations(recommendations, courseItems, courseType);

            // Step 6: Prepare results
            console.log(`\n💾 Step 6: Preparing results...`);
            const includeReasons = this.features.include_pairing_reasons;
            
            const results = {
                entree: entreeName,
                courseType: courseType,
                timestamp: new Date().toISOString(),
                flavorBibleMatches: entreeIngredients.map(ing => ({
                    name: ing.name,
                    compatibilityCount: ing.compatible_ingredients.length
                })),
                coursePairings: validatedPairings.map(item => {
                    const pairing = {
                        itemNumber: item.item_number,
                        name: item.AllStoreSiteItemName,
                        description: item.AllStoreSiteItemDescription
                    };
                    // Only include pairingReason if reasons are enabled
                    if (includeReasons && item.pairing_reason) {
                        pairing.pairingReason = item.pairing_reason;
                    }
                    return pairing;
                }),
                summary: {
                    flavorBibleMatches: entreeIngredients.length,
                    totalCourseOptions: courseItems.length,
                    recommendedPairings: validatedPairings.length,
                    courseType: config.display_name
                }
            };

            // File caching disabled
            // const outputPath = path.join(__dirname, '../../../data', 'llm_pairings.json');
            // fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
            // console.log(`✅ Results saved to: ${outputPath}`);

            return results;

        } catch (error) {
            console.error('❌ Error in entree pairing workflow:', error.message);
            return null;
        }
    }


    /**
     * Print entree pairing results
     */
    printEntreePairingResults(results) {
        if (!results) {
            console.log('❌ No results to display');
            return;
        }

        console.log(`\n🍽️  ENTREE PAIRING RESULTS: ${results.entree.toUpperCase()}`);
        console.log('=' .repeat(60));
        
        console.log(`\n📚 FLAVOR BIBLE MATCHES (${results.flavorBibleMatches.length}):`);
        results.flavorBibleMatches.forEach(match => {
            console.log(`  • ${match.name} (${match.compatibilityCount} compatibilities)`);
        });

        const courseDisplayName = results.summary?.courseType || 'Course';
        const pairings = results.coursePairings || [];
        
        console.log(`\n🍽️ RECOMMENDED ${courseDisplayName.toUpperCase()} PAIRINGS (${pairings.length}):`);
        pairings.forEach((item, index) => {
            const numberPrefix = item.itemNumber ? `[#${item.itemNumber}] ` : '';
            console.log(`  ${index + 1}. ${numberPrefix}${item.name}`);
            if (item.pairingReason) {
                console.log(`     💡 ${item.pairingReason}`);
            }
            if (item.description) {
                console.log(`     📝 ${item.description}`);
            }
        });

        console.log(`\n📊 SUMMARY:`);
        console.log(`  Flavor Bible matches: ${results.summary.flavorBibleMatches}`);
        console.log(`  Total ${courseDisplayName.toLowerCase()} options: ${results.summary.totalCourseOptions}`);
        console.log(`  Recommended pairings: ${results.summary.recommendedPairings}`);
        console.log(`  Course type: ${courseDisplayName}`);
        console.log(`  Generated: ${new Date(results.timestamp).toLocaleString()}`);
    }

    /**
     * Print ingredient details in a formatted way
     */
    printIngredient(ingredientName) {
        const ingredient = this.findIngredient(ingredientName);
        if (!ingredient) {
            console.log(`❌ Ingredient "${ingredientName}" not found`);
            return;
        }

        console.log(`\n🌿 ${ingredient.name.toUpperCase()}`);
        console.log('=' .repeat(ingredient.name.length + 4));
        
        // Group by compatibility level
        const byLevel = {};
        ingredient.compatible_ingredients.forEach(comp => {
            if (!byLevel[comp.l]) byLevel[comp.l] = [];
            byLevel[comp.l].push(comp);
        });

        // Sort levels in descending order (3, 2, 1)
        const levels = Object.keys(byLevel).sort((a, b) => b - a);
        
        levels.forEach(level => {
            const levelName = level === '3' ? 'HIGHLY COMPATIBLE' : 
                             level === '2' ? 'MODERATELY COMPATIBLE' : 'BASIC COMPATIBILITY';
            console.log(`\n${levelName} (Level ${level}):`);
            
            byLevel[level].forEach(comp => {
                const example = comp.e ? ` (e.g., ${comp.e})` : '';
                console.log(`  • ${comp.n}${example}`);
            });
        });

        console.log(`\nTotal compatible ingredients: ${ingredient.compatible_ingredients.length}`);
    }
}

// Example usage and CLI functionality
async function main() {
    const reader = new FlavorBibleReader();
    
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            // Show usage if no arguments
            console.log('\n🍽️  FLAVOR BIBLE RECIPE ANALYZER');
            console.log('=' .repeat(40));
            console.log('\n💡 Usage examples:');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Chicken Parmesan" vegetables   # Get vegetable pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Chicken Parmesan" starches     # Get starch pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Grilled Pork Chops" fruits     # Get fruit pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Chicken Parmesan" soups        # Get soup pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Grilled Salmon" salads         # Get salad pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js pair "Beef Bourguignon" bakery       # Get bread pairings');
            console.log('  node src/data_processing/flavor_bible_lookup.js analyze "Chicken Parmesan"');
            console.log('  node src/data_processing/flavor_bible_lookup.js analyze "Pasta Carbonara" "Creamy pasta with eggs, bacon, and parmesan cheese"');
            console.log('  node src/data_processing/flavor_bible_lookup.js stats                    # Show flavor bible statistics');
            console.log('  node src/data_processing/flavor_bible_lookup.js search garlic            # Search for garlic');
            console.log('  node src/data_processing/flavor_bible_lookup.js list | head -20          # List ingredients');
            console.log('  node src/data_processing/flavor_bible_lookup.js tomato                   # Show tomato details');
            console.log('\n🚀 Main Feature: Course Pairing');
            console.log('  The "pair" command takes an entree name and course type,');
            console.log('  finds matching ingredients in the Flavor Bible, and suggests pairings from the database.');
            console.log('  Course types: vegetables (default), starches, fruits, soups, salads, bakery');
            console.log('\n🔍 Other Features:');
            console.log('  The "analyze" command takes a recipe name and description,');
            console.log('  finds matching ingredients using AI, and suggests compatible');
            console.log('  ingredients from the Flavor Bible sorted by compatibility level.');
            return;
            
        } else if (args[0] === 'pair') {
            // Pair courses with entree
            if (args.length < 2) {
                console.log('❌ Please provide an entree name');
                console.log('Usage: node src/data_processing/flavor_bible_lookup.js pair "Entree Name" [course_type]');
                console.log('Available course types: vegetables, starches, fruits, soups, salads, bakery');
                return;
            }
            
            const entreeName = args[1];
            const courseType = args[2] || 'vegetables'; // Default to vegetables for backward compatibility
            
            // Validate course type
            const availableCourses = Object.keys(reader.courseConfig);
            if (!availableCourses.includes(courseType)) {
                console.log(`❌ Invalid course type: ${courseType}`);
                console.log(`Available course types: ${availableCourses.join(', ')}`);
                return;
            }
            
            // Load the data and run pairing workflow
            const results = await reader.pairCoursesWithEntree(entreeName, courseType);
            
            if (results) {
                reader.printEntreePairingResults(results);
            }
            
        } else if (args[0] === 'analyze') {
            // Analyze a recipe
            if (args.length < 2) {
                console.log('❌ Please provide a recipe name');
                console.log('Usage: node src/data_processing/flavor_bible_lookup.js analyze "Recipe Name" ["Optional description"]');
                return;
            }
            
            const recipeName = args[1];
            const recipeDescription = args[2] || null; // Optional description
            
            // Load the data
            await reader.loadData();
            
            // Analyze the recipe
            const analysis = await reader.analyzeRecipe(recipeName, recipeDescription);
            
            if (analysis) {
                reader.printRecipeAnalysis(analysis);
            }
            
        } else if (args[0] === 'stats') {
            // Load the data
            await reader.loadData();
            
            // Show stats
            console.log('\n📊 FLAVOR BIBLE STATISTICS');
            console.log('=' .repeat(30));
            const stats = reader.getStats();
            console.log(`Total ingredients: ${stats.totalIngredients}`);
            console.log(`Total compatibilities: ${stats.totalCompatibilities}`);
            console.log(`Average compatibilities per ingredient: ${stats.averageCompatibilities}`);
            console.log(`Ingredients with examples: ${stats.ingredientsWithExamples}`);
            console.log('\nCompatibility level distribution:');
            Object.entries(stats.compatibilityLevels)
                .sort(([a], [b]) => b - a)
                .forEach(([level, count]) => {
                    console.log(`  Level ${level}: ${count} compatibilities`);
                });
            
        } else if (args[0] === 'search') {
            // Search for ingredients
            const searchTerm = args[1];
            if (!searchTerm) {
                console.log('❌ Please provide a search term');
                return;
            }
            
            // Load the data
            await reader.loadData();
            
            const results = reader.searchIngredients(searchTerm);
            console.log(`\n🔍 Found ${results.length} ingredients matching "${searchTerm}":`);
            results.forEach(ingredient => {
                console.log(`  • ${ingredient.name} (${ingredient.compatible_ingredients.length} compatibilities)`);
            });
            
        } else if (args[0] === 'list') {
            // List all ingredient names
            // Load the data
            await reader.loadData();
            
            const names = reader.getAllIngredientNames();
            names.forEach(name => console.log(name));
            
        } else {
            // Show specific ingredient details
            const ingredientName = args.join(' ');
            
            // Load the data
            await reader.loadData();
            
            reader.printIngredient(ingredientName);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Export the class for use in other modules
export default FlavorBibleReader;

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}