import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type CustomAdder = {
  id: string;
  name: string;
  description: string;
  calculation_type: 'per_kw' | 'per_panel' | 'flat_rate';
  rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function CustomAdders() {
  const [adders, setAdders] = useState<CustomAdder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    calculation_type: 'per_kw' as 'per_kw' | 'per_panel' | 'flat_rate',
    rate: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAdders();
  }, []);

  const fetchAdders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_adders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdders(data || []);
    } catch (err) {
      console.error('Error fetching adders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('custom_adders')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_adders')
          .insert([formData]);

        if (error) throw error;
      }

      resetForm();
      fetchAdders();
    } catch (err) {
      console.error('Error saving adder:', err);
    }
  };

  const handleEdit = (adder: CustomAdder) => {
    setFormData({
      name: adder.name,
      description: adder.description,
      calculation_type: adder.calculation_type,
      rate: adder.rate,
      is_active: adder.is_active,
    });
    setEditingId(adder.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adder?')) return;

    try {
      const { error } = await supabase
        .from('custom_adders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAdders();
    } catch (err) {
      console.error('Error deleting adder:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      calculation_type: 'per_kw',
      rate: 0,
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getCalculationLabel = (type: string) => {
    switch (type) {
      case 'per_kw':
        return 'Per kW';
      case 'per_panel':
        return 'Per Panel';
      case 'flat_rate':
        return 'Flat Rate';
      default:
        return type;
    }
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
            <h2 className="text-xl font-bold text-gray-900">Custom Adders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage custom adders for customer projects</p>
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
                Add Adder
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
                {editingId ? 'Edit Adder' : 'Add New Adder'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Adder Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Steep Roof, Metal Roof"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the adder"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Calculation Type
                    </label>
                    <select
                      value={formData.calculation_type}
                      onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="per_kw">Per kW</option>
                      <option value="per_panel">Per Panel</option>
                      <option value="flat_rate">Flat Rate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active
                  </label>
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
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rate</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {adders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No custom adders found. Add your first adder to get started.
                      </td>
                    </tr>
                  ) : (
                    adders.map((adder) => (
                      <tr key={adder.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{adder.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{adder.description || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getCalculationLabel(adder.calculation_type)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          ${adder.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              adder.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {adder.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(adder)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(adder.id)}
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
