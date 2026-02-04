/**
 * Three-Panel Layout (Cursor-style)
 * 
 * IDE-inspired layout with:
 * - Left: Entity tree (resizable, collapsible)
 * - Center: Main content area
 * - Right: Agent chat panel (resizable, collapsible)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  PanelLeft, 
  PanelRight, 
  Search,
  Settings,
  LogOut,
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import { EntityTree } from './EntityTree';
import { AgentPanel } from './AgentPanel';
import { OmniSearch } from './OmniSearch';

interface PanelState {
  width: number;
  collapsed: boolean;
  minWidth: number;
  maxWidth: number;
}

export function ThreePanelLayout() {
  const { user, logout } = useAuth();
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  
  // Panel states
  const [leftPanel, setLeftPanel] = useState<PanelState>({
    width: 280,
    collapsed: false,
    minWidth: 200,
    maxWidth: 400,
  });
  
  const [rightPanel, setRightPanel] = useState<PanelState>({
    width: 380,
    collapsed: false,
    minWidth: 300,
    maxWidth: 600,
  });
  
  // Resize handling
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingPanel = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((panel: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    resizingPanel.current = panel;
    startX.current = e.clientX;
    startWidth.current = panel === 'left' ? leftPanel.width : rightPanel.width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [leftPanel.width, rightPanel.width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingPanel.current) return;
      
      const delta = e.clientX - startX.current;
      const newWidth = resizingPanel.current === 'left' 
        ? startWidth.current + delta
        : startWidth.current - delta;
      
      if (resizingPanel.current === 'left') {
        setLeftPanel(prev => ({
          ...prev,
          width: Math.max(prev.minWidth, Math.min(prev.maxWidth, newWidth)),
        }));
      } else {
        setRightPanel(prev => ({
          ...prev,
          width: Math.max(prev.minWidth, Math.min(prev.maxWidth, newWidth)),
        }));
      }
    };

    const handleMouseUp = () => {
      resizingPanel.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Keyboard shortcut for omni-search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOmniSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setOmniSearchOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-screen flex flex-col bg-background text-foreground overflow-hidden"
    >
      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 bg-card border-b border-border flex-shrink-0">
        {/* Left: Logo & Panel Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLeftPanel(p => ({ ...p, collapsed: !p.collapsed }))}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title={leftPanel.collapsed ? 'Show entity tree' : 'Hide entity tree'}
          >
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-base font-semibold text-primary tracking-tight">
            🍴 Vitality
          </span>
        </div>

        {/* Center: Omni-search trigger */}
        <button
          onClick={() => setOmniSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 hover:bg-secondary rounded-md border border-border text-muted-foreground text-sm transition-colors min-w-[240px]"
        >
          <Search className="w-4 h-4" />
          <span>Search entities, commands...</span>
          <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        {/* Right: User & Panel Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {user?.tenantName}
          </span>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={logout}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setRightPanel(p => ({ ...p, collapsed: !p.collapsed }))}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title={rightPanel.collapsed ? 'Show agent panel' : 'Hide agent panel'}
          >
            <PanelRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Entity Tree */}
        {!leftPanel.collapsed && (
          <>
            <aside 
              className="flex flex-col bg-card border-r border-border overflow-hidden"
              style={{ width: leftPanel.width }}
            >
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <EntityTree />
              </div>
            </aside>
            
            {/* Left Resize Handle */}
            <div
              className="w-1 hover:w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
              onMouseDown={(e) => handleMouseDown('left', e)}
            />
          </>
        )}

        {/* Center: Main Content */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </main>

        {/* Right Panel: Agent Chat */}
        {!rightPanel.collapsed && (
          <>
            {/* Right Resize Handle */}
            <div
              className="w-1 hover:w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
              onMouseDown={(e) => handleMouseDown('right', e)}
            />
            
            <aside 
              className="flex flex-col bg-card border-l border-border overflow-hidden"
              style={{ width: rightPanel.width }}
            >
              <AgentPanel />
            </aside>
          </>
        )}
      </div>

      {/* Omni Search Modal */}
      <OmniSearch 
        isOpen={omniSearchOpen} 
        onClose={() => setOmniSearchOpen(false)} 
      />
    </div>
  );
}

