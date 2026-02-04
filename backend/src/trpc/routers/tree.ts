/**
 * Entity Tree Router
 * 
 * Provides endpoints for fetching hierarchical entity data
 * to populate the Cursor-style entity explorer.
 * 
 * HIERARCHY:
 * ▼ Tenant (root)
 *   ├─ Site 1
 *   │   ├─ Stations
 *   │   ├─ Diners
 *   │   ├─ Employees
 *   │   └─ Menus
 *   ├─ Site 2
 *   │   └─ ...
 *   └─ Shared Resources
 *       ├─ Recipes
 *       ├─ Ingredients
 *       ├─ Diet Types
 *       ├─ Meal Periods
 *       └─ Vendors
 */

import { router, publicProcedure, protectedProcedure } from '../index.js';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { 
  tenants, sites, stations, employees
} from '../../db/schema/tenants.js';
import { diners } from '../../db/schema/diners.js';
import { 
  recipes, ingredients 
} from '../../db/schema/recipes.js';
import { foodCategories } from '../../db/schema/reference.js';
import { 
  cycleMenus, menuItems, mealPeriods, dietTypes, singleUseMenus 
} from '../../db/schema/menu.js';
import { vendors, purchaseOrders } from '../../db/schema/procurement.js';
import { inventory } from '../../db/schema/inventory.js';
import { productionSchedules } from '../../db/schema/production.js';
import { eq, or, and, isNull } from 'drizzle-orm';

