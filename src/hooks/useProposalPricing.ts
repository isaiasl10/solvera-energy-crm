import { useState, useEffect, useCallback } from 'react';

export interface ProposalAdder {
  adder_id: string;
  adder_name: string;
  cost: number;
  quantity: number;
}

export interface PricingInputs {
  systemSizeKw: number;
  pricePerWatt: number;
  meterFee?: number;
  adders?: ProposalAdder[];
  dealerFee?: number;
  monthlyUsage?: number[];
}

export interface PricingCalculation {
  systemCost: number;
  totalAdders: number;
  meterFee: number;
  subtotal: number;
  dealerFee: number;
  grossRevenue: number;
  estimatedAnnualProduction?: number;
}

export function useProposalPricing(inputs: PricingInputs) {
  const [pricing, setPricing] = useState<PricingCalculation>({
    systemCost: 0,
    totalAdders: 0,
    meterFee: 0,
    subtotal: 0,
    dealerFee: 0,
    grossRevenue: 0,
  });

  const calculatePricing = useCallback(() => {
    const systemCost = inputs.systemSizeKw * inputs.pricePerWatt;

    const totalAdders = (inputs.adders || []).reduce(
      (sum, adder) => sum + adder.cost * adder.quantity,
      0
    );

    const meterFee = inputs.meterFee || 0;

    const subtotal = systemCost + totalAdders + meterFee;

    const dealerFee = inputs.dealerFee || 0;

    const grossRevenue = subtotal + dealerFee;

    const estimatedAnnualProduction = inputs.monthlyUsage
      ? inputs.monthlyUsage.reduce((sum, usage) => sum + usage, 0)
      : undefined;

    setPricing({
      systemCost,
      totalAdders,
      meterFee,
      subtotal,
      dealerFee,
      grossRevenue,
      estimatedAnnualProduction,
    });
  }, [
    inputs.systemSizeKw,
    inputs.pricePerWatt,
    inputs.meterFee,
    inputs.adders,
    inputs.dealerFee,
    inputs.monthlyUsage,
  ]);

  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  const updateInput = useCallback(
    (key: keyof PricingInputs, value: any) => {
      calculatePricing();
    },
    [calculatePricing]
  );

  return {
    pricing,
    recalculate: calculatePricing,
    updateInput,
  };
}
