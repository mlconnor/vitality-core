import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const RECIPES_DIR = path.join(__dirname, '../../../data/recipes');
const HTML_OUTPUT_DIR = path.join(__dirname, '../../../data/recipes_html');

// Ensure output directory exists
if (!fs.existsSync(HTML_OUTPUT_DIR)) {
  fs.mkdirSync(HTML_OUTPUT_DIR, { recursive: true });
  console.log(`Created HTML directory: ${HTML_OUTPUT_DIR}`);
}

// CSS for recipe styling
const RECIPE_CSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Georgia', 'Times New Roman', serif;
  line-height: 1.6;
  color: #333;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
  background: #fff;
}

h1 {
  font-size: 2.5em;
  margin-bottom: 0.5em;
  color: #2c3e50;
  border-bottom: 3px solid #e74c3c;
  padding-bottom: 0.3em;
}

h2 {
  font-size: 1.8em;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #34495e;
  border-bottom: 2px solid #95a5a6;
  padding-bottom: 0.2em;
}

h3 {
  font-size: 1.3em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #555;
}

.description {
  font-size: 1.1em;
  font-style: italic;
  color: #555;
  margin-bottom: 2em;
  line-height: 1.8;
}

.recipe-info {
  background: #f8f9fa;
  border-left: 4px solid #e74c3c;
  padding: 20px;
  margin: 2em 0;
  border-radius: 4px;
}

.recipe-info h2 {
  margin-top: 0;
  border-bottom: none;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 1em;
}

.info-item {
  padding: 8px 0;
}

.info-label {
  font-weight: bold;
  color: #2c3e50;
}

.info-value {
  color: #555;
}

.sub-recipes {
  background: #fff4e6;
  border: 2px solid #ffa500;
  padding: 20px;
  margin: 2em 0;
  border-radius: 4px;
}

.sub-recipe {
  margin: 1.5em 0;
  padding: 1em;
  background: white;
  border-radius: 4px;
}

.ingredients-list, .sub-ingredients-list {
  list-style: none;
  margin: 1em 0;
}

.ingredients-list li, .sub-ingredients-list li {
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

.ingredients-list li:last-child, .sub-ingredients-list li:last-child {
  border-bottom: none;
}

.measurement {
  font-weight: bold;
  color: #e74c3c;
}

.ingredient-name {
  color: #2c3e50;
}

.ingredient-note {
  font-style: italic;
  color: #7f8c8d;
  font-size: 0.9em;
}

.instruction {
  margin: 1.5em 0;
  padding: 1em;
  background: #f8f9fa;
  border-radius: 4px;
  page-break-inside: avoid;
}

.instruction-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 0.5em;
}

.instruction-description {
  margin: 0.5em 0;
  line-height: 1.8;
}

.instruction-meta {
  margin-top: 0.8em;
  padding-top: 0.8em;
  border-top: 1px solid #ddd;
  font-size: 0.9em;
  color: #555;
}

.time-info {
  display: inline-block;
  margin-right: 20px;
  font-weight: bold;
  color: #e74c3c;
}

.equipment-info {
  display: inline-block;
  color: #555;
}

hr {
  border: none;
  border-top: 2px solid #ecf0f1;
  margin: 2em 0;
}

@media print {
  body {
    max-width: 100%;
    padding: 20px;
  }
  
  h1 {
    page-break-after: avoid;
  }
  
  .recipe-info, .sub-recipes {
    page-break-inside: avoid;
  }
  
  .instruction {
    page-break-inside: avoid;
  }
}
`;

// Format time in minutes to hours and minutes
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  let result = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (mins > 0) {
    result += ` ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  }
  
  return result;
}

// Format measurements for display
function formatMeasurements(measurements) {
  return measurements.map(m => {
    const value = m.value % 1 === 0 ? m.value : m.value.toFixed(2);
    return `${value} ${m.unit}`;
  }).join(' / ');
}

// Escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Format ingredient as HTML
function formatIngredient(ingredient) {
  let html = '<li>';
  html += `<span class="measurement">${escapeHtml(formatMeasurements(ingredient.measurements))}</span> `;
  html += `<span class="ingredient-name">${escapeHtml(ingredient.name)}</span>`;
  if (ingredient.note) {
    html += ` <span class="ingredient-note">(${escapeHtml(ingredient.note)})</span>`;
  }
  html += '</li>';
  return html;
}

// Format instruction as HTML
function formatInstruction(instruction, index, isSubRecipe = false) {
  let html = '<div class="instruction">';
  
  if (instruction.title) {
    html += `<div class="instruction-title">${escapeHtml(instruction.title)}</div>`;
  } else {
    html += `<div class="instruction-title">Step ${index + 1}</div>`;
  }
  
  html += `<div class="instruction-description">${escapeHtml(instruction.description)}</div>`;
  
  html += '<div class="instruction-meta">';
  html += `<span class="time-info">⏱ ${formatTime(instruction.activeTimeMinutes)} active`;
  if (instruction.totalTimeMinutes > instruction.activeTimeMinutes) {
    html += ` / ${formatTime(instruction.totalTimeMinutes)} total`;
  }
  html += '</span>';
  
  if (instruction.equipment && instruction.equipment.length > 0) {
    html += `<span class="equipment-info">🔧 ${instruction.equipment.map(e => escapeHtml(e)).join(', ')}</span>`;
  }
  html += '</div>';
  
  html += '</div>';
  return html;
}

