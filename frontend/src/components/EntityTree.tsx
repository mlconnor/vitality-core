/**
 * Entity Tree Component
 * 
 * Cursor-style entity explorer that shows actual entities in a hierarchical tree.
 * Entities can be expanded to reveal children, and clicking navigates to the detail view.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  MapPin,
  LayoutGrid,
  ChefHat,
  Users,
  User,
  BookOpen,
  FileText,
  Folder,
  FolderOpen,
  Package,
  Leaf,
  Truck,
  Building,
  Calendar,
  CalendarRange,
  CalendarCheck,
  Heart,
  Clock,
  Utensils,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  ShoppingCart,
  Factory,
  Sparkles,
  Sunrise,
  Moon,
  Sun,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Configuration for which nodes can have items added
// Maps node name/id patterns to their "add new" route
const addableNodes: Record<string, { route: string; label: string }> = {
  'Sites': { route: '/sites?action=new', label: 'Add Site' },
  'Stations': { route: '/stations?action=new', label: 'Add Station' },
  'Employees': { route: '/employees?action=new', label: 'Add Employee' },
  'Diners': { route: '/diners?action=new', label: 'Add Diner' },
  'Recipes': { route: '/recipes/new', label: 'Add Recipe' },
  'Ingredients': { route: '/ingredients?action=new', label: 'Add Ingredient' },
  'Vendors': { route: '/vendors?action=new', label: 'Add Vendor' },
  'Cycle Menus': { route: '/cycle-menus?action=new', label: 'Add Cycle Menu' },
  'Special Menus': { route: '/special-menus/new', label: 'Add Special Menu' },
  'Purchase Orders': { route: '/purchase-orders?action=new', label: 'Add PO' },
  'Inventory': { route: '/inventory?action=new', label: 'Add Item' },
};

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  MapPin,
  LayoutGrid,
  ChefHat,
  Users,
  User,
  BookOpen,
  FileText,
  Folder,
  FolderOpen,
  Package,
  Leaf,
  Truck,
  Building,
  Calendar,
  CalendarRange,
  CalendarCheck,
  Heart,
  Clock,
  Utensils,
  MoreHorizontal,
  ShoppingCart,
  Factory,
  Sparkles,
  Sunrise,
  Moon,
  Sun,
  ClipboardList,
};

// Tree node type (matches backend)
interface TreeNode {
  id: string;
  name: string;
  type: string;
  icon?: string;
  count?: number;
  children?: TreeNode[];
  href?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

// Tree item component
interface TreeItemProps {
  node: TreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  selectedPath: string;
}

function TreeItem({ node, level, expandedNodes, onToggle, selectedPath }: TreeItemProps) {
  const navigate = useNavigate();
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isCategory = node.type === 'category';
  const isSelected = node.href && selectedPath === node.href;
  
  // Check if this node supports adding new items
  const addConfig = addableNodes[node.name];
  const canAdd = isCategory && addConfig;
  
  const IconComponent = node.icon ? iconMap[node.icon] || FileText : FileText;
  
  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle(node.id);
    }
    if (node.href) {
      navigate(node.href);
    }
  }, [hasChildren, node.id, node.href, onToggle, navigate]);

  const handleChevronClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.id);
  }, [node.id, onToggle]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (addConfig) {
      navigate(addConfig.route);
    }
  }, [addConfig, navigate]);

  // Indent based on level
  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1 py-1 px-2 cursor-pointer text-sm
          hover:bg-accent/50 rounded-sm transition-colors
          ${isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground/80'}
          ${isCategory ? 'font-medium' : ''}
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        {/* Expand/collapse chevron */}
        <div 
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={hasChildren ? handleChevronClick : undefined}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )
          ) : null}
        </div>

        {/* Icon */}
        <IconComponent 
          className={`w-4 h-4 flex-shrink-0 ${
            isCategory ? 'text-muted-foreground' : 'text-primary/70'
          }`} 
        />

        {/* Name */}
        <span className="flex-grow truncate">{node.name}</span>

        {/* Add button for categories that support it */}
        {canAdd && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAddClick}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {addConfig.label}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Count badge */}
        {node.count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {node.count}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main EntityTree component
export function EntityTree() {
  const location = useLocation();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => 
    // Start with tenant expanded (will be populated dynamically)
    new Set([])
  );

  // Fetch tree data from backend
  const { data: tree, isLoading, error } = trpc.tree.getEntityTree.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Auto-expand tenant node when data loads
  React.useEffect(() => {
    if (tree && tree.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        // Expand the tenant node
        next.add(tree[0].id);
        return next;
      });
    }
  }, [tree]);

  const handleToggle = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <AlertCircle className="w-5 h-5 mb-2" />
        <span className="text-sm">Failed to load entities</span>
      </div>
    );
  }

  // Empty state
  if (!tree || tree.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <span className="text-sm">No entities found</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="py-2">
        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            level={0}
            expandedNodes={expandedNodes}
            onToggle={handleToggle}
            selectedPath={location.pathname}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

// Export type for use in other components
export type { TreeNode };
