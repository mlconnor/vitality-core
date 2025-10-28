/**
 * Analyze Flavor Bible Affinities
 * 
 * This script reads flavor_bible_expanded.json and checks for inconsistencies
 * between ingredient names used in flavor_affinities combinations and the
 * actual ingredient names defined at the top level.
 * 
 * For example, "achiote" might be used in combinations but only "achiote seeds"
 * exists as an actual ingredient.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the flavor bible data
const FLAVOR_BIBLE_PATH = path.join(__dirname, '../../../data/flavor_bible_expanded.json');

/**
 * Check if an ingredient exists, including plural variations and word rearrangements
 * @param {string} item - The ingredient name to check (lowercase)
 * @param {Set} ingredientNames - Set of all ingredient names (lowercase)
 * @returns {boolean} True if the ingredient exists or a plural variation exists
 */
function ingredientExists(item, ingredientNames) {
  // Exact match
  if (ingredientNames.has(item)) {
    return true;
  }
  
  // Check if adding 's' creates a match (lemon -> lemons)
  if (ingredientNames.has(item + 's')) {
    return true;
  }
  
  // Check if removing 's' creates a match (lemons -> lemon)
  if (item.endsWith('s') && ingredientNames.has(item.slice(0, -1))) {
    return true;
  }
  
  // Check for 'es' ending (tomato -> tomatoes, potato -> potatoes)
  if (ingredientNames.has(item + 'es')) {
    return true;
  }
  
  // Check if removing 'es' creates a match (tomatoes -> tomato)
  if (item.endsWith('es') && ingredientNames.has(item.slice(0, -2))) {
    return true;
  }
  
  // Check for 'ies' vs 'y' (berry -> berries, cherry -> cherries)
  if (item.endsWith('ies') && ingredientNames.has(item.slice(0, -3) + 'y')) {
    return true;
  }
  
  // Check for 'y' vs 'ies' (cherry -> cherries)
  if (item.endsWith('y') && ingredientNames.has(item.slice(0, -1) + 'ies')) {
    return true;
  }
  
  // Check for word rearrangement: "walnut oil" -> "oil, walnut"
  if (item.includes(' ')) {
    const words = item.split(' ');
    const lastWord = words[words.length - 1];
    const restOfWords = words.slice(0, -1).join(' ');
    const rearranged = `${lastWord}, ${restOfWords}`;
    
    if (ingredientNames.has(rearranged)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Main function to analyze flavor affinities
 */
function analyzeFlavorAffinities() {
  console.log('Reading flavor_bible_expanded.json...\n');
  
  // Read the JSON file
  const data = JSON.parse(fs.readFileSync(FLAVOR_BIBLE_PATH, 'utf8'));
  
  // Build a set of all ingredient names (normalized to lowercase for comparison)
  const ingredientNames = new Set();
  const ingredientNamesOriginal = new Map(); // Keep original casing for display
  
  data.ingredients.forEach(ingredient => {
    const normalizedName = ingredient.name.toLowerCase();
    ingredientNames.add(normalizedName);
    ingredientNamesOriginal.set(normalizedName, ingredient.name);
  });
  
  console.log(`Total ingredients found: ${ingredientNames.size}\n`);
  console.log('Analyzing flavor affinities...\n');
  console.log('=' .repeat(80));
  console.log('\n');
  
  // Track all missing ingredients and where they're used
  const missingIngredients = new Map(); // Map of missing ingredient -> array of ingredients that reference it
  const missingIngredientsCount = new Map(); // Count how many times each missing ingredient appears
  
  // Go through each ingredient and check its flavor affinities
  data.ingredients.forEach(ingredient => {
    if (!ingredient.flavor_affinities || ingredient.flavor_affinities.length === 0) {
      return;
    }
    
    ingredient.flavor_affinities.forEach(affinity => {
      if (!affinity.combination || !Array.isArray(affinity.combination)) {
        return;
      }
      
      // Check each item in the combination
      affinity.combination.forEach(item => {
        const normalizedItem = item.toLowerCase();
        
        // Check if the ingredient exists (exact match or plural variation)
        if (!ingredientExists(normalizedItem, ingredientNames)) {
          // This item doesn't exist as a top-level ingredient
          if (!missingIngredients.has(normalizedItem)) {
            missingIngredients.set(normalizedItem, []);
            missingIngredientsCount.set(normalizedItem, 0);
          }
          
          // Add this ingredient to the list of ingredients that reference the missing item
          if (!missingIngredients.get(normalizedItem).includes(ingredient.name)) {
            missingIngredients.get(normalizedItem).push(ingredient.name);
          }
          
          // Increment count
          missingIngredientsCount.set(
            normalizedItem, 
            missingIngredientsCount.get(normalizedItem) + 1
          );
        }
      });
    });
  });
  
  // Sort missing ingredients by frequency (most common first)
  const sortedMissing = Array.from(missingIngredients.entries())
    .sort((a, b) => {
      const countA = missingIngredientsCount.get(a[0]);
      const countB = missingIngredientsCount.get(b[0]);
      return countB - countA;
    });
  
  // Report results
  if (sortedMissing.length === 0) {
    console.log('✓ No missing ingredients found! All combination items exist as ingredients.');
  } else {
    console.log(`Found ${sortedMissing.length} items used in combinations that don't exist as ingredients:\n`);
    
    // Summary statistics
    const totalReferences = Array.from(missingIngredientsCount.values()).reduce((a, b) => a + b, 0);
    console.log(`Total missing ingredient references: ${totalReferences}\n`);
    console.log('=' .repeat(80));
    console.log('\n');
    
    // Detailed report
    sortedMissing.forEach(([missingItem, referencedBy], index) => {
      const count = missingIngredientsCount.get(missingItem);
      
      console.log(`${index + 1}. "${missingItem}" (used ${count} time${count > 1 ? 's' : ''})`);
      console.log(`   Referenced by ${referencedBy.length} ingredient${referencedBy.length > 1 ? 's' : ''}:`);
      
      // Check if there's a similar ingredient name (potential match)
      const potentialMatches = findPotentialMatches(missingItem, ingredientNames, ingredientNamesOriginal);
      if (potentialMatches.length > 0) {
        console.log(`   Potential matches: ${potentialMatches.join(', ')}`);
      }
      
      console.log(`   Used in combinations with: ${referencedBy.slice(0, 5).join(', ')}${referencedBy.length > 5 ? `, ... (${referencedBy.length - 5} more)` : ''}`);
      console.log('');
    });
    
    console.log('=' .repeat(80));
    console.log('\n');
    
    // Export detailed results to a file
    const outputPath = path.join(__dirname, '../../../data/flavor_affinity_analysis.json');
    const outputData = {
      summary: {
        total_ingredients: ingredientNames.size,
        missing_ingredients_count: sortedMissing.length,
        total_missing_references: totalReferences,
        analyzed_date: new Date().toISOString()
      },
      missing_ingredients: sortedMissing.map(([missingItem, referencedBy]) => ({
        missing_item: missingItem,
        usage_count: missingIngredientsCount.get(missingItem),
        referenced_by: referencedBy,
        potential_matches: findPotentialMatches(missingItem, ingredientNames, ingredientNamesOriginal)
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\nDetailed results exported to: ${outputPath}`);
  }
}

/**
 * Find potential ingredient matches for a missing item
 * @param {string} missingItem - The missing ingredient name
 * @param {Set} ingredientNames - Set of all ingredient names (lowercase)
 * @param {Map} ingredientNamesOriginal - Map of lowercase to original names
 * @returns {Array<string>} Array of potential matches
 */
function findPotentialMatches(missingItem, ingredientNames, ingredientNamesOriginal) {
  const matches = [];
  const exactMatches = [];
  const partialMatches = [];
  
  // Smart compound word lookups for multi-word items
  // Take the last word, put it first with a comma, then the rest
  // e.g., "walnut oil" → "oil, walnut"
  // e.g., "japanese mushrooms" → "mushrooms, japanese"
  // e.g., "red wine vinegar" → "vinegar, red wine"
  if (missingItem.includes(' ')) {
    const words = missingItem.split(' ');
    const lastWord = words[words.length - 1];
    const restOfWords = words.slice(0, -1).join(' ');
    const rearranged = `${lastWord}, ${restOfWords}`;
    
    if (ingredientNames.has(rearranged)) {
      exactMatches.push(ingredientNamesOriginal.get(rearranged));
    }
  }
  
  // Look for ingredients that contain the missing item or vice versa
  for (const ingredientName of ingredientNames) {
    const original = ingredientNamesOriginal.get(ingredientName);
    
    // Skip if already found as exact match
    if (exactMatches.includes(original)) {
      continue;
    }
    
    // Check if the missing item is contained in the ingredient name
    if (ingredientName.includes(missingItem)) {
      partialMatches.push(original);
      continue;
    }
    
    // Check if the ingredient name is contained in the missing item
    if (missingItem.includes(ingredientName)) {
      partialMatches.push(original);
      continue;
    }
    
    // Check for pluralization differences (simple check)
    if (missingItem + 's' === ingredientName || missingItem === ingredientName + 's') {
      partialMatches.push(original);
      continue;
    }
  }
  
  // Combine exact matches first, then partial matches
  const allMatches = [...exactMatches, ...partialMatches];
  
  // Limit to top 3 most relevant matches
  return allMatches.slice(0, 3);
}

// Run the analysis
try {
  analyzeFlavorAffinities();
} catch (error) {
  console.error('Error analyzing flavor affinities:', error);
  process.exit(1);
}

