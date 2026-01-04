import AdminPanel from './AdminPanel';

export default function Racking() {
  return (
    <AdminPanel
      title="Racking Systems"
      tableName="racking"
      fields={[
        { name: 'brand', label: 'Brand', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'roof_type', label: 'Roof Type', type: 'select', required: true, options: [
          { value: 'composition', label: 'Composition' },
          { value: 'tile', label: 'Tile' },
          { value: 'metal', label: 'Metal' },
          { value: 'flat', label: 'Flat' },
        ]},
        { name: 'cost_per_panel', label: 'Cost per Panel ($)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'warranty_years', label: 'Warranty (Years)', type: 'number', required: true, default: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}
