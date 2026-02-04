/**
 * App Layout
 * 
 * Main layout with sidebar navigation and content area.
 */

import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  Users,
  Building2,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  Truck,
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../utils/auth';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    name: 'Organization',
    icon: Building2,
    children: [
      { name: 'Sites', href: '/sites', icon: Building2 },
      { name: 'Stations', href: '/stations', icon: Building2 },
      { name: 'Employees', href: '/employees', icon: Users },
    ],
  },
  {
    name: 'Diners',
    icon: Users,
    children: [
      { name: 'All Diners', href: '/diners', icon: Users },
      { name: 'Diet Types', href: '/diet-types', icon: ClipboardList },
    ],
  },
  {
    name: 'Recipes',
    icon: UtensilsCrossed,
    children: [
      { name: 'All Recipes', href: '/recipes', icon: UtensilsCrossed },
      { name: 'Ingredients', href: '/ingredients', icon: Package },
    ],
  },
  {
    name: 'Inventory',
    icon: Package,
    children: [
      { name: 'Stock Levels', href: '/inventory', icon: Package },
      { name: 'Receiving', href: '/receiving', icon: Truck },
    ],
  },
  {
    name: 'Procurement',
    icon: ShoppingCart,
    children: [
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'Vendors', href: '/vendors', icon: Truck },
    ],
  },
  {
    name: 'Reference',
    icon: ClipboardList,
    children: [
      { name: 'Units', href: '/units', icon: ClipboardList },
      { name: 'Categories', href: '/categories', icon: ClipboardList },
      { name: 'Allergens', href: '/allergens', icon: ClipboardList },
    ],
  },
];

function NavSection({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(true);

  if (item.href) {
    return (
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`
        }
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </NavLink>
    );
  }

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.name}</span>
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </>
          )}
        </button>
        {expanded && !collapsed && (
          <div className="ml-6 mt-1 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.name}
                to={child.href!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <span>{child.name}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function Layout() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <span className="text-lg font-semibold text-primary-600">🍴 VitalityIP</span>
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-primary-600">🍴 VitalityIP</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:block p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavSection key={item.name} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-200">
          {!sidebarCollapsed && user && (
            <div className="mb-2 px-3 text-sm">
              <div className="font-medium text-gray-900">{user.email}</div>
              <div className="text-gray-500">{user.tenantName}</div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } pt-16 lg:pt-0`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

