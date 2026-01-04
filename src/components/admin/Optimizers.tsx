import AdminPanel from './AdminPanel';

export default function Optimizers() {
  return (
    <AdminPanel
      title="Optimizers"
      tableName="optimizers"
      fields={[
        { name: 'brand', label: 'Brand', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'max_power_w', label: 'Max Power (W)', type: 'number', required: true, default: 0 },
        { name: 'cost', label: 'Cost ($)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'warranty_years', label: 'Warranty (Years)', type: 'number', required: true, default: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}
