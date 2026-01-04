import AdminPanel from './AdminPanel';

export default function Batteries() {
  return (
    <AdminPanel
      title="Batteries"
      tableName="batteries"
      fields={[
        { name: 'brand', label: 'Brand', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'capacity_kwh', label: 'Capacity (kWh)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'power_output_kw', label: 'Power Output (kW)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'cost', label: 'Cost ($)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'warranty_years', label: 'Warranty (Years)', type: 'number', required: true, default: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}
