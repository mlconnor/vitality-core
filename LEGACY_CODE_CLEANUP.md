# Configuration Reference

## Feature Toggle: Pairing Reasons

Pairing reasons can be toggled on/off via configuration:

```yaml
features:
  include_pairing_reasons: false  # Set to true to enable reasons (default: false)
```

**When disabled (default):**
- Faster execution (~3-5 seconds vs ~7-13 seconds)
- Lower token usage (~50 output tokens vs ~450 output tokens)
- Minimal cost (~$0.0003 less per request)
- No pairing reasons in output

**When enabled:**
- Each recommendation includes a 10-word reason
- Provides transparency and quality validation
- Helpful for debugging and user trust

## Target Categories

Each course can specify which Flavor Bible categories to filter when matching entrees:

```yaml
courses:
  vegetables:
    target_categories:
      - Proteins
      - Seafood
      - Cheeses
      - Cuisines
```

Common categories include: Proteins, Seafood, Cheeses, Cuisines, Vegetables, Fruits, Grains, etc.
