"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import SaleForm from "@/components/Sales/SaleForm";
import { SectionLoader } from "@/components/inventory/ui-primitives";
import { useSale } from "@/hooks/useSales";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id ?? "", 10);
  const { data, error, isLoading } = useSale(Number.isFinite(id) ? id : null);

  if (isLoading) return <SectionLoader message="Loading sale..." />;

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-red-600">{error?.message ?? "Sale not found."}</p>
        <Link href="/sales" className="btn-secondary mt-4">
          Back to sales
        </Link>
      </div>
    );
  }

  return <SaleForm sale={data} />;
}
