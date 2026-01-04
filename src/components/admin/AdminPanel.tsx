import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type AdminPanelProps = {
  title: string;
  tableName: string;
  fields: FieldConfig[];
};

type FieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  default?: any;
};

export default function AdminPanel({ title, tableName, fields }: AdminPanelProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const defaultData: any = {};
    fields.forEach((field) => {
      defaultData[field.name] = field.default !== undefined ? field.default : '';
    });
    setFormData(defaultData);
  }, [fields]);

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([formData]);

        if (error) throw error;
      }

      resetForm();
      fetchItems();
    } catch (err) {
      console.error(`Error saving ${tableName}:`, err);
    }
  };

  const handleEdit = (item: any) => {
    const editData: any = {};
    fields.forEach((field) => {
      editData[field.name] = item[field.name];
    });
    setFormData(editData);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchItems();
    } catch (err) {
      console.error(`Error deleting ${tableName}:`, err);
    }
  };

  const resetForm = () => {
    const defaultData: any = {};
    fields.forEach((field) => {
      defaultData[field.name] = field.default !== undefined ? field.default : '';
    });
    setFormData(defaultData);
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (field: FieldConfig, value: any) => {
    let processedValue = value;
    if (field.type === 'number') {
      processedValue = parseFloat(value) || 0;
    } else if (field.type === 'checkbox') {
      processedValue = value;
    }
    setFormData({ ...formData, [field.name]: processedValue });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage {title.toLowerCase()}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
          >
            {showForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add New
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-3">
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {editingId ? `Edit ${title}` : `Add New ${title}`}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <div key={field.name} className={field.type === 'checkbox' ? 'col-span-full' : ''}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => handleChange(field, e.target.value)}
                          required={field.required}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData[field.name] || false}
                            onChange={(e) => handleChange(field, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{field.label}</span>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => handleChange(field, e.target.value)}
                          required={field.required}
                          step={field.step}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {fields.filter(f => f.type !== 'checkbox').map((field) => (
                      <th key={field.name} className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={fields.filter(f => f.type !== 'checkbox').length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                        No items found. Add your first item to get started.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {fields.filter(f => f.type !== 'checkbox').map((field) => (
                          <td key={field.name} className="px-4 py-2 text-sm text-gray-900">
                            {field.type === 'number'
                              ? typeof item[field.name] === 'number'
                                ? item[field.name].toFixed(2)
                                : '-'
                              : item[field.name] || '-'}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
