# Data Processing Scripts

This directory contains scripts for generating recipe data using OpenAI's GPT models.

## Recipe Concept Generator

This script uses OpenAI's GPT-4 Turbo to generate recipe concepts based on flavor affinities from The Flavor Bible.

## Recipe Generator

This script uses OpenAI's GPT-4 Turbo to generate complete, detailed recipes from recipe concepts. It creates professional restaurant-quality recipes that follow a strict JSON schema with ingredients, instructions, timing, and metadata.

## Affinity Tips Generator

This script uses OpenAI's GPT-4o-mini to generate cooking tips for each ingredient affinity found in the Flavor Bible data. It generates sourcing tips, pairing tips, and cooking tips for ingredients.

## Setup

1. Make sure you have an OpenAI API key. If you don't have one, get it from [OpenAI Platform](https://platform.openai.com/api-keys).

2. Copy `backend/env.example` to `backend/.env`:
   ```bash
   cp backend/env.example backend/.env
   ```

3. Edit `backend/.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

## Running the Script

From the project root:

```bash
cd backend
node src/data_processing/recipe_concept_generator.js
```

Or from the backend directory:

```bash
node src/data_processing/recipe_concept_generator.js
```

## How It Works

1. **Reads Affinities**: Loads flavor affinities from `data/flavor_bible_affinities.txt`
2. **Checks Existing Work**: Loads already-generated concepts from `data/recipe_concepts.json`
3. **Processes Missing Affinities**: Only processes affinities that haven't been done yet
4. **Batches Processing**: Processes 50 affinities per batch for efficiency
5. **Generates Recipes**: Uses GPT-4 Turbo to create 1-5 recipe concepts per affinity
6. **Saves Incrementally**: After each batch is processed, the results are saved

## Features

- **Idempotent**: You can run the script multiple times. It will only process affinities that are missing from the output file.
- **Batched Processing**: Processes 50 affinities at a time for better efficiency and cost-effectiveness
- **Resilient**: If the script fails or is interrupted, it saves progress after each batch
- **Rate-Limited**: Waits 2 seconds between batches to avoid rate limits
- **Progress Tracking**: Shows clear batch progress, recipes added, and statistics

## Output Format

The output file `data/recipe_concepts.json` is an object where keys are affinities and values are arrays of recipe concepts:

```json
{
  "striped bass + bacon + sauerkraut": [
    {
      "chef": "Jamie Oliver",
      "theme": "Mediterranean",
      "flavor_profile": "Pickled & Sharp",
      "course": "Entree",
      "recipe_name": "Pan-Seared Bass with Crispy Bacon and Fermented Cabbage"
    },
    {
      "chef": "Fuchsia Dunlop",
      "theme": "Chinese Regional",
      "flavor_profile": "Umami Bomb",
      "course": "Entree",
      "recipe_name": "Wok-Seared Bass with Bacon and Pickled Cabbage"
    }
  ],
  "cucumber + mint + yogurt": [
    {
      "chef": "Ottolenghi",
      "theme": "Mediterranean",
      "flavor_profile": "Clean & Light",
      "course": "Salad",
      "recipe_name": "Cucumber Mint Raita"
    }
  ]
}
```

This format makes it easy to look up recipes by affinity and is more efficient for the batching process.

## Cost Estimate

- **Model**: GPT-4 Turbo
- **Batch size**: 50 affinities per API call
- **Total affinities**: ~1465
- **Total batches**: ~30 batches
- **Approximate cost per batch**: $0.50-1.00
- **Estimated total cost**: $15-30

Batching 50 affinities at a time significantly reduces the total cost and processing time compared to individual API calls.

## Troubleshooting

### Rate Limit Errors

If you hit rate limits, the script will continue processing other affinities. You can simply run it again to retry failed ones.

### API Key Issues

Make sure your `.env` file is in the `backend` directory and contains a valid OpenAI API key.

### JSON Parse Errors

The script uses OpenAI's JSON mode to ensure valid JSON responses. If you still encounter parse errors, they will be logged but won't stop the entire process.

## Monitoring Progress

The script outputs:
- Current batch number and total batches
- Number of affinities in each batch
- Number of recipes generated per batch
- Running total of affinities and recipes
- Final summary with total counts

You can stop the script at any time (Ctrl+C) and restart it later - it will pick up where it left off, processing only the remaining affinities.

---

# Recipe Generator

This script generates complete, detailed recipes from recipe concepts using OpenAI's GPT-4 Turbo.

## Prerequisites

Same as Recipe Concept Generator:
1. OpenAI API key in `backend/.env`
2. Recipe concepts generated and saved in `data/recipe_concepts.json`
3. Recipe schema defined in `backend/src/schemas/recipe.schema.json`

## Running the Script

From the backend directory:

```bash
npm run generate:recipes
```

Or directly:

```bash
node src/data_processing/recipe_generator.js
```

## Features

- **Smart Filtering**: Processes only entree recipes (filters by `course` property)
- **Duplicate Prevention**: Checks if recipe file exists before generating (skips existing)
- **Schema Validation**: Validates all generated recipes against the JSON schema
- **Error Handling**: Retries failed generations up to 3 times with exponential backoff
- **Rate Limiting**: Waits 1 second between API calls to avoid rate limits
- **Progress Tracking**: Shows detailed progress with counts of generated, skipped, and failed recipes

## How It Works

1. **Loads Recipe Concepts**: Reads all recipe concepts from `data/recipe_concepts.json`
2. **Filters for Entrees**: Only processes concepts where `course === "Entree"`
3. **Checks for Existing**: Skips recipes that already exist in `data/recipes/` directory
4. **Generates Recipe**: Uses GPT-4 Turbo with detailed prompts including chef style, cuisine, and flavor profile
5. **Validates Schema**: Ensures the generated recipe matches the strict JSON schema
6. **Saves to File**: Saves each recipe as `{sanitized_name}.recipe.json`

## Output Format

Each recipe is saved as a separate JSON file in `data/recipes/` following this structure:

```json
{
  "title": "Achiote Pork with Sour Orange and Charred Citrus Salsa",
  "description": "A vibrant Mexican regional dish...",
  "ingredients": [
    {
      "name": "pork shoulder",
      "measurements": [
        {
          "type": "weight",
          "value": 1000,
          "unit": "grams"
        },
        {
          "type": "weight",
          "value": 2.2,
          "unit": "pounds"
        }
      ],
      "note": "cut into 2-inch chunks"
    }
  ],
  "instructions": [
    {
      "title": "Marinate the Pork",
      "description": "Combine achiote paste with sour orange juice...",
      "activeTimeMinutes": 10,
      "totalTimeMinutes": 10,
      "equipment": ["mixing bowl", "whisk"]
    }
  ],
  "subRecipes": [],
  "servings": 4,
  "prepTimeMinutes": 30,
  "cookTimeMinutes": 90,
  "totalTimeMinutes": 120,
  "metadata": {
    "primaryProtein": "Pork",
    "cookingMethod": ["Roasted", "Marinated"],
    "dishCategory": "Entree",
    "weight": "Medium",
    "prepTime": "Moderate",
    "complexity": "Intermediate",
    "seasonality": "Year-Round",
    "flavorProfile": ["Savory/Umami", "Tangy/Acidic"],
    "temperature": "Hot",
    "theme": "Mexican Regional"
  }
}
```

## Schema Requirements

The recipe schema requires:
- **Ingredients**: All must include weight measurements in grams
- **Instructions**: Each step must have active time, total time, and equipment list
- **Metadata**: Complete categorization including protein, cooking methods, seasonality, etc.
- **Timing**: Accurate prep, cook, and total time estimates
- **Sub-recipes**: Optional components prepared separately

## Cost Estimate

- **Model**: GPT-4 Turbo Preview
- **Token usage per recipe**: ~3000-4000 tokens (input + output)
- **Cost per recipe**: ~$0.03-0.05
- **Total entree concepts**: ~7000-8000 (varies by data)
- **Estimated total cost**: $210-400

**Note**: The script is designed to be resumable. You can stop and restart it at any time, and it will only process recipes that don't already exist.

## Resuming

If you stop the script (Ctrl+C) or it encounters an error:
1. Simply run it again with the same command
2. It will skip all existing recipe files
3. Continue generating only the missing recipes

## Output Directory

All recipes are saved to: `data/recipes/`

Filenames are sanitized versions of the recipe names:
- "Achiote Pork with Sour Orange" → `achiote_pork_with_sour_orange.recipe.json`
- Spaces become underscores
- Special characters are removed
- All lowercase

## Monitoring Progress

The script outputs:
```
Recipe Generator
================

