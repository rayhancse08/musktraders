"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import PurchaseForm from "@/components/Purchases/PurchaseForm";
import { SectionLoader } from "@/components/inventory/ui-primitives";
import { usePurchase } from "@/hooks/usePurchases";

export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id ?? "", 10);
  const { data, error, isLoading } = usePurchase(Number.isFinite(id) ? id : null);

  if (isLoading) return <SectionLoader message="Loading purchase..." />;

  if (error || !data) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-red-600">{error?.message ?? "Purchase not found."}</p>
        <Link href="/purchases" className="btn-secondary mt-4">
          Back to purchases
        </Link>
      </div>
    );
  }

  return <PurchaseForm purchase={data} />;
}
