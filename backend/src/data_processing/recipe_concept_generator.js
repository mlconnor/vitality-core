import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';


// jq -r '[.[] | .[] | .cuisine] | group_by(.) | map({cuisine: .[0], count: length}) | sort_by(.count) | reverse | .[] | "\(.count)\t\(.cuisine)"' ~/vitality-core/data/recipe_concepts.json
// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// File paths
const AFFINITIES_FILE = path.join(__dirname, '../../../data/flavor_bible_affinities.txt');
const PROMPT_FILE = path.join(__dirname, '../../../data/recipe_concept_prompt.txt');
const OUTPUT_FILE = path.join(__dirname, '../../../data/recipe_concepts.json');

// The system prompt with all the flavor profiles, themes, and chef styles
const SYSTEM_PROMPT = `The data you need for this task is as follows:
===
flavor_profiles:
  Comfort-forward:
    Sweet: 3
    Sour/Acid: 2
    Salty: 7
    Bitter: 2
    Umami/Savory: 8
    Creamy/Rich/Fatty: 9
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 4
  Rich & Savoury:
    Sweet: 2
    Sour/Acid: 2
    Salty: 7
    Bitter: 1
    Umami/Savory: 9
    Creamy/Rich/Fatty: 9
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 5
  Creamy & Mild:
    Sweet: 3
    Sour/Acid: 2
    Salty: 5
    Bitter: 1
    Umami/Savory: 6
    Creamy/Rich/Fatty: 10
    Crunchy/Textural Contrast: 3
    Spicy/Aromatic/Herbal: 3
  Salty-Craveable:
    Sweet: 2
    Sour/Acid: 1
    Salty: 9
    Bitter: 1
    Umami/Savory: 8
    Creamy/Rich/Fatty: 8
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 3
  Umami Bomb (Meaty Depth):
    Sweet: 1
    Sour/Acid: 2
    Salty: 6
    Bitter: 2
    Umami/Savory: 10
    Creamy/Rich/Fatty: 9
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 6
  Fresh-bright:
    Sweet: 3
    Sour/Acid: 8
    Salty: 4
    Bitter: 3
    Umami/Savory: 6
    Creamy/Rich/Fatty: 5
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 7
  Citrus-lifted:
    Sweet: 4
    Sour/Acid: 9
    Salty: 3
    Bitter: 2
    Umami/Savory: 5
    Creamy/Rich/Fatty: 4
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 6
  Herbal-aromatic:
    Sweet: 3
    Sour/Acid: 6
    Salty: 3
    Bitter: 3
    Umami/Savory: 5
    Creamy/Rich/Fatty: 5
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 9
  Clean & Light:
    Sweet: 3
    Sour/Acid: 7
    Salty: 2
    Bitter: 2
    Umami/Savory: 4
    Creamy/Rich/Fatty: 4
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 6
  Pickled & Sharp:
    Sweet: 2
    Sour/Acid: 9
    Salty: 4
    Bitter: 2
    Umami/Savory: 5
    Creamy/Rich/Fatty: 4
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 6
  Bitter-Greens Driven:
    Sweet: 2
    Sour/Acid: 5
    Salty: 3
    Bitter: 8
    Umami/Savory: 5
    Creamy/Rich/Fatty: 5
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 7
  Dark & Cocoa-Like:
    Sweet: 3
    Sour/Acid: 2
    Salty: 3
    Bitter: 7
    Umami/Savory: 6
    Creamy/Rich/Fatty: 7
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 6
  Spiced-Bitter:
    Sweet: 2
    Sour/Acid: 4
    Salty: 4
    Bitter: 7
    Umami/Savory: 6
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 8
  Tannic/Tea-Like:
    Sweet: 2
    Sour/Acid: 3
    Salty: 2
    Bitter: 6
    Umami/Savory: 4
    Creamy/Rich/Fatty: 4
    Crunchy/Textural Contrast: 3
    Spicy/Aromatic/Herbal: 7
  Earthy-Rooted:
    Sweet: 3
    Sour/Acid: 4
    Salty: 3
    Bitter: 6
    Umami/Savory: 5
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 6
  Sweet-Savory Balance:
    Sweet: 6
    Sour/Acid: 4
    Salty: 5
    Bitter: 2
    Umami/Savory: 7
    Creamy/Rich/Fatty: 7
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 6
  Natural-Sweet:
    Sweet: 7
    Sour/Acid: 3
    Salty: 3
    Bitter: 2
    Umami/Savory: 5
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 4
    Spicy/Aromatic/Herbal: 5
  Sweet-Spicy:
    Sweet: 6
    Sour/Acid: 4
    Salty: 4
    Bitter: 3
    Umami/Savory: 6
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 8
  Sweet-Sour Contrast:
    Sweet: 7
    Sour/Acid: 7
    Salty: 4
    Bitter: 2
    Umami/Savory: 5
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 7
  Caramelized-Rich:
    Sweet: 6
    Sour/Acid: 3
    Salty: 5
    Bitter: 2
    Umami/Savory: 7
    Creamy/Rich/Fatty: 8
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 5
  Mediterranean Aromatic:
    Sweet: 3
    Sour/Acid: 5
    Salty: 4
    Bitter: 3
    Umami/Savory: 6
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 8
  Middle Eastern Spiced:
    Sweet: 3
    Sour/Acid: 5
    Salty: 5
    Bitter: 4
    Umami/Savory: 7
    Creamy/Rich/Fatty: 7
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 9
  Indian Spice-Layered:
    Sweet: 3
    Sour/Acid: 4
    Salty: 5
    Bitter: 5
    Umami/Savory: 8
    Creamy/Rich/Fatty: 7
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 9
  East Asian Umami-Light:
    Sweet: 2
    Sour/Acid: 6
    Salty: 4
    Bitter: 2
    Umami/Savory: 7
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 7
  Latin Spice-Bright:
    Sweet: 3
    Sour/Acid: 8
    Salty: 4
    Bitter: 3
    Umami/Savory: 6
    Creamy/Rich/Fatty: 6
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 8
  Crunchy-Contrast:
    Sweet: 3
    Sour/Acid: 4
    Salty: 4
    Bitter: 3
    Umami/Savory: 6
    Creamy/Rich/Fatty: 5
    Crunchy/Textural Contrast: 9
    Spicy/Aromatic/Herbal: 6
  Silky-Cream Base:
    Sweet: 3
    Sour/Acid: 2
    Salty: 4
    Bitter: 2
    Umami/Savory: 6
    Creamy/Rich/Fatty: 10
    Crunchy/Textural Contrast: 3
    Spicy/Aromatic/Herbal: 5
  Charred-Grilled:
    Sweet: 2
    Sour/Acid: 3
    Salty: 5
    Bitter: 4
    Umami/Savory: 7
    Creamy/Rich/Fatty: 7
    Crunchy/Textural Contrast: 6
    Spicy/Aromatic/Herbal: 6
  Juicy-Fresh:
    Sweet: 4
    Sour/Acid: 7
    Salty: 3
    Bitter: 2
    Umami/Savory: 5
    Creamy/Rich/Fatty: 8
    Crunchy/Textural Contrast: 5
    Spicy/Aromatic/Herbal: 6
  Layered-Complex:
    Sweet: 4
    Sour/Acid: 5
    Salty: 5
    Bitter: 3
    Umami/Savory: 7
    Creamy/Rich/Fatty: 8
    Crunchy/Textural Contrast: 8
    Spicy/Aromatic/Herbal: 9

# Cuisines with chef and common flavor profile
cuisines:
  - name: Mediterranean
    description: Herbaceous, citrus, olive oil, umami
    chefs: [Ottolenghi, José Andrés, Jamie Oliver]
    flavor_profiles:
      - primary: Mediterranean Aromatic
      - secondary: [Citrus-Lifted, Umami-Rich, Bitter-Greens Driven]
  - name: New Nordic
    description: Foraged, acidic, fermented, clean
    chefs: [Redzepi, Sarah Britton, Tom Hunt]
    flavor_profiles:
      - primary: Clean & Light
      - secondary: [Herbal-Aromatic, Pickled & Sharp, Earthy-Rooted]
  - name: Ayurvedic Indian
    description: Warm spices, ghee, lentils, balance
    chefs: [Madhur Jaffrey, Meera Sodha]
    flavor_profiles:
      - primary: Indian Spice-Layered
      - secondary: [Warm-Spiced, Sweet-Savory, Earthy-Rooted]
  - name: Plant-Based Global
    description: Earthy, nutty, root-veg, minimal sugar
    chefs: [Ella Mills, Sarah Britton]
    flavor_profiles:
      - primary: Earthy-Rooted
      - secondary: [Natural-Sweet, Herbal-Aromatic, Bitter-Greens Driven]
  - name: Spanish-Latin Fusion
    description: Smoked, chili-acid, tomato-rich
    chefs: [José Andrés, Ray Garcia, Seamus Mullen]
    flavor_profiles:
      - primary: Latin Spice-Bright
      - secondary: [Smoky-Savory, Sweet-Sour Contrast, Citrus-Lifted]
  - name: California Farm-to-Table
    description: Minimalist, fresh-picked, clean
    chefs: [Alice Waters, Dan Barber]
    flavor_profiles:
      - primary: Fresh-Bright
      - secondary: [Clean & Light, Herbal-Aromatic, Natural-Sweet]
  - name: African Heritage
    description: Spiced grains, okra, berbere, peanuts
    chefs: [Bryant Terry, Pierre Thiam]
    flavor_profiles:
      - primary: Spiced-Bitter
      - secondary: [Earthy-Rooted, Smoky-Savory, Nutty-Rich]
  - name: Asian Heritage
    description: Umami, ginger, garlic, soy, greens
    chefs: [Meera Sodha, Madhur Jaffrey]
    flavor_profiles:
      - primary: East Asian Umami-Light
      - secondary: [Pickled & Sharp, Sweet-Spicy, Herbal-Aromatic]
  - name: Latin American Heritage
    description: Corn, beans, lime, squash, tamarind
    chefs: [Ray Garcia, José Andrés]
    flavor_profiles:
      - primary: Latin Spice-Bright
      - secondary: [Sweet-Sour Contrast, Smoky-Savory, Citrus-Lifted]
  - name: Southern US Heritage
    description: Greens, cornmeal, smoked fish
    chefs: [Bryant Terry]
    flavor_profiles:
      - primary: Comfort-Forward
      - secondary: [Earthy-Rooted, Smoky-Savory, Bitter-Greens Driven]
  - name: Ikarian Greek
    description: Olives, lentils, herbs, bitter greens
    chefs: [Diane Kochilas]
    flavor_profiles:
      - primary: Bitter-Greens Driven
      - secondary: [Mediterranean Aromatic, Citrus-Lifted, Umami-Rich]
  - name: Japanese Washoku
    description: Miso, seaweed, dashi, pickled veg
    chefs: [Nobu Matsuhisa, Nancy Singleton Hachisu]
    flavor_profiles:
      - primary: East Asian Umami-Light
      - secondary: [Pickled & Sharp, Clean & Light, Herbal-Aromatic]
  - name: Chinese Regional
    description: Scallions, garlic, soy, bitter melon
    chefs: [Fuchsia Dunlop]
    flavor_profiles:
      - primary: East Asian Umami-Light
      - secondary: [Pickled & Sharp, Sweet-Spicy, Smoky-Savory]
  - name: Korean
    description: Fermented, sesame, lotus root
    chefs: [Jeong Kwan]
    flavor_profiles:
      - primary: Umami Bomb
      - secondary: [Pickled & Sharp, Herbal-Aromatic, Spiced-Bitter]
  - name: Thai Herbal
    description: Lemongrass, coconut, chili, lime leaf
    chefs: [Jet Tila]
    flavor_profiles:
      - primary: Sweet-Spicy
      - secondary: [Citrus-Lifted, Herbal-Aromatic, Umami-Rich]
  - name: West African
    description: Peanut, chili, greens, yam
    chefs: [Pierre Thiam]
    flavor_profiles:
      - primary: Spiced-Bitter
      - secondary: [Earthy-Rooted, Nutty-Rich, Smoky-Savory]
  - name: Persian
    description: Rose, saffron, lime, walnuts, herbs
    chefs: [Najmieh Batmanglij]
    flavor_profiles:
      - primary: Middle Eastern Spiced
      - secondary: [Sweet-Sour Contrast, Herbal-Aromatic, Nutty-Rich]
  - name: American Barbecue
    description: Smoky, grilled lean meats or vegetables with tangy, low-sugar sauces; antioxidant-rich sides
    chefs: [Rodney Scott, Steven Raichlen]
    flavor_profiles:
      - primary: Charred-Grilled
      - secondary: [Fresh-Bright, Smoky-Savory, Sweet-Sour Contrast]
  - name: Cajun/Creole Coastal
    description: Spicy, seafood-focused dishes with omega-3-rich fish, vibrant vegetables, and low-glycemic grains like farro
    chefs: [Leah Chase, Donald Link]
    flavor_profiles:
      - primary: Latin Spice-Bright
      - secondary: [Herbal-Aromatic, Smoky-Savory, Umami-Rich]
  - name: French Haute
    description: Refined, rich sauces, precise techniques, elegant presentation
    chefs: [Alain Ducasse, Joël Robuchon]
    flavor_profiles:
      - primary: Refined-Rich
      - secondary: [Umami-Rich, Herbal-Aromatic, Sweet-Savory]
  - name: French Rustic
    description: Hearty, simple, countryside-inspired, root vegetables
    chefs: [Daniel Boulud, Jacques Pépin]
    flavor_profiles:
      - primary: Comfort-Forward
      - secondary: [Earthy-Rooted, Herbal-Aromatic, Umami-Rich]
  - name: Italian Trattoria
    description: Rustic, pasta-heavy, tomato, herbs, olive oil
    chefs: [Lidia Bastianich, Marcella Hazan]
    flavor_profiles:
      - primary: Mediterranean Aromatic
      - secondary: [Comfort-Forward, Umami-Rich, Citrus-Lifted]
  - name: Spanish Tapas
    description: Small plates, bold flavors, seafood, cured meats
    chefs: [Ferran Adrià, José Pizarro]
    flavor_profiles:
      - primary: Latin Spice-Bright
      - secondary: [Smoky-Savory, Umami-Rich, Citrus-Lifted]
  - name: Mexican Regional
    description: Corn, chilies, mole, regional spices
    chefs: [Enrique Olvera, Rick Bayless]
    flavor_profiles:
      - primary: Latin Spice-Bright
      - secondary: [Smoky-Savory, Sweet-Sour Contrast, Earthy-Rooted]
  - name: Middle Eastern Mezze
    description: Hummus, falafel, yogurt, fresh herbs
    chefs: [Yotam Ottolenghi, Sami Tamimi]
    flavor_profiles:
      - primary: Mediterranean Aromatic
      - secondary: [Fresh-Bright, Herbal-Aromatic, Nutty-Rich]

=======

TASK: Generate recipe concepts for flavor affinities that promote metabolic and brain health.

For each provided flavor affinity, create up to 8 recipe concepts by matching the affinity to appropriate cuisines, chefs, and flavor profiles from the provided cuisines data. Generate more recipes when the affinity aligns with multiple cuisines, chefs, or flavor profiles.

Recipe Criteria:
- chef: Must be a chef name from the cuisines data (e.g., Ottolenghi, José Andrés, Redzepi, etc.).
- cuisine: Must be a cuisine name from the cuisines data (e.g., Mediterranean Cuisine, New Nordic Cuisine, etc.).
- flavor_profile: Must be a flavor profile (primary or secondary) from the cuisines data’s flavor_profiles field (e.g., Mediterranean Aromatic, Clean & Light, etc.).
- course: Must be one of: Appetizer, Bread, Beverage, Breakfast, Cereal & Oatmeal, Dessert, Entree, Entree - Salad, Entree - Soup, Fruit Salad, Pizza, Salad, Salad Dressing, Sandwich, Snack, Appetizer Soup, Spice Mix/Rub & Marinade, Starch, Vegetable, Stock & Sauce.
- recipe_name: Create a descriptive, appealing recipe name that reflects the cuisine and flavor profile, aligning with a menu-style presentation.

Guidelines:
- Match each flavor affinity to cuisines, chefs, and flavor profiles (primary or secondary) that make culinary sense based on the provided data.
- Use a variety of cuisines, not only traditionally 'healthy' ones like Mediterranean Cuisine, to ensure diversity.
- Prioritize the primary flavor profile for a cuisine but allow secondary flavor profiles to increase recipe variety.
- Focus on whole foods, anti-inflammatory ingredients, and metabolically friendly recipes.
- Consider animal fats as healthy components.
- Use familiar, accessible ingredients, avoiding exotic or hard-to-find items.
- Keep recipes simple and not overly time-consuming to prepare.
- Recipe quantity guidelines:
  - 1-2 recipes: When the affinity is highly specific to one cuisine or flavor profile.
  - 3-5 recipes: When the affinity aligns with a few cuisines or flavor profiles.
  - 6-8 recipes: When the affinity is versatile and works across many cuisines or flavor profiles.
- Vary the chef, cuisine, and flavor profile across recipes for each affinity to explore diverse culinary approaches.
- Include all provided affinities in the output as keys in the JSON object.

Output Format:
- Type: JSON
- Structure: 
  - Keys: Exact flavor affinities provided.
  - Values: Arrays of recipe objects containing chef, cuisine, flavor_profile, course, and recipe_name.
- Requirements: Output only valid JSON, with no explanatory text before or after.

"[flavor affinity]": [{
    "chef": ...,
    "cuisine": ...
    "flavor_profile": ...,
    "course": ...,
    "recipe_name": ...
  },

`;