Loading recipe concepts...
Found 7156 entree concepts

[1/7156] Achiote Pork with Sour Orange and Charred Citrus Salsa
  Generating recipe (attempt 1/3)...
  ✓ Saved: achiote_pork_with_sour_orange_and_charred_citrus_salsa.recipe.json

[2/7156] Sour Orange Marinated Pork with Achiote
  ⊘ Skipped: Recipe already exists

[3/7156] Next Recipe Name
  ✗ Error generating recipe: Schema validation failed

=== Summary ===
Total processed: 7156
Generated: 6890
Skipped (existing): 234
Errors: 32

Recipes saved to: /path/to/data/recipes
```

## Troubleshooting

### Schema Validation Errors

If recipes fail validation, the script will retry up to 3 times. Persistent failures are logged and counted in the error total.

### Rate Limit Errors

The script includes 1-second delays between calls. If you still hit rate limits:
1. The script will retry with exponential backoff
2. After 3 attempts, it moves to the next recipe
3. Run the script again to retry failed recipes

### OpenAI API Errors

- Check your API key in `.env`
- Ensure you have sufficient API credits
- Check your rate limits at [OpenAI Platform](https://platform.openai.com/account/limits)

---

# Affinity Tips Generator

This script generates cooking tips for all unique ingredient affinities found in the Flavor Bible data using OpenAI's GPT-4o-mini.

## Prerequisites

1. OpenAI API key in `backend/.env`
2. Flavor Bible data in `data/flavor_bible_expanded.json`

## Running the Script

From the backend directory:

```bash
node src/data_processing/affinity_tips.js
```

To limit the number of tips to generate (useful for testing):

```bash
node src/data_processing/affinity_tips.js --limit=10
```

## Features

- **Smart Resume**: Loads existing tips and only generates missing ones
- **Incremental Saves**: Saves after each successful generation to prevent data loss
- **Validation**: Ensures all generated tips have the required keys (sourcing_tips, pairing_tips, cooking_tips)
- **Error Handling**: Retries failed generations up to 3 times with exponential backoff
- **Rate Limiting**: Waits 1 second between API calls to avoid rate limits
- **Progress Tracking**: Shows detailed progress with counts and tip statistics

## How It Works

1. **Loads Flavor Bible Data**: Reads all ingredients from `data/flavor_bible_expanded.json`
2. **Extracts Unique Affinities**: Collects all unique ingredient names from flavor affinities
3. **Checks Existing Tips**: Loads existing tips from `data/affinity_tips.json` (creates if doesn't exist)
4. **Filters Missing**: Only processes affinities that don't have tips yet
5. **Generates Tips**: Uses GPT-4o-mini to create sourcing, pairing, and cooking tips
6. **Validates Response**: Ensures JSON has correct structure with required keys
7. **Saves Incrementally**: Saves after each tip to preserve progress

## Output Format

The output file `data/affinity_tips.json` is an object where keys are ingredient names and values are tip objects:

```json
{
  "dandelion greens": {
    "sourcing_tips": [
      "Select young, tender leaves or 'baby' dandelion greens for milder bitterness; avoid yellowing, wilted or slimy bunches.",
      "Look for bright green leaves with no brown spots; fresher greens have less bitter flavor."
    ],
    "pairing_tips": [
      "Use fatty or rich ingredients (olive oil, butter, cream, bacon, egg yolk) to mellow and round the greens' bite.",
      "Pair with acidic ingredients like lemon juice or vinegar to balance the bitterness.",
      "Combine with sweet elements like dried fruits or caramelized onions for flavor contrast."
    ],
    "cooking_tips": [
      "Blanch in salted boiling water for 2-3 minutes to reduce bitterness before sautéing.",
      "Sauté quickly over high heat with garlic and olive oil to preserve texture.",
      "Add at the end of cooking to maintain some texture and avoid overcooking."
    ]
  },
  "beef": {
    "sourcing_tips": [
      "Choose grass-fed beef for better flavor and nutritional profile.",
      "Look for marbling in steaks for tenderness and flavor."
    ],
    "pairing_tips": [
      "Pair with bold flavors like red wine, mushrooms, and herbs.",
      "Use acidic ingredients like tomatoes or vinegar to tenderize tougher cuts."
    ],
    "cooking_tips": [
      "Let beef come to room temperature before cooking for even results.",
      "Rest meat for 5-10 minutes after cooking to redistribute juices.",
      "Use a meat thermometer to ensure proper doneness."
    ]
  }
}
```

## Tip Categories

1. **sourcing_tips** (0-2 tips): How to select the best ingredient from the store
2. **pairing_tips** (0-3 tips): What ingredients pair well with this item
3. **cooking_tips** (0-3 tips): How to cook it for the best results

## Cost Estimate

- **Model**: GPT-4o-mini
- **Unique affinities**: ~2000-3000 (extracted from all flavor combinations)
- **Cost per tip**: ~$0.001-0.002
- **Estimated total cost**: $2-6

The script is very cost-effective as it uses GPT-4o-mini, one of OpenAI's most affordable models.

## Resuming

If you stop the script (Ctrl+C) or it encounters an error:
1. Simply run it again with the same command
2. It will skip all affinities that already have tips
3. Continue generating only the missing tips

## Output File

Tips are saved to: `data/affinity_tips.json`

The file is created automatically if it doesn't exist, and updated incrementally as tips are generated.

## Monitoring Progress

The script outputs:
```
Affinity Tips Generator
=======================

