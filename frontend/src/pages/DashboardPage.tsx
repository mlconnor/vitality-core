import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UtensilsCrossed, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '../utils/auth';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  link?: string;
}

function StatCard({ title, value, icon: Icon, change, changeType, link }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${
              changeType === 'positive' ? 'text-green-600' : 
              changeType === 'negative' ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-primary-100 rounded-full">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
}

interface AlertItemProps {
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: string;
}

function AlertItem({ type, message, action }: AlertItemProps) {
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`p-4 border rounded-lg ${colors[type]} flex items-start gap-3`}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        {action && (
          <button className="text-sm font-medium underline mt-1">{action}</button>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening at {user?.tenantName || 'your facility'} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Diners"
          value="127"
          icon={Users}
          change="3 new this week"
          changeType="positive"
          link="/diners"
        />
        <StatCard
          title="Active Recipes"
          value="48"
          icon={UtensilsCrossed}
          link="/recipes"
        />
        <StatCard
          title="Low Stock Items"
          value="12"
          icon={Package}
          change="3 critical"
          changeType="negative"
          link="/inventory"
        />
        <StatCard
          title="Pending Orders"
          value="5"
          icon={ShoppingCart}
          change="$2,847 total"
          changeType="neutral"
          link="/purchase-orders"
        />
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Requires Attention
        </h2>
        <div className="space-y-3">
          <AlertItem
            type="warning"
            message="Chicken breast below reorder point - 12 lbs remaining"
            action="Create PO"
          />
          <AlertItem
            type="error"
            message="Heavy cream expires in 2 days - 2 qt in stock"
            action="View inventory"
          />
          <AlertItem
            type="info"
            message="Mrs. Rodriguez (Rm 204) diet changed to Renal - review meal orders"
            action="Review orders"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Production */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-500" />
            Today's Production
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Lunch Service</span>
                <span className="font-medium">87% ready</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-primary-500 rounded-full" style={{ width: '87%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Dinner Service</span>
                <span className="font-medium">Scheduled</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-gray-400 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
            <p className="text-sm text-gray-500">142 portions expected</p>
          </div>
        </div>

        {/* Cost Tracking */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Cost Tracking
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-500">Avg. Cost per Meal</p>
                <p className="text-3xl font-bold text-gray-900">$2.34</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Target</p>
                <p className="text-lg font-semibold text-gray-700">$2.50</p>
              </div>
            </div>
            <div className="text-sm text-green-600">
              ↓ 6% below target this week
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

