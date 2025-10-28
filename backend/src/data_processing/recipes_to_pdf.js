import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const RECIPES_DIR = path.join(__dirname, '../../../data/recipes');
const PDF_OUTPUT_FILE = path.join(__dirname, '../../../data/recipes_combined.pdf');

// CSS for recipe styling (same as HTML version)
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

h4 {
  font-size: 1.1em;
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  color: #666;
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

.toc {
  background: #f8f9fa;
  padding: 30px;
  margin: 2em 0;
  border-radius: 8px;
  border: 2px solid #e74c3c;
}

.toc h1 {
  text-align: center;
  margin-bottom: 1em;
}

.toc-list {
  list-style: none;
  padding: 0;
  column-count: 2;
  column-gap: 30px;
}

.toc-item {
  break-inside: avoid;
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
}

.toc-item a {
  color: #2c3e50;
  text-decoration: none;
  font-size: 1.1em;
}

.toc-item a:hover {
  color: #e74c3c;
}

.recipe-section {
  page-break-before: always;
  margin-top: 2em;
}

.recipe-section:first-of-type {
  page-break-before: auto;
}

@media print {
  body {
    max-width: 100%;
    padding: 20px;
  }
  
  h1 {
    page-break-after: avoid;
  }
  
  .toc {
    page-break-after: always;
  }
  
  .toc-list {
    column-count: 2;
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
function formatInstruction(instruction, index) {
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
    html += formatInstruction(instruction, index);
  });
  
  html += '</div>';
  return html;
}

// Generate combined HTML with TOC for all recipes
function generateCombinedHtml(recipeDataList) {
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<title>VitalityIP Recipe Collection</title>\n';
  html += '<style>\n' + RECIPE_CSS + '\n</style>\n';
  html += '</head>\n<body>\n';
  
  // Table of Contents
  html += '<div class="toc">\n';
  html += '<h1>Vitality IP - Recipe Collection</h1>\n';
  html += '<p style="text-align: center; font-style: italic; margin-bottom: 1.5em;">Complete Recipe Collection</p>\n';
  html += '<ul class="toc-list">\n';
  
  recipeDataList.forEach((item, index) => {
    const anchorId = `recipe-${index}`;
    html += `<li class="toc-item"><a href="#${anchorId}">${escapeHtml(item.recipe.title)}</a></li>\n`;
  });
  
  html += '</ul>\n';
  html += '</div>\n';
  
  // All recipes
  recipeDataList.forEach((item, index) => {
    const anchorId = `recipe-${index}`;
    html += `<div class="recipe-section" id="${anchorId}">\n`;
    
    // Title
    html += `<h1>${escapeHtml(item.recipe.title)}</h1>\n`;
    
    // Description
    html += `<div class="description">${escapeHtml(item.recipe.description)}</div>\n`;
    
    // Metadata section
    if (item.recipe.metadata) {
      html += '<div class="recipe-info">\n';
      html += '<h2>Recipe Info</h2>\n';
      html += '<div class="info-grid">\n';
      
      html += `<div class="info-item"><span class="info-label">Servings:</span> <span class="info-value">${item.recipe.servings}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Prep Time:</span> <span class="info-value">${formatTime(item.recipe.prepTimeMinutes)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Cook Time:</span> <span class="info-value">${formatTime(item.recipe.cookTimeMinutes)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Total Time:</span> <span class="info-value">${formatTime(item.recipe.totalTimeMinutes)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Course:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.dishCategory)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Cuisine/Theme:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.theme)}</span></div>\n`;
      
      if (item.recipe.metadata.primaryProtein && item.recipe.metadata.primaryProtein !== 'None') {
        html += `<div class="info-item"><span class="info-label">Primary Protein:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.primaryProtein)}</span></div>\n`;
      }
      
      html += `<div class="info-item"><span class="info-label">Cooking Method:</span> <span class="info-value">${item.recipe.metadata.cookingMethod.map(m => escapeHtml(m)).join(', ')}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Complexity:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.complexity)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Weight:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.weight)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Flavor Profile:</span> <span class="info-value">${item.recipe.metadata.flavorProfile.map(f => escapeHtml(f)).join(', ')}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Seasonality:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.seasonality)}</span></div>\n`;
      html += `<div class="info-item"><span class="info-label">Temperature:</span> <span class="info-value">${escapeHtml(item.recipe.metadata.temperature)}</span></div>\n`;
      
      html += '</div>\n';
      html += '</div>\n';
    }
    
    // SubRecipes (if any)
    if (item.recipe.subRecipes && item.recipe.subRecipes.length > 0) {
      html += '<div class="sub-recipes">\n';
      html += '<h2>Sub-Recipes</h2>\n';
      html += '<p><em>Prepare these components first</em></p>\n';
      item.recipe.subRecipes.forEach(subRecipe => {
        html += formatSubRecipe(subRecipe);
      });
      html += '</div>\n';
    }
    
    html += '<hr>\n';
    
    // Main Recipe Ingredients
    html += '<h2>Main Recipe</h2>\n';
    html += '<h3>Ingredients</h3>\n';
    html += '<ul class="ingredients-list">\n';
    item.recipe.ingredients.forEach(ingredient => {
      html += formatIngredient(ingredient) + '\n';
    });
    html += '</ul>\n';
    
    // Instructions
    html += '<h3>Instructions</h3>\n';
    item.recipe.instructions.forEach((instruction, idx) => {
      html += formatInstruction(instruction, idx);
    });
    
    html += '</div>\n'; // End recipe-section
  });
  
  html += '</body>\n</html>';
  return html;
}

// Generate PDF from combined HTML
async function generatePdf(recipeDataList) {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Generate combined HTML
    console.log('Creating combined HTML document...');
    const combinedHtml = generateCombinedHtml(recipeDataList);
    
    // Load HTML content
    await page.setContent(combinedHtml, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF
    console.log('Generating PDF...');
    await page.pdf({
      path: PDF_OUTPUT_FILE,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    });
    
    console.log(`✓ PDF generated: ${PDF_OUTPUT_FILE}`);
  } finally {
    await browser.close();
  }
}

// Main function
async function main() {
  console.log('Recipes to PDF Converter');
  console.log('========================\n');
  
  // Check if recipes directory exists
  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`Error: Recipes directory not found: ${RECIPES_DIR}`);
    console.error('Please generate recipes first using recipe_generator.js');
    process.exit(1);
  }
  
  // Get all recipe files
  const files = fs.readdirSync(RECIPES_DIR)
    .filter(file => file.endsWith('.recipe.json'))
    .sort(); // Sort alphabetically for consistent ordering
  
  if (files.length === 0) {
    console.log('No recipe files found.');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} recipe files\n`);
  
  const recipeDataList = [];
  let errors = 0;
  
  // Load all recipe files
  for (const file of files) {
    const recipePath = path.join(RECIPES_DIR, file);
    
    try {
      const recipeData = JSON.parse(fs.readFileSync(recipePath, 'utf-8'));
      recipeDataList.push({
        filename: file,
        recipe: recipeData
      });
      console.log(`✓ Loaded: ${file}`);
    } catch (error) {
      console.error(`✗ Error loading ${file}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\nLoaded ${recipeDataList.length} recipes successfully`);
  if (errors > 0) {
    console.log(`Errors: ${errors}`);
  }
  
  if (recipeDataList.length === 0) {
    console.log('\n⚠ No recipes to include in PDF');
    process.exit(0);
  }
  
  // Generate PDF
  console.log('\n=== Generating PDF ===\n');
  try {
    await generatePdf(recipeDataList);
    console.log('\n✅ PDF generation complete!');
  } catch (error) {
    console.error(`\n✗ PDF generation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