Loading flavor bible data...
Extracting unique affinities...
Found 2847 unique affinities

Loaded 150 existing tips

2697 affinities need tips

Processing 2697 affinities

[1/2697] achiote
  Generating tips (attempt 1/3)...
  ✓ Generated tips successfully
    Sourcing tips: 2
    Pairing tips: 3
    Cooking tips: 2
  ✓ Saved to file

[2/2697] acidity
  Generating tips (attempt 1/3)...
  ✓ Generated tips successfully
    Sourcing tips: 0
    Pairing tips: 2
    Cooking tips: 1
  ✓ Saved to file

=== Summary ===
Total processed: 2697
Generated: 2695
Errors: 2
Total tips in file: 2845

Tips saved to: /path/to/data/affinity_tips.json
```

## Troubleshooting

### Validation Errors

If generated tips fail validation, the script will retry up to 3 times. Check that:
- All three required keys are present: `sourcing_tips`, `pairing_tips`, `cooking_tips`
- Each key has an array value
- The model is returning valid JSON

### Rate Limit Errors

The script includes 1-second delays between calls. If you still hit rate limits:
1. The script will retry with exponential backoff
2. After 3 attempts, it moves to the next affinity
3. Run the script again to retry failed affinities

### OpenAI API Errors

- Check your API key in `.env`
- Ensure you have sufficient API credits
- Check your rate limits at [OpenAI Platform](https://platform.openai.com/account/limits)

---

# Recipe to HTML Converter

This script converts all recipe JSON files into beautiful, styled HTML files ready for PDF conversion or web display.

## Prerequisites

- Recipe JSON files in `data/recipes/` directory

## Running the Script

From the backend directory:

```bash
npm run recipes:to-html
```

Or directly:

```bash
node src/data_processing/recipe_to_html.js
```

## Features

- **Batch Processing**: Converts all recipe JSON files at once
- **Professional Styling**: Beautiful CSS styling with print-optimized layout
- **PDF-Ready**: Includes print stylesheets and page-break controls
- **Complete Information**: All recipe details, metadata, sub-recipes, and instructions
- **Fast**: No API calls, runs instantly
- **Responsive Design**: Looks great on screen and in print

## Output Format

Each recipe is converted to a styled HTML file with:

1. **Title and Description** - Large, prominent heading with styled text
2. **Recipe Info Box** - Color-coded grid with servings, times, cuisine, cooking methods, complexity, etc.
3. **Sub-Recipes** (if any) - Orange-highlighted sections with components prepared separately
4. **Main Recipe Ingredients** - Clean list with color-coded measurements
5. **Instructions** - Step-by-step cards with timing and equipment icons
6. **Print-Optimized CSS** - Proper page breaks and print margins

### Styling Features

- **Color-coded measurements** - Red highlights for easy scanning
- **Info grid layout** - Organized metadata in responsive grid
- **Instruction cards** - Each step in a distinct card with timing
- **Print stylesheet** - Optimized for PDF generation
- **Professional typography** - Georgia serif font for readability
- **Icons** - ⏱ for timing, 🔧 for equipment

## Output Directory

All markdown files are saved to: `data/recipes_markdown/`

Filenames match the JSON filenames:
- `achiote_pork_with_sour_orange.recipe.json` → `achiote_pork_with_sour_orange.md`

## Use Cases

- **Review Recipes**: Easier to read than JSON
- **Share Recipes**: Send markdown files to colleagues
- **Documentation**: Include in recipe documentation
- **Version Control**: Easier to review changes in markdown diffs
- **Publishing**: Convert to HTML or PDF for distribution

## Performance

The script runs instantly as it doesn't make any API calls - it simply reads JSON and writes markdown files.