// Format subrecipe as HTML
function formatSubRecipe(subRecipe) {
  let html = '<div class="sub-recipe">';
  html += `<h3>${escapeHtml(subRecipe.title)}</h3>`;
  
  // Ingredients
  html += '<h4>Ingredients</h4>';
  html += '<ul class="sub-ingredients-list">';
  subRecipe.ingredients.forEach(ingredient => {
    html += formatIngredient(ingredient);
  });
  html += '</ul>';
  
  // Instructions
  html += '<h4>Instructions</h4>';
  subRecipe.instructions.forEach((instruction, index) => {
    html += formatInstruction(instruction, index, true);
  });
  
  html += '</div>';
  return html;
}

// Convert recipe JSON to HTML
function recipeToHtml(recipe) {
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += `<title>${escapeHtml(recipe.title)}</title>\n`;
  html += '<style>\n' + RECIPE_CSS + '\n</style>\n';
  html += '</head>\n<body>\n';
  
  // Title
  html += `<h1>${escapeHtml(recipe.title)}</h1>\n`;
  
  // Description
  html += `<div class="description">${escapeHtml(recipe.description)}</div>\n`;
  
  // Metadata section
  if (recipe.metadata) {
    html += '<div class="recipe-info">\n';
    html += '<h2>Recipe Info</h2>\n';
    html += '<div class="info-grid">\n';
    
    html += `<div class="info-item"><span class="info-label">Servings:</span> <span class="info-value">${recipe.servings}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Prep Time:</span> <span class="info-value">${formatTime(recipe.prepTimeMinutes)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Cook Time:</span> <span class="info-value">${formatTime(recipe.cookTimeMinutes)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Total Time:</span> <span class="info-value">${formatTime(recipe.totalTimeMinutes)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Course:</span> <span class="info-value">${escapeHtml(recipe.metadata.dishCategory)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Cuisine/Theme:</span> <span class="info-value">${escapeHtml(recipe.metadata.theme)}</span></div>\n`;
    
    if (recipe.metadata.primaryProtein && recipe.metadata.primaryProtein !== 'None') {
      html += `<div class="info-item"><span class="info-label">Primary Protein:</span> <span class="info-value">${escapeHtml(recipe.metadata.primaryProtein)}</span></div>\n`;
    }
    
    html += `<div class="info-item"><span class="info-label">Cooking Method:</span> <span class="info-value">${recipe.metadata.cookingMethod.map(m => escapeHtml(m)).join(', ')}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Complexity:</span> <span class="info-value">${escapeHtml(recipe.metadata.complexity)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Weight:</span> <span class="info-value">${escapeHtml(recipe.metadata.weight)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Flavor Profile:</span> <span class="info-value">${recipe.metadata.flavorProfile.map(f => escapeHtml(f)).join(', ')}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Seasonality:</span> <span class="info-value">${escapeHtml(recipe.metadata.seasonality)}</span></div>\n`;
    html += `<div class="info-item"><span class="info-label">Temperature:</span> <span class="info-value">${escapeHtml(recipe.metadata.temperature)}</span></div>\n`;
    
    html += '</div>\n';
    html += '</div>\n';
  }
  
  // SubRecipes (if any)
  if (recipe.subRecipes && recipe.subRecipes.length > 0) {
    html += '<div class="sub-recipes">\n';
    html += '<h2>Sub-Recipes</h2>\n';
    html += '<p><em>Prepare these components first</em></p>\n';
    recipe.subRecipes.forEach(subRecipe => {
      html += formatSubRecipe(subRecipe);
    });
    html += '</div>\n';
  }
  
  html += '<hr>\n';
  
  // Main Recipe Ingredients
  html += '<h2>Main Recipe</h2>\n';
  html += '<h3>Ingredients</h3>\n';
  html += '<ul class="ingredients-list">\n';
  recipe.ingredients.forEach(ingredient => {
    html += formatIngredient(ingredient) + '\n';
  });
  html += '</ul>\n';
  
  // Instructions
  html += '<h3>Instructions</h3>\n';
  recipe.instructions.forEach((instruction, index) => {
    html += formatInstruction(instruction, index);
  });
  
  html += '</body>\n</html>';
  return html;
}

// Main function
async function main() {
  console.log('Recipe to HTML Converter');
  console.log('========================\n');
  
  // Check if recipes directory exists
  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`Error: Recipes directory not found: ${RECIPES_DIR}`);
    console.error('Please generate recipes first using recipe_generator.js');
    process.exit(1);
  }
  
  // Get all recipe files
  const files = fs.readdirSync(RECIPES_DIR)
    .filter(file => file.endsWith('.recipe.json'));
  
  if (files.length === 0) {
    console.log('No recipe files found.');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} recipe files\n`);
  
  let converted = 0;
  let errors = 0;
  
  // Process each recipe file
  for (const file of files) {
    const recipePath = path.join(RECIPES_DIR, file);
    const htmlFilename = file.replace('.recipe.json', '.html');
    const htmlPath = path.join(HTML_OUTPUT_DIR, htmlFilename);
    
    try {
      // Read recipe JSON
      const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf-8'));
      
      // Convert to HTML
      const html = recipeToHtml(recipeData);
      
      // Save HTML file
      fs.writeFileSync(htmlPath, html, 'utf-8');
      
      console.log(`✓ Converted: ${file} → ${htmlFilename}`);
      converted++;
    } catch (error) {
      console.error(`✗ Error converting ${file}: ${error.message}`);
      errors++;
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total files: ${files.length}`);
  console.log(`Converted: ${converted}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nHTML files saved to: ${HTML_OUTPUT_DIR}`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
