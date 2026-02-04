/**
 * Login Page
 * 
 * For now, uses dev token endpoint. Replace with real auth later.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Use the dev token endpoint
      const response = await fetch(`${API_URL}/trpc/auth.devToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            tenantId: 'TEN-DEMO001',
            role: 'admin',
          },
        }),
      });

      const data = await response.json();
      
      if (data.result?.data?.json) {
        const { token, payload, tenant } = data.result.data.json;
        // Construct user object from payload and tenant
        const user = {
          userId: payload.userId,
          email: payload.email,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
        };
        login(token, user);
        navigate('/');
      } else {
        setError('Failed to get dev token');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍴 VitalityIP</h1>
          <p className="text-gray-500">Food Service Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Dev login button */}
          <button
            onClick={handleDevLogin}
            disabled={isLoading}
            className="w-full btn-primary py-3 text-base disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign in with Dev Account'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Future: Real login form */}
          <form className="space-y-4 opacity-50 pointer-events-none">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                type="email"
                id="email"
                className="input"
                placeholder="you@example.com"
                disabled
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                type="password"
                id="password"
                className="input"
                placeholder="••••••••"
                disabled
              />
            </div>
            <button type="submit" disabled className="w-full btn-secondary py-3">
              Sign in (Coming soon)
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Development mode - real auth coming soon
        </p>
      </div>
    </div>
  );
}

