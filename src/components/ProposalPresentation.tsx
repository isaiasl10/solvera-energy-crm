import React, { useEffect, useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ProposalPresentationProps = {
  proposalId: string;
};

export default function ProposalPresentation({ proposalId }: ProposalPresentationProps) {
  const [proposalData, setProposalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProposalData();
  }, [proposalId]);

  const loadProposalData = async () => {
    try {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          *,
          customers (
            full_name,
            email,
            phone,
            address,
            second_homeowner_name,
            second_homeowner_email,
            second_homeowner_phone
          ),
          panel_models (
            brand,
            model,
            watts,
            width_inches,
            height_inches
          ),
          financing_options (
            name,
            term_months,
            interest_rate
          )
        `)
        .eq('id', proposalId)
        .single();

      if (proposalError) throw proposalError;

      const { data: roofPlanes } = await supabase
        .from('proposal_roof_planes')
        .select('*')
        .eq('proposal_id', proposalId);

      const { data: panels } = await supabase
        .from('proposal_panels')
        .select('*, panel_models(*)')
        .eq('proposal_id', proposalId);

      const { data: adders } = await supabase
        .from('proposal_adders')
        .select('*, custom_adders(*)')
        .eq('proposal_id', proposalId);

      const { data: createdBy } = await supabase
        .from('app_users')
        .select('full_name, email, phone')
        .eq('id', proposal.created_by)
        .single();

      setProposalData({
        ...proposal,
        roof_planes: roofPlanes || [],
        panels: panels || [],
        adders: adders || [],
        created_by_user: createdBy,
      });
    } catch (error) {
      console.error('Error loading proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!proposalRef.current) return;

    setGenerating(true);
    try {
      const element = proposalRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Solar_Proposal_${proposalData?.customers?.full_name || 'Customer'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 16,
      }}>
        Loading proposal...
      </div>
    );
  }

  if (!proposalData) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#ef4444',
        fontSize: 16,
      }}>
        Proposal not found
      </div>
    );
  }

  const customer = proposalData.customers || {};
  const systemSizeKW = (proposalData.panels?.length * (proposalData.panel_models?.watts || proposalData.panel_watts || 0)) / 1000;
  const totalPrice = proposalData.total_price || proposalData.system_price || 0;
  const pricePerWatt = proposalData.price_per_watt || (totalPrice / (systemSizeKW * 1000));
  const federalTaxCredit = totalPrice * 0.30;
  const netCostAfterIncentives = totalPrice - federalTaxCredit;
  const annualProduction = proposalData.annual_production_estimate || 0;
  const annualSavings = annualProduction * (proposalData.electricity_rate || 0.15);
  const paybackYears = annualSavings > 0 ? netCostAfterIncentives / annualSavings : 0;

  const addersTotal = proposalData.adders?.reduce((sum: number, adder: any) => {
    const adderCost = (adder.custom_adders?.cost || 0) * (adder.quantity || 1);
    return sum + adderCost;
  }, 0) || 0;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div ref={proposalRef} style={{ background: '#fff', borderRadius: 12, padding: 40, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{
          textAlign: 'center',
          paddingBottom: 40,
          borderBottom: '2px solid #f97316',
          marginBottom: 40,
        }}>
          <div style={{
            width: 120,
            height: 120,
            margin: '0 auto 24px',
            background: '#f97316',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src="/solvera_energy_logo_redesign.png"
              alt="Solvera Energy"
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#111827', margin: '0 0 12px 0' }}>
            Solar Energy System Proposal
          </h1>
          <div style={{ fontSize: 18, color: '#6b7280', marginBottom: 8 }}>
            Prepared for <strong>{customer.full_name || 'Valued Customer'}</strong>
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>
            {proposalData.formatted_address}
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginTop: 16 }}>
            Proposal Date: {new Date(proposalData.created_at).toLocaleDateString()}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Proposal ID: {proposalData.id.substring(0, 8).toUpperCase()}
          </div>
        </div>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Executive Summary
          </h2>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, margin: 0 }}>
            This proposal outlines the design and installation of a <strong>{systemSizeKW.toFixed(2)} kW</strong> solar
            photovoltaic system at <strong>{proposalData.formatted_address}</strong>, designed to offset approximately{' '}
            <strong>{(annualProduction || 0).toLocaleString()} kWh</strong> annually. The system will significantly reduce your
            electricity costs while contributing to a cleaner environment.
          </p>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            System Design & Specifications
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>System Size</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>{systemSizeKW.toFixed(2)} kW</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Number of Panels</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>{proposalData.panels?.length || 0}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Panel Brand / Model</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {proposalData.panel_models?.brand || proposalData.panel_make || 'Standard'}{' '}
                  {proposalData.panel_models?.model || proposalData.panel_model || ''}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Panel Wattage</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {proposalData.panel_models?.watts || proposalData.panel_watts || 0}W
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Inverter Type</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {proposalData.inverter_type || 'String Inverter'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Racking Type</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {proposalData.racking_type || 'Standard Roof Mount'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Roof Type</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {proposalData.roof_type || 'Composition Shingle'}
                </td>
              </tr>
              {proposalData.battery_brand && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Battery Storage</td>
                  <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                    {proposalData.battery_brand} ({proposalData.battery_quantity || 1} unit{(proposalData.battery_quantity || 1) > 1 ? 's' : ''})
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Estimated Annual Production</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {(annualProduction || 0).toLocaleString()} kWh
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {proposalData.adders && proposalData.adders.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
              Additional Items
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item</th>
                  <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, color: '#374151' }}>Quantity</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#374151' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {proposalData.adders.map((adder: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: 12, color: '#111827' }}>{adder.custom_adders?.name || 'Additional Item'}</td>
                    <td style={{ padding: 12, color: '#111827', textAlign: 'center' }}>{adder.quantity || 1}</td>
                    <td style={{ padding: 12, color: '#111827', textAlign: 'right' }}>
                      ${((adder.custom_adders?.cost || 0) * (adder.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Investment & Pricing
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>System Price</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  ${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Price Per Watt</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  ${pricePerWatt.toFixed(2)}/W
                </td>
              </tr>
              {addersTotal > 0 && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Additional Items</td>
                  <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                    ${addersTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {proposalData.meter_fee && proposalData.meter_fee > 0 && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Meter Fee</td>
                  <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                    ${Number(proposalData.meter_fee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: '2px solid #111827', background: '#fef3c7' }}>
                <td style={{ padding: '12px 0', fontWeight: 700, color: '#111827', fontSize: 16 }}>Total Investment</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
                  ${(totalPrice + addersTotal + (Number(proposalData.meter_fee) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Federal Tax Incentive & Savings
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Federal Investment Tax Credit (ITC)</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>30%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Tax Credit Amount</td>
                <td style={{ padding: '12px 0', color: '#16a34a', textAlign: 'right', fontWeight: 600 }}>
                  ${federalTaxCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ borderBottom: '2px solid #111827', background: '#dcfce7' }}>
                <td style={{ padding: '12px 0', fontWeight: 700, color: '#111827', fontSize: 16 }}>Net Cost After Incentives</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right', fontWeight: 700, fontSize: 16 }}>
                  ${netCostAfterIncentives.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Estimated Annual Savings</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  ${annualSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Estimated Payback Period</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>
                  {paybackYears > 0 ? `${paybackYears.toFixed(1)} years` : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {proposalData.finance_type && proposalData.financing_options && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
              Financing Options
            </h2>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
                {proposalData.financing_options.name}
              </div>
              <div style={{ fontSize: 14, color: '#374151' }}>
                Term: {proposalData.financing_options.term_months} months |
                Interest Rate: {proposalData.financing_options.interest_rate}%
              </div>
            </div>
          </section>
        )}

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Estimated Project Timeline
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Site Survey</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>1-2 weeks</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Engineering & Design</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>2-3 weeks</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Permitting</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>4-6 weeks</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Installation</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>1-3 days</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Inspection</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>1-2 weeks</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Permission to Operate (PTO)</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>2-4 weeks</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Warranties
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Solar Panels</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>25 years manufacturer warranty</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Inverter</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>10-25 years manufacturer warranty</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Workmanship</td>
                <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>10 years installation warranty</td>
              </tr>
              {proposalData.battery_brand && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#374151' }}>Battery Storage</td>
                  <td style={{ padding: '12px 0', color: '#111827', textAlign: 'right' }}>10 years manufacturer warranty</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16, borderBottom: '2px solid #f97316', paddingBottom: 8 }}>
            Terms & Conditions
          </h2>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              <strong>Proposal Validity:</strong> This proposal is valid for 30 days from the date of issue.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Payment Schedule:</strong> Payment terms will be established upon contract signing.
              Typical schedule includes deposit, milestone payments, and final payment upon system activation.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Installation:</strong> Installation dates are subject to permit approval and material availability.
            </p>
            <p style={{ marginBottom: 12 }}>
              <strong>Performance:</strong> Energy production estimates are based on industry-standard modeling tools and
              historical weather data. Actual production may vary based on weather conditions, shading, and system performance.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: 40, padding: 24, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Contact Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, fontSize: 14 }}>
            <div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Sales Representative</div>
              <div style={{ color: '#111827', marginBottom: 4 }}>{proposalData.created_by_user?.full_name || 'Sales Team'}</div>
              {proposalData.created_by_user?.email && (
                <div style={{ color: '#6b7280', marginBottom: 4 }}>{proposalData.created_by_user.email}</div>
              )}
              {proposalData.created_by_user?.phone && (
                <div style={{ color: '#6b7280' }}>{proposalData.created_by_user.phone}</div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>Company Information</div>
              <div style={{ color: '#111827', marginBottom: 4 }}>Solvera Energy</div>
              <div style={{ color: '#6b7280', marginBottom: 4 }}>contact@solveraenergy.com</div>
              <div style={{ color: '#6b7280' }}>License #: [Your License Number]</div>
            </div>
          </div>
        </section>

        <div style={{
          padding: 24,
          background: '#fef3c7',
          borderRadius: 8,
          border: '2px solid #f97316',
          textAlign: 'center',
          marginBottom: 40,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Ready to Go Solar?
          </div>
          <div style={{ fontSize: 14, color: '#374151' }}>
            Contact us to discuss this proposal and take the next step toward clean, renewable energy.
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 40 }}>
        <button
          onClick={generatePDF}
          disabled={generating}
          style={{
            padding: '14px 32px',
            background: generating ? '#fcd34d' : '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: generating ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 16,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
          }}
        >
          <Download size={20} />
          {generating ? 'Generating PDF...' : 'Download as PDF'}
        </button>
      </div>
    </div>
  );
}