/**
 * Load existing recipe concepts from the output file
 * Returns an object where keys are affinities and values are arrays of recipes
 */
function loadExistingConcepts() {
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const content = fs.readFileSync(OUTPUT_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Could not load existing concepts:', error.message);
  }
  return {};
}

/**
 * Save recipe concepts to the output file
 */
function saveConcepts(concepts) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(concepts, null, 2), 'utf-8');
}

/**
 * Load affinities from the input file
 */
function loadAffinities() {
  const content = fs.readFileSync(AFFINITIES_FILE, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('Volume:') && !line.startsWith('Taste:') && !line.startsWith('Tips:'));
}

/**
 * Validate that a recipe has all required fields
 */
function validateRecipe(recipe, affinity) {
  const requiredFields = ['chef', 'cuisine', 'flavor_profile', 'course', 'recipe_name'];
  const missingFields = requiredFields.filter(field => !recipe[field] || typeof recipe[field] !== 'string' || recipe[field].trim() === '');
  
  if (missingFields.length > 0) {
    console.warn(`Invalid recipe for "${affinity}": missing or invalid fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  return true;
}

/**
 * Generate recipe concepts for a batch of affinities
 * Returns an object where keys are affinities and values are arrays of recipes
 */
async function generateRecipeConcepts(affinities) {
  const userMessage = `Generate recipe concepts for these affinities:\n\n${affinities.join('\n')}`;
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    const result = JSON.parse(responseText);
    
    // The result should be an object with affinities as keys
    // Validate all recipes and ensure all requested affinities are present
    const conceptsObj = {};
    for (const affinity of affinities) {
      if (result[affinity] && Array.isArray(result[affinity])) {
        const recipes = result[affinity];
        
        // Validate all recipes for this affinity
        const allValid = recipes.every(recipe => validateRecipe(recipe, affinity));
        
        if (allValid && recipes.length > 0) {
          conceptsObj[affinity] = recipes;
        } else {
          if (!allValid) {
            console.warn(`⚠ Discarding all recipes for "${affinity}" due to validation failure. Will retry on next run.`);
          }
          conceptsObj[affinity] = [];
        }
      } else {
        console.warn(`Missing or invalid affinity in response: ${affinity}`);
        conceptsObj[affinity] = [];
      }
    }
    
    return conceptsObj;
  } catch (error) {
    console.error('Error generating concepts for batch');
    console.error('Error:', error.message);
    // Return empty arrays for all affinities rather than throwing
    const conceptsObj = {};
    for (const affinity of affinities) {
      conceptsObj[affinity] = [];
    }
    return conceptsObj;
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('Starting recipe concept generation...\n');

  // Load existing concepts (object format: { "affinity": [...recipes] })
  const existingConcepts = loadExistingConcepts();
  // Only count affinities that have at least one recipe as processed
  const processedAffinities = new Set(
    Object.entries(existingConcepts)
      .filter(([_, recipes]) => recipes && recipes.length > 0)
      .map(([affinity, _]) => affinity)
  );
  console.log(`Loaded ${processedAffinities.size} existing concepts with recipes`);

  // Load all affinities
  const allAffinities = loadAffinities();
  console.log(`Found ${allAffinities.length} total affinities`);

  // Filter out already processed affinities
  const remainingAffinities = allAffinities.filter(a => !processedAffinities.has(a));
  console.log(`${remainingAffinities.length} affinities remaining to process\n`);

  if (remainingAffinities.length === 0) {
    console.log('All affinities have been processed!');
    return;
  }

  // Process in batches of 50
  const BATCH_SIZE = 30;
  let allConcepts = { ...existingConcepts };
  const totalBatches = Math.ceil(remainingAffinities.length / BATCH_SIZE);

  for (let i = 0; i < remainingAffinities.length; i += BATCH_SIZE) {
    const batch = remainingAffinities.slice(i, Math.min(i + BATCH_SIZE, remainingAffinities.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\n=== Batch ${batchNum}/${totalBatches} (${batch.length} affinities) ===`);
    console.log(`Processing affinities ${i + 1} to ${i + batch.length}...`);
    
    try {
      const batchConcepts = await generateRecipeConcepts(batch);
      
      // Merge batch results into allConcepts
      let recipesAdded = 0;
      for (const [affinity, recipes] of Object.entries(batchConcepts)) {
        allConcepts[affinity] = recipes;
        recipesAdded += recipes.length;
      }
      
      // Save after each batch
      saveConcepts(allConcepts);
      
      const totalAffinities = Object.keys(allConcepts).length;
      console.log(`✓ Batch ${batchNum} complete. Added ${recipesAdded} recipes for ${batch.length} affinities.`);
      console.log(`  Total affinities processed: ${totalAffinities}/${allAffinities.length}\n`);
      
      // Rate limiting: wait 2 seconds between batches to avoid rate limits
      if (i + BATCH_SIZE < remainingAffinities.length) {
        console.log('Waiting 2 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`✗ Error processing batch ${batchNum}:`, error.message);
      console.log('Saving progress and continuing...\n');
      saveConcepts(allConcepts);
      // Continue to next batch even if this one fails
    }
  }

  console.log('\n=== Summary ===');
  const totalAffinities = Object.keys(allConcepts).length;
  const totalRecipes = Object.values(allConcepts).reduce((sum, recipes) => sum + recipes.length, 0);
  console.log(`Total affinities processed: ${totalAffinities}/${allAffinities.length}`);
  console.log(`Total recipes generated: ${totalRecipes}`);
  console.log(`Output saved to: ${OUTPUT_FILE}`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
