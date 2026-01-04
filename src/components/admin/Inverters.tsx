import AdminPanel from './AdminPanel';

export default function Inverters() {
  return (
    <AdminPanel
      title="Inverters"
      tableName="inverters"
      fields={[
        { name: 'brand', label: 'Brand', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'capacity_kw', label: 'Capacity (kW)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'type', label: 'Type', type: 'select', required: true, options: [
          { value: 'string', label: 'String' },
          { value: 'micro', label: 'Micro' },
          { value: 'hybrid', label: 'Hybrid' },
        ]},
        { name: 'cost', label: 'Cost ($)', type: 'number', required: true, step: '0.01', default: 0 },
        { name: 'warranty_years', label: 'Warranty (Years)', type: 'number', required: true, default: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox', default: true },
      ]}
    />
  );
}
