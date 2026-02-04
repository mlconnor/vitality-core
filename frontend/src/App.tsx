/**
 * Main App Component
 * 
 * Sets up routing and auth context.
 * Uses Cursor-style three-panel layout as the main interface.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './utils/auth';

// Layout
import { ThreePanelLayout } from './components/ThreePanelLayout';

// Pages - List Views
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SitesPage } from './pages/SitesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { DinersPage } from './pages/DinersPage';
import { DietTypesPage } from './pages/DietTypesPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { RecipesPage } from './pages/RecipesPage';
import { VendorsPage } from './pages/VendorsPage';
import { AllergensPage } from './pages/AllergensPage';
import { UnitsPage } from './pages/UnitsPage';
import { CategoriesPage } from './pages/CategoriesPage';

// Pages - Edit Views
import { RecipeEditPage } from './pages/RecipeEditPage';
import { SiteEditPage } from './pages/SiteEditPage';
import { StationEditPage } from './pages/StationEditPage';
import { EmployeeEditPage } from './pages/EmployeeEditPage';
import { DinerEditPage } from './pages/DinerEditPage';
import { DietTypeEditPage } from './pages/DietTypeEditPage';
import { MealPeriodEditPage } from './pages/MealPeriodEditPage';
import { VendorEditPage } from './pages/VendorEditPage';
import { IngredientEditPage } from './pages/IngredientEditPage';
import { CycleMenuEditPage } from './pages/CycleMenuEditPage';
import { SingleUseMenuEditPage } from './pages/SingleUseMenuEditPage';
import { PurchaseOrderEditPage } from './pages/PurchaseOrderEditPage';
import { InventoryEditPage } from './pages/InventoryEditPage';

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// App routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Redirect /app/* to /* for any old bookmarks */}
      <Route path="/app/*" element={<Navigate to="/" replace />} />
      
      {/* Main three-panel layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ThreePanelLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        
        {/* Organization */}
        <Route path="sites" element={<SitesPage />} />
        <Route path="sites/:id" element={<SiteEditPage />} />
        <Route path="stations/:id" element={<StationEditPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeEditPage />} />
        
        {/* Diners */}
        <Route path="diners" element={<DinersPage />} />
        <Route path="diners/:id" element={<DinerEditPage />} />
        <Route path="diet-types" element={<DietTypesPage />} />
        <Route path="diet-types/:id" element={<DietTypeEditPage />} />
        
        {/* Menu Planning */}
        <Route path="cycle-menus" element={<PlaceholderPage title="Cycle Menus" />} />
        <Route path="cycle-menus/:id" element={<CycleMenuEditPage />} />
        {/* Single-use menus (holiday/event menus) */}
        <Route path="single-use-menus/:id" element={<SingleUseMenuEditPage />} />
        {/* Back-compat: older path */}
        <Route path="special-menus/:id" element={<SpecialMenusRedirect />} />
        <Route path="menu-items" element={<PlaceholderPage title="Menu Items" />} />
        <Route path="meal-periods" element={<PlaceholderPage title="Meal Periods" />} />
        <Route path="meal-periods/:id" element={<MealPeriodEditPage />} />
        
        {/* Recipes & Ingredients */}
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="recipes/:id" element={<RecipeEditPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="ingredients/:id" element={<IngredientEditPage />} />
        
        {/* Inventory */}
        <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="inventory/:id" element={<InventoryEditPage />} />
        <Route path="receiving" element={<PlaceholderPage title="Receiving" />} />
        
        {/* Procurement */}
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="vendors/:id" element={<VendorEditPage />} />
        <Route path="purchase-orders" element={<PlaceholderPage title="Purchase Orders" />} />
        <Route path="purchase-orders/:id" element={<PurchaseOrderEditPage />} />
        
        {/* Reference Data */}
        <Route path="units" element={<UnitsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="allergens" element={<AllergensPage />} />
      </Route>
    </Routes>
  );
}

function SpecialMenusRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/single-use-menus/${id}` : '/'} replace />;
}

// Placeholder for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">This page is coming soon.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
