/**
 * Omni Search Component
 * 
 * Command palette-style search for entities, commands, and AI queries.
 * Triggered by ⌘K (similar to Cursor's command palette).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  Users,
  UtensilsCrossed,
  Package,
  Calendar,
  Truck,
  X,
  ArrowRight,
  Sparkles,
  Clock,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'entity' | 'command' | 'ai' | 'recent';
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
}

interface OmniSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample search results - in production, this would come from API
const generateResults = (query: string): SearchResult[] => {
  const q = query.toLowerCase();
  
  if (!q) {
    return [
      { id: 'recent-1', type: 'recent', category: 'Recent', title: 'Main Kitchen Site', subtitle: 'Viewed 2 hours ago', icon: Building2, href: '/sites/main-kitchen' },
      { id: 'recent-2', type: 'recent', category: 'Recent', title: 'Chicken Parmesan Recipe', subtitle: 'Edited yesterday', icon: UtensilsCrossed, href: '/recipes/chicken-parmesan' },
      { id: 'cmd-1', type: 'command', category: 'Commands', title: 'Create New Recipe', subtitle: '⌘N', icon: Command, href: '/recipes/new' },
      { id: 'cmd-2', type: 'command', category: 'Commands', title: 'View Production Schedule', subtitle: '⌘P', icon: Calendar, href: '/production' },
    ];
  }

  const results: SearchResult[] = [];

  // AI suggestion
  if (q.length > 2) {
    results.push({
      id: 'ai-query',
      type: 'ai',
      category: 'Ask AI',
      title: `Ask: "${query}"`,
      subtitle: 'Get AI assistance with your question',
      icon: Sparkles,
      action: () => console.log('AI Query:', query),
    });
  }

  // Entity matches
  if ('site'.includes(q) || 'kitchen'.includes(q) || 'main'.includes(q)) {
    results.push({
      id: 'site-main',
      type: 'entity',
      category: 'Sites',
      title: 'Main Kitchen',
      subtitle: 'Production Kitchen • Active',
      icon: Building2,
      href: '/sites/main-kitchen',
    });
  }

  if ('diner'.includes(q) || 'patient'.includes(q) || 'john'.includes(q)) {
    results.push({
      id: 'diner-1',
      type: 'entity',
      category: 'Diners',
      title: 'John Smith',
      subtitle: 'Room 204 • Diabetic Diet',
      icon: Users,
      href: '/diners/john-smith',
    });
  }

  if ('recipe'.includes(q) || 'chicken'.includes(q)) {
    results.push(
      {
        id: 'recipe-1',
        type: 'entity',
        category: 'Recipes',
        title: 'Chicken Parmesan',
        subtitle: 'Entrée • 50 portions',
        icon: UtensilsCrossed,
        href: '/recipes/chicken-parmesan',
      },
      {
        id: 'recipe-2',
        type: 'entity',
        category: 'Recipes',
        title: 'Grilled Chicken Breast',
        subtitle: 'Entrée • 100 portions',
        icon: UtensilsCrossed,
        href: '/recipes/grilled-chicken',
      }
    );
  }

  if ('vendor'.includes(q) || 'sysco'.includes(q)) {
    results.push({
      id: 'vendor-1',
      type: 'entity',
      category: 'Vendors',
      title: 'Sysco Foods',
      subtitle: 'Primary Distributor',
      icon: Truck,
      href: '/vendors/sysco',
    });
  }

  if ('ingredient'.includes(q) || 'flour'.includes(q)) {
    results.push({
      id: 'ingredient-1',
      type: 'entity',
      category: 'Ingredients',
      title: 'All-Purpose Flour',
      subtitle: '50 lb bag • Par: 10',
      icon: Package,
      href: '/ingredients/flour',
    });
  }

  // Commands
  if ('new'.includes(q) || 'create'.includes(q)) {
    results.push(
      { id: 'cmd-new-recipe', type: 'command', category: 'Commands', title: 'Create New Recipe', icon: Command, href: '/recipes/new' },
      { id: 'cmd-new-diner', type: 'command', category: 'Commands', title: 'Add New Diner', icon: Command, href: '/diners/new' },
      { id: 'cmd-new-order', type: 'command', category: 'Commands', title: 'Create Purchase Order', icon: Command, href: '/purchase-orders/new' }
    );
  }

  return results;
};

export function OmniSearch({ isOpen, onClose }: OmniSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Update results on query change
  useEffect(() => {
    setResults(generateResults(query));
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          if (selected.href) {
            navigate(selected.href);
            onClose();
          } else if (selected.action) {
            selected.action();
            onClose();
          }
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search entities, commands, or ask AI..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-base"
          />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedResults).map(([category, categoryResults]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
                {category}
              </div>
              {categoryResults.map((result) => {
                const currentIndex = flatIndex++;
                const isSelected = currentIndex === selectedIndex;
                const Icon = result.icon;

                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      if (result.href) {
                        navigate(result.href);
                        onClose();
                      } else if (result.action) {
                        result.action();
                        onClose();
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${isSelected ? 'bg-emerald-500/20' : 'hover:bg-slate-700/50'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${result.type === 'ai' 
                        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' 
                        : result.type === 'command'
                        ? 'bg-slate-700'
                        : 'bg-slate-700/50'
                      }
                    `}>
                      <Icon className={`w-4 h-4 ${result.type === 'ai' ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-xs text-slate-500 truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {results.length === 0 && query && (
            <div className="px-4 py-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↵</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

