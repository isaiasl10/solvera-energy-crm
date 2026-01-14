import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useFinancingOptions() {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('financing_products')
          .select('*, financier:financiers(*)')
          .eq('active', true)
          .order('product_name');

        if (err) throw err;
        setOptions(data || []);
      } catch (e: any) {
        setError(e.message ?? "Failed to load financing options");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withCash = [{ id: "cash", name: "Cash", type: "cash" }, ...options];
  return { loading, error, options: withCash };
}
