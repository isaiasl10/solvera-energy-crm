import AdminPanel from './AdminPanel';

export default function Panels() {
  return (
    <AdminPanel
      title="Solar Panels"
      tableName="panels"
      fields={[
        { name: 'brand', label: 'Brand', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'wattage', label: 'Wattage (W)', type: 'number', required: true, default: 0 },
        { name: 'efficiency', label: 'Efficiency (%)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'cost', label: 'Cost ($)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'warranty_years', label: 'Warranty (Years)', type: 'number', required: true, default: 0 },
        { name: 'dimensions_length', label: 'Length (inches)', type: 'number', step: '0.01', default: 0 },
        { name: 'dimensions_width', label: 'Width (inches)', type: 'number', step: '0.01', default: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}
