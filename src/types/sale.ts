import type { DiscountType, SaleStatus } from "@/lib/sale-math";

export type { DiscountType, SaleStatus };

export type Sale = {
  id: number;
  order_no: string;
  date: string;
  delivery_date: string | null;
  status: SaleStatus;
  store: number;
  store_name: string;
  store_city?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_email?: string | null;
  billing_company_name: string | null;
  total_carton: number;
  sub_total: string;
  discount: string;
  total: string;
  payment: string;
  payment_due: string;
  profit: string;
};

export type SaleListSummary = {
  total: string;
  profit: string;
  payment: string;
  payment_due: string;
  total_carton: number;
};

export type SaleItemLot = {
  id: number;
  warehouse_item: number;
  lot_number: string | null;
  sale_quantity: number;
  purchase_price: string;
};

export type SaleItem = {
  id: number;
  product: number;
  product_name: string;
  packet_per_carton: number;
  product_discount_type: DiscountType;
  product_discount: string | null;
  quantity: number;
  price: string;
  packet_price: string;
  discount: string;
  total_price: string;
  total_purchased_price: string;
  profit: string;
  lot_information: string;
  lots: SaleItemLot[];
};

export type SalePayment = {
  id: number;
  amount: string;
  date: string;
  account_information: string | null;
  note: string | null;
};

export type SaleDetail = Sale & {
  billing_company: number | null;
  shipping_charge: string;
  discount_type: DiscountType;
  discount_amount: string;
  created: string;
  updated: string;
  sale_items: SaleItem[];
  sale_payments: SalePayment[];
};

/** A warehouse lot a sale item can draw from. */
export type AvailableLot = {
  warehouse_item: number;
  lot_number: string | null;
  available: number;
  own_quantity: number;
  purchased_price: string;
  sale_price: string | null;
  created: string;
};

export type SaleItemFormData = {
  key: string;
  id?: number;
  product: string;
  product_name: string;
  packet_per_carton: string;
  product_discount_type: DiscountType;
  product_discount: string;
  quantity: string;
  packet_price: string;
  discount: string;
  /** false = allocate oldest lots first automatically; true = use `lots` as entered. */
  manual_lots: boolean;
  /** Lots still exactly as saved; a quantity change then re-allocates automatically. */
  lots_from_saved?: boolean;
  lots: Record<number, string>;
};

export type SalePaymentFormData = {
  key: string;
  id?: number;
  date: string;
  amount: string;
  account_information: string;
  note: string;
};

export type SaleFormData = {
  date: string;
  delivery_date: string;
  store: string;
  store_name: string;
  billing_company: string;
  status: SaleStatus;
  shipping_charge: string;
  discount_type: DiscountType;
  discount_amount: string;
  sale_items: SaleItemFormData[];
  sale_payments: SalePaymentFormData[];
};

export type ProductOption = {
  id: number;
  name: string;
  stocked_quantity: number;
  packet_price: string | null;
  sale_price: string | null;
  packet_per_carton: number;
  discount_type: DiscountType;
  discount: string | null;
};

export type StoreOption = { id: number; name: string };
export type BillingOption = { id: number; name: string };
