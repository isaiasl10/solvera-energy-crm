import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Trash2, Loader2 } from 'lucide-react';
import { supabase, type Financier, type FinancingProduct } from '../../lib/supabase';

type TabType = 'financiers' | 'products';

export default function FinancingManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('financiers');
  const [financiers, setFinanciers] = useState<Financier[]>([]);
  const [products, setProducts] = useState<FinancingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [financierForm, setFinancierForm] = useState({
    name: '',
    active: true,
  });

  const [productForm, setProductForm] = useState({
    financier_id: '',
    product_name: '',
    product_type: 'LOAN' as 'LOAN' | 'LEASE' | 'PPA',
    term_months: 240,
    apr: 0,
    active: true,
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    if (activeTab === 'financiers') {
      const { data, error: err } = await supabase
        .from('financiers')
        .select('*')
        .order('name');

      if (err) {
        setError(err.message);
      } else {
        setFinanciers(data || []);
      }
    } else {
      const { data, error: err } = await supabase
        .from('financing_products')
        .select('*, financier:financiers(*)')
        .order('product_name');

      if (err) {
        setError(err.message);
      } else {
        setProducts(data || []);
      }
    }

    setLoading(false);
  };

  const handleAddFinancier = async () => {
    if (!financierForm.name.trim()) {
      setError('Financier name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financiers')
      .insert([financierForm]);

    if (err) {
      setError(err.message);
    } else {
      setIsAdding(false);
      setFinancierForm({ name: '', active: true });
      loadData();
    }

    setLoading(false);
  };

  const handleUpdateFinancier = async (id: string) => {
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financiers')
      .update(financierForm)
      .eq('id', id);

    if (err) {
      setError(err.message);
    } else {
      setEditingId(null);
      loadData();
    }

    setLoading(false);
  };

  const handleDeleteFinancier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this financier? This will also delete all associated products.')) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financiers')
      .delete()
      .eq('id', id);

    if (err) {
      setError(err.message);
    } else {
      loadData();
    }

    setLoading(false);
  };

  const handleAddProduct = async () => {
    if (!productForm.financier_id || !productForm.product_name.trim()) {
      setError('Financier and product name are required');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financing_products')
      .insert([productForm]);

    if (err) {
      setError(err.message);
    } else {
      setIsAdding(false);
      setProductForm({
        financier_id: '',
        product_name: '',
        product_type: 'LOAN',
        term_months: 240,
        apr: 0,
        active: true,
      });
      loadData();
    }

    setLoading(false);
  };

  const handleUpdateProduct = async (id: string) => {
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financing_products')
      .update(productForm)
      .eq('id', id);

    if (err) {
      setError(err.message);
    } else {
      setEditingId(null);
      loadData();
    }

    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('financing_products')
      .delete()
      .eq('id', id);

    if (err) {
      setError(err.message);
    } else {
      loadData();
    }

    setLoading(false);
  };

  const startEditFinancier = (financier: Financier) => {
    setFinancierForm({
      name: financier.name,
      active: financier.active,
    });
    setEditingId(financier.id);
    setIsAdding(false);
  };

  const startEditProduct = (product: FinancingProduct) => {
    setProductForm({
      financier_id: product.financier_id,
      product_name: product.product_name,
      product_type: product.product_type,
      term_months: product.term_months,
      apr: product.apr,
      active: product.active,
    });
    setEditingId(product.id);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFinancierForm({ name: '', active: true });
    setProductForm({
      financier_id: '',
      product_name: '',
      product_type: 'LOAN',
      term_months: 240,
      apr: 0,
      active: true,
    });
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financing Management</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'financiers' ? 'Financier' : 'Product'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => { setActiveTab('financiers'); cancelEdit(); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'financiers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Financiers
            </button>
            <button
              onClick={() => { setActiveTab('products'); cancelEdit(); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Products
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'financiers' && (
                <div className="space-y-4">
                  {isAdding && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Financier</h3>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Financier Name
                          </label>
                          <input
                            type="text"
                            value={financierForm.name}
                            onChange={(e) => setFinancierForm({ ...financierForm, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Mosaic, Sunlight, GoodLeap"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="checkbox"
                            checked={financierForm.active}
                            onChange={(e) => setFinancierForm({ ...financierForm, active: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleAddFinancier}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          <Save className="w-4 h-4" />
                          Save Financier
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {financiers.length === 0 ? (
                      <p className="text-center text-gray-500 py-12">No financiers added yet</p>
                    ) : (
                      financiers.map((financier) => (
                        <div
                          key={financier.id}
                          className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors bg-white"
                        >
                          {editingId === financier.id ? (
                            <div className="space-y-5">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Financier Name
                                </label>
                                <input
                                  type="text"
                                  value={financierForm.name}
                                  onChange={(e) => setFinancierForm({ ...financierForm, name: e.target.value })}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-3 pt-2">
                                <input
                                  type="checkbox"
                                  checked={financierForm.active}
                                  onChange={(e) => setFinancierForm({ ...financierForm, active: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="text-sm font-medium text-gray-700">Active</label>
                              </div>
                              <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => handleUpdateFinancier(financier.id)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                >
                                  <Save className="w-4 h-4" />
                                  Save Changes
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900">{financier.name}</h4>
                                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                                    financier.active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {financier.active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => startEditFinancier(financier)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteFinancier(financier.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="space-y-4">
                  {isAdding && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Add New Product</h3>
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Financier
                            </label>
                            <select
                              value={productForm.financier_id}
                              onChange={(e) => setProductForm({ ...productForm, financier_id: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select Financier</option>
                              {financiers.filter(f => f.active).map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Product Name
                            </label>
                            <input
                              type="text"
                              value={productForm.product_name}
                              onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 20 Year Loan 4.99%"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Product Type
                            </label>
                            <select
                              value={productForm.product_type}
                              onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value as 'LOAN' | 'LEASE' | 'PPA' })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="LOAN">LOAN</option>
                              <option value="LEASE">LEASE</option>
                              <option value="PPA">PPA</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Term (Months)
                            </label>
                            <input
                              type="number"
                              value={productForm.term_months}
                              onChange={(e) => setProductForm({ ...productForm, term_months: parseInt(e.target.value) })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              APR (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={productForm.apr}
                              onChange={(e) => setProductForm({ ...productForm, apr: parseFloat(e.target.value) })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="checkbox"
                            checked={productForm.active}
                            onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label className="text-sm font-medium text-gray-700">Active</label>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={handleAddProduct}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                        >
                          <Save className="w-4 h-4" />
                          Save Product
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {products.length === 0 ? (
                      <p className="text-center text-gray-500 py-12">No products added yet</p>
                    ) : (
                      products.map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors bg-white"
                        >
                          {editingId === product.id ? (
                            <div className="space-y-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Financier
                                  </label>
                                  <select
                                    value={productForm.financier_id}
                                    onChange={(e) => setProductForm({ ...productForm, financier_id: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    {financiers.filter(f => f.active).map((f) => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Product Name
                                  </label>
                                  <input
                                    type="text"
                                    value={productForm.product_name}
                                    onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Product Type
                                  </label>
                                  <select
                                    value={productForm.product_type}
                                    onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value as 'LOAN' | 'LEASE' | 'PPA' })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  >
                                    <option value="LOAN">LOAN</option>
                                    <option value="LEASE">LEASE</option>
                                    <option value="PPA">PPA</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Term (Months)
                                  </label>
                                  <input
                                    type="number"
                                    value={productForm.term_months}
                                    onChange={(e) => setProductForm({ ...productForm, term_months: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    APR (%)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={productForm.apr}
                                    onChange={(e) => setProductForm({ ...productForm, apr: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-3 pt-2">
                                <input
                                  type="checkbox"
                                  checked={productForm.active}
                                  onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                                  className="h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="text-sm font-medium text-gray-700">Active</label>
                              </div>

                              <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => handleUpdateProduct(product.id)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                                >
                                  <Save className="w-4 h-4" />
                                  Save Changes
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                  <X className="w-4 h-4" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-gray-900">{product.product_name}</h4>
                                  <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    {product.product_type}
                                  </span>
                                  <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                                    product.active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {product.active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-gray-700">
                                    {product.financier?.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {product.term_months} months • {product.apr}% APR
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => startEditProduct(product)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
