/**
 * Entity Modal Component
 * 
 * A generic modal for creating and editing entity records.
 * Dynamically renders form fields based on entity configuration.
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  disabled?: boolean;
}

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, any>;
  isLoading?: boolean;
  mode: 'create' | 'edit' | 'view';
}

export function EntityModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  initialData,
  isLoading = false,
  mode,
}: EntityModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      fields.forEach(field => {
        initial[field.name] = initialData?.[field.name] ?? field.defaultValue ?? '';
      });
      setFormData(initial);
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isViewMode = mode === 'view';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {fields.map(field => (
                <div key={field.name}>
                  <label 
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={isViewMode || field.disabled}
                      rows={3}
                      className="input resize-none"
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      required={field.required}
                      disabled={isViewMode || field.disabled}
                      className="input"
                    >
                      <option value="">Select {field.label.toLowerCase()}...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={field.name}
                        checked={!!formData[field.name]}
                        onChange={(e) => handleChange(field.name, e.target.checked)}
                        disabled={isViewMode || field.disabled}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">{field.placeholder}</span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, 
                        field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value
                      )}
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={isViewMode || field.disabled}
                      className="input"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

