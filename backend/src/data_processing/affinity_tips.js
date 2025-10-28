import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// File paths
const FLAVOR_BIBLE_FILE = path.join(__dirname, '../../../data/flavor_bible_expanded.json');
const AFFINITY_TIPS_FILE = path.join(__dirname, '../../../data/affinity_tips.json');

// Pricing for GPT-5 mini (per 1M tokens)
const PRICING = {
  input: 0.250,      // $0.250 per 1M input tokens
  output: 2.000,     // $2.000 per 1M output tokens
  cached: 0.025      // $0.025 per 1M cached input tokens (not tracked separately)
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

// Fun icons
const icons = {
  chef: '👨‍🍳',
  ingredient: '🥬',
  store: '🛒',
  pairing: '🤝',
  cooking: '🔥',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  loading: '⏳',
  saved: '💾',
  money: '💰',
  stats: '📊',
  rocket: '🚀',
  checkmark: '✓',
  cross: '✗',
  skip: '⊘',
};

// System prompt for generating tips
const SYSTEM_PROMPT = `You are a recipe and cooking expert. Can you provide up to 8 tips for cooking with the ingredient provided by the user.

sourcing_tips: 0-2 tips on selecting the best (value, quality, season, health) from the store (e.g. Select young, tender leaves or 'baby' dandelion greens for milder bitterness; avoid yellowing, wilted or slimy bunches.)
pairing_tips: 0-3 tips on pairings (e.g. Use fatty or rich ingredients (olive oil, butter, cream, bacon, egg yolk) to mellow and round the greens' bite.)
cooking_tips: 0-3 tips on cooking and how to achieve the best result

Please respond in JSON with an object like this

{
  "sourcing_tips": ["..."],
  "pairing_tips": ["..."],
  "cooking_tips": ["..."]
}`;

// Load or create affinity tips data
function loadAffinityTips() {
  if (fs.existsSync(AFFINITY_TIPS_FILE)) {
    console.log(`${colors.cyan}${icons.loading} Loading existing affinity tips...${colors.reset}`);
    const rawTips = JSON.parse(fs.readFileSync(AFFINITY_TIPS_FILE, 'utf-8'));
    
    // Normalize all keys to lowercase for case-insensitive comparison
    const normalizedTips = {};
    for (const [key, value] of Object.entries(rawTips)) {
      normalizedTips[key.toLowerCase()] = value;
    }
    
    return normalizedTips;
  } else {
    console.log(`${colors.yellow}${icons.warning} No existing affinity tips file found. Creating new one...${colors.reset}`);
    return {};
  }
}

// Save affinity tips to file
function saveAffinityTips(tips) {
  fs.writeFileSync(AFFINITY_TIPS_FILE, JSON.stringify(tips, null, 2), 'utf-8');
}

// Extract all unique affinities from flavor bible
function extractUniqueAffinities(flavorBible) {
  const affinities = new Set();
  
  for (const ingredient of flavorBible.ingredients) {
    if (ingredient.flavor_affinities && Array.isArray(ingredient.flavor_affinities)) {
      for (const affinity of ingredient.flavor_affinities) {
        if (affinity.combination && Array.isArray(affinity.combination)) {
          for (const item of affinity.combination) {
            // Normalize to lowercase for case-insensitive deduplication
            affinities.add(item.toLowerCase());
          }
        }
      }
    }
  }
  
  return Array.from(affinities).sort();
}

// Validate tips response
function validateTips(tips, affinity) {
  const requiredKeys = ['sourcing_tips', 'pairing_tips', 'cooking_tips'];
  
  if (typeof tips !== 'object' || tips === null) {
    console.error(`  ${colors.red}${icons.cross} Invalid response: not an object${colors.reset}`);
    return false;
  }
  
  for (const key of requiredKeys) {
    if (!(key in tips)) {
      console.error(`  ${colors.red}${icons.cross} Missing required key: ${key}${colors.reset}`);
      return false;
    }
    
    if (!Array.isArray(tips[key])) {
      console.error(`  ${colors.red}${icons.cross} Invalid value for ${key}: expected array, got ${typeof tips[key]}${colors.reset}`);
      return false;
    }
  }
  
  // Check for unexpected keys
  const actualKeys = Object.keys(tips);
  const unexpectedKeys = actualKeys.filter(key => !requiredKeys.includes(key));
  if (unexpectedKeys.length > 0) {
    console.warn(`  ${colors.yellow}${icons.warning} Warning: unexpected keys found: ${unexpectedKeys.join(', ')}${colors.reset}`);
  }
  
  return true;
}

// Calculate cost based on token usage
function calculateCost(promptTokens, completionTokens) {
  const inputCost = (promptTokens / 1_000_000) * PRICING.input;
  const outputCost = (completionTokens / 1_000_000) * PRICING.output;
  return inputCost + outputCost;
}

// Format cost for display
function formatCost(cost) {
  return `$${cost.toFixed(6)}`;
}

// Generate tips for a single affinity
async function generateTips(affinity, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  ${colors.cyan}${icons.chef} Generating tips (attempt ${attempt}/${retries})...${colors.reset}`);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: affinity }
        ],
        //temperature: 0.7,
        //max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content.trim();
      
      // Extract token usage and calculate cost
      const usage = response.usage;
      const cost = calculateCost(usage.prompt_tokens, usage.completion_tokens);
      
      // Parse the JSON response
      let tips;
      try {
        tips = JSON.parse(content);
      } catch (parseError) {
        console.error(`  ${colors.red}${icons.cross} JSON parse error: ${parseError.message}${colors.reset}`);
        if (attempt === retries) throw parseError;
        continue;
      }

      // Validate tips
      if (!validateTips(tips, affinity)) {
        if (attempt === retries) {
          throw new Error('Validation failed after all retries');
        }
        continue;
      }

      // Return tips with usage info
      return { tips, usage, cost };
    } catch (error) {
      console.error(`  ${colors.red}${icons.cross} Attempt ${attempt} failed: ${error.message}${colors.reset}`);
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
  console.log(`\n${colors.brightMagenta}${colors.bright}${icons.chef} Affinity Tips Generator ${icons.rocket}${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(50)}${colors.reset}\n`);

  // Check for command-line limit argument
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  // Load flavor bible data
  console.log(`${colors.cyan}📖 Loading flavor bible data...${colors.reset}`);
  const flavorBible = JSON.parse(fs.readFileSync(FLAVOR_BIBLE_FILE, 'utf-8'));

  // Extract unique affinities
  console.log(`${colors.cyan}🔍 Extracting unique affinities...${colors.reset}`);
  const allAffinities = extractUniqueAffinities(flavorBible);
  console.log(`${colors.green}${icons.success} Found ${colors.bright}${allAffinities.length}${colors.reset}${colors.green} unique affinities${colors.reset}\n`);

  // Load existing tips
  const existingTips = loadAffinityTips();
  console.log(`${colors.green}${icons.success} Loaded ${colors.bright}${Object.keys(existingTips).length}${colors.reset}${colors.green} existing tips${colors.reset}\n`);

  // Filter out affinities that already have tips (case-insensitive)
  const missingAffinities = allAffinities.filter(affinity => !(affinity.toLowerCase() in existingTips));
  console.log(`${colors.yellow}${icons.ingredient} ${colors.bright}${missingAffinities.length}${colors.reset}${colors.yellow} affinities need tips${colors.reset}\n`);

  if (missingAffinities.length === 0) {
    console.log(`${colors.green}${colors.bright}${icons.success} All affinities already have tips! Nothing to do.${colors.reset}\n`);
    return;
  }

  // Apply limit if specified
  const affinitesToProcess = limit ? missingAffinities.slice(0, limit) : missingAffinities;
  console.log(`${colors.brightCyan}${icons.rocket} Processing ${colors.bright}${affinitesToProcess.length}${colors.reset}${colors.brightCyan} affinities${limit ? ` (limited to ${limit})` : ''}${colors.reset}\n`);

  // Process each affinity
  let processed = 0;
  let errors = 0;
  let generated = 0;
  let totalCost = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let i = 0; i < affinitesToProcess.length; i++) {
    const affinity = affinitesToProcess[i];
    
    console.log(`\n${colors.brightYellow}${icons.ingredient} [${i + 1}/${affinitesToProcess.length}] ${colors.bright}${affinity}${colors.reset}`);
    
    try {
      // Generate tips
      const result = await generateTips(affinity);
      
      // Store in existing tips object with lowercase key for consistency
      existingTips[affinity.toLowerCase()] = result.tips;
      
      // Track costs and tokens
      totalCost += result.cost;
      totalPromptTokens += result.usage.prompt_tokens;
      totalCompletionTokens += result.usage.completion_tokens;
      
      console.log(`  ${colors.green}${icons.checkmark} Generated tips successfully${colors.reset}`);
      console.log(`    ${icons.store} Sourcing tips: ${colors.cyan}${result.tips.sourcing_tips.length}${colors.reset}`);
      console.log(`    ${icons.pairing} Pairing tips: ${colors.cyan}${result.tips.pairing_tips.length}${colors.reset}`);
      console.log(`    ${icons.cooking} Cooking tips: ${colors.cyan}${result.tips.cooking_tips.length}${colors.reset}`);
      console.log(`    ${colors.dim}Tokens: ${result.usage.prompt_tokens} input + ${result.usage.completion_tokens} output = ${result.usage.total_tokens} total${colors.reset}`);
      console.log(`    ${icons.money} Cost: ${colors.yellow}${formatCost(result.cost)}${colors.reset}`);
      
      generated++;
      processed++;

      // Save after each successful generation to avoid losing progress
      saveAffinityTips(existingTips);
      console.log(`  ${colors.green}${icons.saved} Saved to file${colors.reset}`);

      // Rate limiting - wait 1 second between API calls
      if (i < affinitesToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`  ${colors.red}${icons.error} Error generating tips: ${error.message}${colors.reset}`);
      errors++;
      processed++;
    }
  }

  // Summary
  console.log(`\n\n${colors.brightMagenta}${colors.bright}${icons.stats} Summary${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}Total processed:${colors.reset} ${colors.bright}${processed}${colors.reset}`);
  console.log(`${colors.green}${icons.success} Generated:${colors.reset} ${colors.bright}${generated}${colors.reset}`);
  if (errors > 0) {
    console.log(`${colors.red}${icons.error} Errors:${colors.reset} ${colors.bright}${errors}${colors.reset}`);
  }
  console.log(`${colors.cyan}Total tips in file:${colors.reset} ${colors.bright}${Object.keys(existingTips).length}${colors.reset}`);
  
  console.log(`\n${colors.brightYellow}${colors.bright}${icons.money} Cost Summary${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}Total tokens used:${colors.reset} ${colors.bright}${(totalPromptTokens + totalCompletionTokens).toLocaleString()}${colors.reset}`);
  console.log(`  ${colors.dim}Input tokens: ${totalPromptTokens.toLocaleString()}${colors.reset}`);
  console.log(`  ${colors.dim}Output tokens: ${totalCompletionTokens.toLocaleString()}${colors.reset}`);
  console.log(`${colors.brightYellow}${icons.money} Total cost:${colors.reset} ${colors.bright}${colors.green}${formatCost(totalCost)}${colors.reset}`);
  if (generated > 0) {
    console.log(`${colors.yellow}Average cost per tip:${colors.reset} ${colors.green}${formatCost(totalCost / generated)}${colors.reset}`);
  }
  console.log(`\n${colors.brightGreen}${icons.saved} Tips saved to: ${colors.cyan}${AFFINITY_TIPS_FILE}${colors.reset}\n`);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