// Types for tree nodes
export interface TreeNode {
  id: string;
  name: string;
  type: 'tenant' | 'site' | 'category' | 'station' | 'employee' | 'diner' | 'recipe' | 'ingredient' | 'vendor' | 'cycle-menu' | 'menu-item' | 'diet-type' | 'meal-period' | 'single-use-menu' | 'purchase-order' | 'production-date' | 'production-item';
  icon?: string;
  count?: number;
  children?: TreeNode[];
  href?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export const treeRouter = router({
  /**
   * Get the full entity tree for the current tenant(s)
   * Returns a hierarchical structure with tenant at the root
   */
  getEntityTree: protectedProcedure
    .query(async ({ ctx }) => {
      // Use ctx.tenant which is guaranteed by protectedProcedure
      const tenantId = ctx.tenant.tenantId;
      const tenantName = ctx.tenant.tenantName;

      // Fetch all data in parallel for efficiency
      const [
        sitesList,
        stationsList,
        employeesList,
        dinersList,
        recipesList,
        ingredientsList,
        vendorsList,
        cycleMenusList,
        singleUseMenusList,
        dietTypesList,
        mealPeriodsList,
        categoriesList,
        inventoryList,
        purchaseOrdersList,
        productionSchedulesList,
      ] = await Promise.all([
        db.select().from(sites).where(eq(sites.tenantId, tenantId)),
        db.select().from(stations)
          .innerJoin(sites, eq(stations.siteId, sites.siteId))
          .where(eq(sites.tenantId, tenantId)),
        db.select().from(employees).where(eq(employees.tenantId, tenantId)),
        db.select().from(diners).where(eq(diners.tenantId, tenantId)),
        db.select().from(recipes).where(
          or(eq(recipes.tenantId, tenantId), isNull(recipes.tenantId))
        ),
        db.select().from(ingredients).where(
          or(eq(ingredients.tenantId, tenantId), isNull(ingredients.tenantId))
        ),
        db.select().from(vendors).where(eq(vendors.tenantId, tenantId)),
        db.select().from(cycleMenus).where(eq(cycleMenus.tenantId, tenantId)),
        db.select().from(singleUseMenus).where(eq(singleUseMenus.tenantId, tenantId)),
        db.select().from(dietTypes).where(
          or(eq(dietTypes.tenantId, tenantId), isNull(dietTypes.tenantId))
        ),
        db.select().from(mealPeriods).where(
          or(eq(mealPeriods.tenantId, tenantId), isNull(mealPeriods.tenantId))
        ),
        db.select().from(foodCategories),
        db.select().from(inventory).where(eq(inventory.tenantId, tenantId)),
        db.select().from(purchaseOrders).where(eq(purchaseOrders.tenantId, tenantId)),
        db.select().from(productionSchedules).where(eq(productionSchedules.tenantId, tenantId)),
      ]);

      // Build the tree with tenant at the root
      const tree: TreeNode[] = [];

      // ==========================================
      // TENANT ROOT NODE
      // ==========================================
      const tenantNode: TreeNode = {
        id: tenantId,
        name: tenantName,
        type: 'tenant',
        icon: 'Building2',
        href: `/tenant/${tenantId}`,
        metadata: { 
          status: ctx.tenant.status,
        },
        children: [],
      };

      // ==========================================
      // SITES (under tenant)
      // ==========================================
      for (const site of sitesList) {
        const siteStations = stationsList
          .filter(s => s.stations.siteId === site.siteId)
          .map(s => s.stations);
        
        const siteEmployees = employeesList.filter(e => e.primarySiteId === site.siteId);
        const siteDiners = dinersList.filter(d => d.siteId === site.siteId);
        const siteMenus = cycleMenusList.filter(m => m.siteId === site.siteId);

        const siteNode: TreeNode = {
          id: site.siteId,
          name: site.siteName,
          type: 'site',
          icon: 'MapPin',
          href: `/sites/${site.siteId}`,
          parentId: tenantId,
          metadata: { 
            siteType: site.siteType,
            hasProductionKitchen: site.hasProductionKitchen,
          },
          children: [],
        };

        // Stations under site
        if (siteStations.length > 0) {
          const stationsNode: TreeNode = {
            id: `${site.siteId}-stations`,
            name: 'Stations',
            type: 'category',
            icon: 'LayoutGrid',
            count: siteStations.length,
            children: siteStations.map(station => ({
              id: station.stationId,
              name: station.stationName,
              type: 'station' as const,
              icon: 'ChefHat',
              href: `/stations/${station.stationId}`,
              parentId: site.siteId,
              metadata: { stationType: station.stationType },
            })),
          };
          siteNode.children!.push(stationsNode);
        }

        // Diners under site
        if (siteDiners.length > 0) {
          const dinersNode: TreeNode = {
            id: `${site.siteId}-diners`,
            name: 'Diners',
            type: 'category',
            icon: 'Users',
            count: siteDiners.length,
            children: siteDiners.slice(0, 50).map(diner => ({
              id: diner.dinerId,
              name: `${diner.firstName} ${diner.lastName}`,
              type: 'diner' as const,
              icon: 'User',
              href: `/diners/${diner.dinerId}`,
              parentId: site.siteId,
              metadata: { 
                roomNumber: diner.roomNumber,
                status: diner.status,
              },
            })),
          };
          
          // Add "more" indicator if truncated
          if (siteDiners.length > 50) {
            dinersNode.children!.push({
              id: `${site.siteId}-diners-more`,
              name: `... and ${siteDiners.length - 50} more`,
              type: 'category',
              icon: 'MoreHorizontal',
              href: `/diners?siteId=${site.siteId}`,
            });
          }
          
          siteNode.children!.push(dinersNode);
        }

        // Employees under site
        if (siteEmployees.length > 0) {
          const employeesNode: TreeNode = {
            id: `${site.siteId}-employees`,
            name: 'Employees',
            type: 'category',
            icon: 'Users',
            count: siteEmployees.length,
            children: siteEmployees.map(emp => ({
              id: emp.employeeId,
              name: `${emp.firstName} ${emp.lastName}`,
              type: 'employee' as const,
              icon: 'User',
              href: `/employees/${emp.employeeId}`,
              parentId: site.siteId,
              metadata: { jobTitle: emp.jobTitle },
            })),
          };
          siteNode.children!.push(employeesNode);
        }

        // Menus under site (site-specific cycle menus)
        if (siteMenus.length > 0) {
          const menusNode: TreeNode = {
            id: `${site.siteId}-menus`,
            name: 'Cycle Menus',
            type: 'category',
            icon: 'CalendarRange',
            count: siteMenus.length,
            children: siteMenus.map(menu => ({
              id: menu.cycleMenuId,
              name: menu.cycleName,
              type: 'cycle-menu' as const,
              icon: 'FileText',
              href: `/cycle-menus/${menu.cycleMenuId}`,
              parentId: site.siteId,
              metadata: { 
                cycleLengthWeeks: menu.cycleLengthWeeks,
                status: menu.status,
              },
            })),
          };
          siteNode.children!.push(menusNode);
        }

        // Single-use menus under site (holidays, special events)
        const siteSingleUseMenus = singleUseMenusList.filter(m => m.siteId === site.siteId);
        if (siteSingleUseMenus.length > 0) {
          const singleUseNode: TreeNode = {
            id: `${site.siteId}-single-use-menus`,
            name: 'Special Menus',
            type: 'category',
            icon: 'CalendarCheck',
            count: siteSingleUseMenus.length,
            children: siteSingleUseMenus.map(menu => ({
              id: menu.singleUseMenuId,
              name: menu.menuName,
              type: 'single-use-menu' as const,
              icon: 'Sparkles',
              href: `/single-use-menus/${menu.singleUseMenuId}`,
              parentId: site.siteId,
              metadata: { 
                serviceDate: menu.serviceDate,
                occasion: menu.occasion,
                mode: menu.mode,
                status: menu.status,
              },
            })),
          };
          siteNode.children!.push(singleUseNode);
        }

        // Inventory under site
        const siteInventory = inventoryList.filter(i => i.siteId === site.siteId);
        if (siteInventory.length > 0) {
          const inventoryNode: TreeNode = {
            id: `${site.siteId}-inventory`,
            name: 'Inventory',
            type: 'category',
            icon: 'Package',
            count: siteInventory.length,
            href: `/inventory?siteId=${site.siteId}`,
          };
          siteNode.children!.push(inventoryNode);
        }

        // Purchase Orders under site
        const sitePOs = purchaseOrdersList.filter(po => po.siteId === site.siteId);
        if (sitePOs.length > 0) {
          const posNode: TreeNode = {
            id: `${site.siteId}-purchase-orders`,
            name: 'Purchase Orders',
            type: 'category',
            icon: 'ShoppingCart',
            count: sitePOs.length,
            children: sitePOs.slice(0, 20).map(po => ({
              id: po.poNumber,
              name: `${po.poNumber}`,
              type: 'purchase-order' as const,
              icon: 'FileText',
              href: `/purchase-orders/${po.poNumber}`,
              parentId: site.siteId,
              metadata: {
                status: po.status,
                total: po.total,
                orderDate: po.orderDate,
                vendorId: po.vendorId,
              },
            })),
          };
          
          // Add "more" indicator if truncated
          if (sitePOs.length > 20) {
            posNode.children!.push({
              id: `${site.siteId}-pos-more`,
              name: `... and ${sitePOs.length - 20} more`,
              type: 'category',
              icon: 'MoreHorizontal',
              href: `/purchase-orders?siteId=${site.siteId}`,
            });
          }
          
          siteNode.children!.push(posNode);
        }

        // Production Schedules under site - grouped by date, then meal period
        const siteProduction = productionSchedulesList.filter(ps => ps.siteId === site.siteId);
        if (siteProduction.length > 0) {
          // Group by date
          const byDate = new Map<string, typeof siteProduction>();
          for (const ps of siteProduction) {
            const existing = byDate.get(ps.productionDate) || [];
            existing.push(ps);
            byDate.set(ps.productionDate, existing);
          }
          
          // Sort dates (upcoming first)
          const sortedDates = Array.from(byDate.keys()).sort();
          
          const productionNode: TreeNode = {
            id: `${site.siteId}-production`,
            name: 'Production',
            type: 'category',
            icon: 'Factory',
            count: siteProduction.length,
            children: [],
            href: `/production?siteId=${site.siteId}`,
          };
          
          for (const date of sortedDates.slice(0, 10)) { // Show up to 10 dates
            const dateItems = byDate.get(date)!;
            
            // Format date nicely
            const dateObj = new Date(date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
              weekday: 'short', month: 'short', day: 'numeric' 
            });
            
            // Group by meal period within this date
            const byMeal = new Map<string, typeof dateItems>();
            for (const item of dateItems) {
              const existing = byMeal.get(item.mealPeriodId) || [];
              existing.push(item);
              byMeal.set(item.mealPeriodId, existing);
            }
            
            const dateNode: TreeNode = {
              id: `${site.siteId}-prod-${date}`,
              name: formattedDate,
              type: 'production-date',
              icon: 'Calendar',
              count: dateItems.length,
              children: [],
              href: `/production?siteId=${site.siteId}&date=${date}`,
            };
            
            for (const [mealPeriodId, mealItems] of byMeal) {
              const mealPeriod = mealPeriodsList.find(mp => mp.mealPeriodId === mealPeriodId);
              const mealName = mealPeriod?.mealPeriodName || mealPeriodId;
              
              const mealNode: TreeNode = {
                id: `${site.siteId}-prod-${date}-${mealPeriodId}`,
                name: mealName,
                type: 'meal-period',
                icon: mealName === 'Breakfast' ? 'Sunrise' : mealName === 'Dinner' ? 'Moon' : 'Sun',
                count: mealItems.length,
                children: mealItems.map(item => {
                  const recipe = recipesList.find(r => r.recipeId === item.recipeId);
                  return {
                    id: item.scheduleId,
                    name: `${recipe?.recipeName || item.recipeId} - ${item.forecastedPortions} portions`,
                    type: 'production-item' as const,
                    icon: 'ClipboardList',
                    href: `/production/${item.scheduleId}`,
                    metadata: {
                      status: item.status,
                      forecastedPortions: item.forecastedPortions,
                      actualPortions: item.actualPortionsProduced,
                      shift: item.shift,
                    },
                  };
                }),
                href: `/production?siteId=${site.siteId}&date=${date}&meal=${mealPeriodId}`,
              };
              
              dateNode.children!.push(mealNode);
            }
            
            productionNode.children!.push(dateNode);
          }
          
          // Add "more" indicator if there are more dates
          if (sortedDates.length > 10) {
            productionNode.children!.push({
              id: `${site.siteId}-prod-more`,
              name: `... and ${sortedDates.length - 10} more days`,
              type: 'category',
              icon: 'MoreHorizontal',
              href: `/production?siteId=${site.siteId}`,
            });
          }
          
          siteNode.children!.push(productionNode);
        }

        tenantNode.children!.push(siteNode);
      }

      // ==========================================
      // SHARED RESOURCES (tenant-wide)
      // ==========================================
      const sharedNode: TreeNode = {
        id: `${tenantId}-shared`,
        name: 'Shared Resources',
        type: 'category',
        icon: 'FolderOpen',
        children: [],
      };

      // Recipes (grouped by category)
      if (recipesList.length > 0) {
        const recipesNode: TreeNode = {
          id: 'recipes-root',
          name: 'Recipes',
          type: 'category',
          icon: 'BookOpen',
          count: recipesList.length,
          children: [],
        };

        // Group recipes by category
        const recipesByCategory = new Map<string, typeof recipesList>();
        for (const recipe of recipesList) {
          const cat = recipe.category || 'Uncategorized';
          const existing = recipesByCategory.get(cat) || [];
          existing.push(recipe);
          recipesByCategory.set(cat, existing);
        }

        // Sort categories and add to tree
        const sortedCategories = Array.from(recipesByCategory.keys()).sort();
        for (const category of sortedCategories) {
          const categoryRecipes = recipesByCategory.get(category)!;
          const categoryNode: TreeNode = {
            id: `recipes-${category.toLowerCase().replace(/\s+/g, '-')}`,
            name: category,
            type: 'category',
            icon: 'Folder',
            count: categoryRecipes.length,
            children: categoryRecipes.slice(0, 30).map(recipe => ({
              id: recipe.recipeId,
              name: recipe.recipeName,
              type: 'recipe' as const,
              icon: 'FileText',
              href: `/recipes/${recipe.recipeId}`,
              metadata: { 
                category: recipe.category,
                yieldQuantity: recipe.yieldQuantity,
              },
            })),
          };
          
          if (categoryRecipes.length > 30) {
            categoryNode.children!.push({
              id: `recipes-${category}-more`,
              name: `... and ${categoryRecipes.length - 30} more`,
              type: 'category',
              icon: 'MoreHorizontal',
              href: `/recipes?category=${encodeURIComponent(category)}`,
            });
          }
          
          recipesNode.children!.push(categoryNode);
        }

        sharedNode.children!.push(recipesNode);
      }

      // Ingredients (grouped by food category)
      if (ingredientsList.length > 0) {
        const ingredientsNode: TreeNode = {
          id: 'ingredients-root',
          name: 'Ingredients',
          type: 'category',
          icon: 'Package',
          count: ingredientsList.length,
          children: [],
        };

        // Create a map of category IDs to names
        const categoryMap = new Map(categoriesList.map(c => [c.categoryId, c.categoryName]));

        // Group ingredients by category
        const ingredientsByCategory = new Map<string, typeof ingredientsList>();
        for (const ingredient of ingredientsList) {
          const catName = categoryMap.get(ingredient.foodCategoryId) || 'Uncategorized';
          const existing = ingredientsByCategory.get(catName) || [];
          existing.push(ingredient);
          ingredientsByCategory.set(catName, existing);
        }

        // Sort and add to tree
        const sortedIngCategories = Array.from(ingredientsByCategory.keys()).sort();
        for (const category of sortedIngCategories) {
          const categoryIngredients = ingredientsByCategory.get(category)!;
          const categoryNode: TreeNode = {
            id: `ingredients-${category.toLowerCase().replace(/\s+/g, '-')}`,
            name: category,
            type: 'category',
            icon: 'Folder',
            count: categoryIngredients.length,
            children: categoryIngredients.slice(0, 30).map(ing => ({
              id: ing.ingredientId,
              name: ing.ingredientName,
              type: 'ingredient' as const,
              icon: 'Leaf',
              href: `/ingredients/${ing.ingredientId}`,
            })),
          };
          
          if (categoryIngredients.length > 30) {
            categoryNode.children!.push({
              id: `ingredients-${category}-more`,
              name: `... and ${categoryIngredients.length - 30} more`,
              type: 'category',
              icon: 'MoreHorizontal',
              href: `/ingredients?category=${encodeURIComponent(category)}`,
            });
          }
          
          ingredientsNode.children!.push(categoryNode);
        }

        sharedNode.children!.push(ingredientsNode);
      }

      // Diet Types
      if (dietTypesList.length > 0) {
        const dietTypesNode: TreeNode = {
          id: 'diet-types-root',
          name: 'Diet Types',
          type: 'category',
          icon: 'Heart',
          count: dietTypesList.length,
          children: dietTypesList.map(dt => ({
            id: dt.dietTypeId,
            name: dt.dietTypeName,
            type: 'diet-type' as const,
            icon: 'Leaf',
            href: `/diet-types/${dt.dietTypeId}`,
            metadata: { dietCategory: dt.dietCategory },
          })),
        };
        sharedNode.children!.push(dietTypesNode);
      }

      // Meal Periods
      if (mealPeriodsList.length > 0) {
        const mealPeriodsNode: TreeNode = {
          id: 'meal-periods-root',
          name: 'Meal Periods',
          type: 'category',
          icon: 'Clock',
          count: mealPeriodsList.length,
          children: mealPeriodsList.map(mp => ({
            id: mp.mealPeriodId,
            name: mp.mealPeriodName,
            type: 'meal-period' as const,
            icon: 'Utensils',
            href: `/meal-periods/${mp.mealPeriodId}`,
            metadata: { startTime: mp.typicalStartTime, endTime: mp.typicalEndTime },
          })),
        };
        sharedNode.children!.push(mealPeriodsNode);
      }

      // Vendors
      if (vendorsList.length > 0) {
        const vendorsNode: TreeNode = {
          id: 'vendors-root',
          name: 'Vendors',
          type: 'category',
          icon: 'Truck',
          count: vendorsList.length,
          children: vendorsList.map(vendor => ({
            id: vendor.vendorId,
            name: vendor.vendorName,
            type: 'vendor' as const,
            icon: 'Building',
            href: `/vendors/${vendor.vendorId}`,
            metadata: { 
              vendorCode: vendor.vendorCode,
              status: vendor.status,
            },
          })),
        };
        sharedNode.children!.push(vendorsNode);
      }

      // All Employees (tenant-wide roster view)
      if (employeesList.length > 0) {
        // Group by job title for organization
        const employeesByTitle = new Map<string, typeof employeesList>();
        for (const emp of employeesList) {
          const title = emp.jobTitle || 'Other';
          const existing = employeesByTitle.get(title) || [];
          existing.push(emp);
          employeesByTitle.set(title, existing);
        }

        const allEmployeesNode: TreeNode = {
          id: 'employees-root',
          name: 'All Employees',
          type: 'category',
          icon: 'Users',
          count: employeesList.length,
          children: [],
        };

        // Sort job titles and add to tree
        const sortedTitles = Array.from(employeesByTitle.keys()).sort();
        for (const title of sortedTitles) {
          const titleEmployees = employeesByTitle.get(title)!;
          const titleNode: TreeNode = {
            id: `employees-${title.toLowerCase().replace(/\s+/g, '-')}`,
            name: `${title}s`,
            type: 'category',
            icon: 'Folder',
            count: titleEmployees.length,
            children: titleEmployees.map(emp => ({
              id: `shared-${emp.employeeId}`, // Prefix to avoid ID collision with site employees
              name: `${emp.firstName} ${emp.lastName}`,
              type: 'employee' as const,
              icon: 'User',
              href: `/employees/${emp.employeeId}`,
              metadata: { 
                jobTitle: emp.jobTitle,
                primarySiteId: emp.primarySiteId,
              },
            })),
          };
          allEmployeesNode.children!.push(titleNode);
        }

        sharedNode.children!.push(allEmployeesNode);
      }

      // Tenant-wide cycle menus (no specific site)
      const tenantWideMenus = cycleMenusList.filter(m => !m.siteId);
      if (tenantWideMenus.length > 0) {
        const tenantMenusNode: TreeNode = {
          id: 'tenant-menus-root',
          name: 'Cycle Menus',
          type: 'category',
          icon: 'CalendarRange',
          count: tenantWideMenus.length,
          children: tenantWideMenus.map(menu => ({
            id: menu.cycleMenuId,
            name: menu.cycleName,
            type: 'cycle-menu' as const,
            icon: 'FileText',
            href: `/cycle-menus/${menu.cycleMenuId}`,
            metadata: { 
              cycleLengthWeeks: menu.cycleLengthWeeks,
              status: menu.status,
            },
          })),
        };
        sharedNode.children!.push(tenantMenusNode);
      }

      // Tenant-wide single-use menus (no specific site - applies to all sites)
      const tenantWideSingleUseMenus = singleUseMenusList.filter(m => !m.siteId);
      if (tenantWideSingleUseMenus.length > 0) {
        const tenantSingleUseNode: TreeNode = {
          id: 'tenant-single-use-menus-root',
          name: 'Special Menus',
          type: 'category',
          icon: 'CalendarCheck',
          count: tenantWideSingleUseMenus.length,
          children: tenantWideSingleUseMenus.map(menu => ({
            id: menu.singleUseMenuId,
            name: menu.menuName,
            type: 'single-use-menu' as const,
            icon: 'Sparkles',
            href: `/single-use-menus/${menu.singleUseMenuId}`,
            metadata: { 
              serviceDate: menu.serviceDate,
              occasion: menu.occasion,
              mode: menu.mode,
              status: menu.status,
            },
          })),
        };
        sharedNode.children!.push(tenantSingleUseNode);
      }

      // Only add shared node if it has children
      if (sharedNode.children!.length > 0) {
        tenantNode.children!.push(sharedNode);
      }

      tree.push(tenantNode);

      return tree;
    }),

  /**
   * Get children for a specific node (for lazy loading large branches)
   */
  getNodeChildren: protectedProcedure
    .input(z.object({
      nodeId: z.string(),
      nodeType: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { nodeId, nodeType } = input;
      const tenantId = ctx.tenantId;

      // Handle lazy loading for specific node types
      switch (nodeType) {
        case 'ingredients-category': {
          // Fetch all ingredients for a specific category
          const categoryId = nodeId.replace('ingredients-', '');
          const categoryIngredients = await db
            .select()
            .from(ingredients)
            .where(
              and(
                eq(ingredients.foodCategoryId, categoryId),
                or(eq(ingredients.tenantId, tenantId), isNull(ingredients.tenantId))
              )
            );
          
          return categoryIngredients.map(ing => ({
            id: ing.ingredientId,
            name: ing.ingredientName,
            type: 'ingredient' as const,
            icon: 'Leaf',
            href: `/ingredients/${ing.ingredientId}`,
          }));
        }

        default:
          return [];
      }
    }),
});
