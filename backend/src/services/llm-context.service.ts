/**
 * LLM Context Aggregation Service
 * 
 * Implements hierarchical context aggregation similar to Cursor's .cursorrules.
 * Aggregates llm_notes from entity ancestors to provide rich context to AI agents.
 * 
 * Hierarchy paths:
 *   - Tenant → Site → Station
 *   - Tenant → Site → Cycle Menu → Menu Item
 *   - Tenant → Site → Diner
 *   - Tenant → Recipe
 */

import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';

export interface ContextLayer {
  entityType: string;
  entityId: string;
  entityName: string;
  llmNotes: string | null;
}

export interface AggregatedContext {
  layers: ContextLayer[];
  combinedContext: string;
  metadata: {
    tenantId: string;
    tenantName: string;
    siteId?: string;
    siteName?: string;
  };
}

export type EntityType = 
  | 'tenant'
  | 'site'
  | 'station'
  | 'cycleMenu'
  | 'menuItem'
  | 'diner'
  | 'recipe';

export class LlmContextService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Aggregate context for any entity by walking up its hierarchy
   */
  async getContextForEntity(
    entityType: EntityType,
    entityId: string
  ): Promise<AggregatedContext> {
    switch (entityType) {
      case 'tenant':
        return this.getTenantContext(entityId);
      case 'site':
        return this.getSiteContext(entityId);
      case 'station':
        return this.getStationContext(entityId);
      case 'cycleMenu':
        return this.getCycleMenuContext(entityId);
      case 'menuItem':
        return this.getMenuItemContext(entityId);
      case 'diner':
        return this.getDinerContext(entityId);
      case 'recipe':
        return this.getRecipeContext(entityId);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Get context for a tenant (root level - just the tenant itself)
   */
  private async getTenantContext(tenantId: string): Promise<AggregatedContext> {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.tenantId, tenantId),
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const layers: ContextLayer[] = [
      {
        entityType: 'tenant',
        entityId: tenant.tenantId,
        entityName: tenant.tenantName,
        llmNotes: tenant.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: {
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
      },
    };
  }

  /**
   * Get context for a site (Tenant → Site)
   */
  private async getSiteContext(siteId: string): Promise<AggregatedContext> {
    const site = await this.db.query.sites.findFirst({
      where: eq(schema.sites.siteId, siteId),
    });

    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }

    const tenantContext = await this.getTenantContext(site.tenantId);

    const layers: ContextLayer[] = [
      ...tenantContext.layers,
      {
        entityType: 'site',
        entityId: site.siteId,
        entityName: site.siteName,
        llmNotes: site.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: {
        ...tenantContext.metadata,
        siteId: site.siteId,
        siteName: site.siteName,
      },
    };
  }

  /**
   * Get context for a station (Tenant → Site → Station)
   */
  private async getStationContext(stationId: string): Promise<AggregatedContext> {
    const station = await this.db.query.stations.findFirst({
      where: eq(schema.stations.stationId, stationId),
    });

    if (!station) {
      throw new Error(`Station not found: ${stationId}`);
    }

    const siteContext = await this.getSiteContext(station.siteId);

    const layers: ContextLayer[] = [
      ...siteContext.layers,
      {
        entityType: 'station',
        entityId: station.stationId,
        entityName: station.stationName,
        llmNotes: station.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: siteContext.metadata,
    };
  }

  /**
   * Get context for a cycle menu (Tenant → Site? → Cycle Menu)
   */
  private async getCycleMenuContext(cycleMenuId: string): Promise<AggregatedContext> {
    const cycleMenu = await this.db.query.cycleMenus.findFirst({
      where: eq(schema.cycleMenus.cycleMenuId, cycleMenuId),
    });

    if (!cycleMenu) {
      throw new Error(`Cycle menu not found: ${cycleMenuId}`);
    }

    // Cycle menu can optionally be associated with a site
    let baseContext: AggregatedContext;
    if (cycleMenu.siteId) {
      baseContext = await this.getSiteContext(cycleMenu.siteId);
    } else {
      baseContext = await this.getTenantContext(cycleMenu.tenantId);
    }

    const layers: ContextLayer[] = [
      ...baseContext.layers,
      {
        entityType: 'cycleMenu',
        entityId: cycleMenu.cycleMenuId,
        entityName: cycleMenu.cycleName,
        llmNotes: cycleMenu.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: baseContext.metadata,
    };
  }

  /**
   * Get context for a menu item (Tenant → Site? → Cycle Menu → Menu Item)
   */
  private async getMenuItemContext(menuItemId: string): Promise<AggregatedContext> {
    const menuItem = await this.db.query.menuItems.findFirst({
      where: eq(schema.menuItems.menuItemId, menuItemId),
    });

    if (!menuItem) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }

    const cycleMenuContext = await this.getCycleMenuContext(menuItem.cycleMenuId);

    // Get recipe info for a more descriptive name
    const recipe = await this.db.query.recipes.findFirst({
      where: eq(schema.recipes.recipeId, menuItem.recipeId),
    });

    const displayName = menuItem.displayName || recipe?.recipeName || menuItemId;

    const layers: ContextLayer[] = [
      ...cycleMenuContext.layers,
      {
        entityType: 'menuItem',
        entityId: menuItem.menuItemId,
        entityName: displayName,
        llmNotes: menuItem.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: cycleMenuContext.metadata,
    };
  }

  /**
   * Get context for a diner (Tenant → Site → Diner)
   */
  private async getDinerContext(dinerId: string): Promise<AggregatedContext> {
    const diner = await this.db.query.diners.findFirst({
      where: eq(schema.diners.dinerId, dinerId),
    });

    if (!diner) {
      throw new Error(`Diner not found: ${dinerId}`);
    }

    const siteContext = await this.getSiteContext(diner.siteId);

    const dinerName = `${diner.firstName} ${diner.lastName}`;

    const layers: ContextLayer[] = [
      ...siteContext.layers,
      {
        entityType: 'diner',
        entityId: diner.dinerId,
        entityName: dinerName,
        llmNotes: diner.llmNotes ?? null,
      },
    ];

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata: siteContext.metadata,
    };
  }

  /**
   * Get context for a recipe (Tenant? → Recipe)
   * Recipes can be system-wide (no tenant) or tenant-specific
   */
  private async getRecipeContext(recipeId: string): Promise<AggregatedContext> {
    const recipe = await this.db.query.recipes.findFirst({
      where: eq(schema.recipes.recipeId, recipeId),
    });

    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    // If recipe has a tenant, include tenant context
    let layers: ContextLayer[] = [];
    let metadata: AggregatedContext['metadata'];

    if (recipe.tenantId) {
      const tenantContext = await this.getTenantContext(recipe.tenantId);
      layers = [...tenantContext.layers];
      metadata = tenantContext.metadata;
    } else {
      // System recipe - no tenant context
      metadata = {
        tenantId: 'SYSTEM',
        tenantName: 'System Recipes',
      };
    }

    layers.push({
      entityType: 'recipe',
      entityId: recipe.recipeId,
      entityName: recipe.recipeName,
      llmNotes: recipe.llmNotes ?? null,
    });

    return {
      layers,
      combinedContext: this.combineLayerNotes(layers),
      metadata,
    };
  }

  /**
   * Combine llm_notes from all layers into a single context string
   * Uses markdown sections for clarity
   */
  private combineLayerNotes(layers: ContextLayer[]): string {
    const sections: string[] = [];

    for (const layer of layers) {
      if (layer.llmNotes && layer.llmNotes.trim()) {
        sections.push(
          `## ${this.getEntityTypeLabel(layer.entityType)}: ${layer.entityName}\n\n${layer.llmNotes.trim()}`
        );
      }
    }

    if (sections.length === 0) {
      return '';
    }

    return `# Context Notes\n\n${sections.join('\n\n---\n\n')}`;
  }

  /**
   * Get human-readable label for entity type
   */
  private getEntityTypeLabel(entityType: string): string {
    const labels: Record<string, string> = {
      tenant: 'Organization',
      site: 'Site',
      station: 'Station',
      cycleMenu: 'Cycle Menu',
      menuItem: 'Menu Item',
      diner: 'Diner',
      recipe: 'Recipe',
    };
    return labels[entityType] || entityType;
  }

  /**
   * Build a system prompt incorporating the aggregated context
   * This is what gets passed to the LLM
   */
  buildSystemPromptWithContext(
    basePrompt: string,
    context: AggregatedContext
  ): string {
    if (!context.combinedContext) {
      return basePrompt;
    }

    return `${basePrompt}

---

The following context has been aggregated from the entity hierarchy. Use this information to provide contextually appropriate responses:

${context.combinedContext}

---

Current working context:
- Organization: ${context.metadata.tenantName}${context.metadata.siteName ? `\n- Site: ${context.metadata.siteName}` : ''}
`;
  }
}

/**
 * Factory function to create the service
 */
export function createLlmContextService(
  db: BetterSQLite3Database<typeof schema>
): LlmContextService {
  return new LlmContextService(db);
}

