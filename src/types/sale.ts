export type SaleStatus =
  | 'confirmed' | 'packing' | 'delivering' | 'delivered' | 'cancelled';

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
  sub_total: string;
  discount: string;
  total: string;
  payment: string;
  payment_due: string;
  profit: string;
};

export type SaleItem = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  price: string;
  packet_price: string;
  discount: string;
  total_price: string;
  total_purchased_price: string;
  profit: string;
  lot_information: string;
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
  order_no: string;
  shipping_charge: string;
  discount_type: 'flat' | 'percentage';
  discount_amount: string;
  created: string;
  sale_items: SaleItem[];
  sale_payments: SalePayment[];
};

export type SaleFormData = {
  date: string;
  delivery_date: string;
  billing_company: string;
  store: string;
  status: SaleStatus;
  shipping_charge: string;
  discount_type: 'flat' | 'percentage';
  discount_amount: string;
  sale_items: SaleItemFormData[];
};

export type SaleItemFormData = {
  product: string;
  product_name: string;
  quantity: string;
  packet_price: string;
  sale_price: string;
  discount: string;
};

export type ProductOption = {
  id: number;
  name: string;
  stocked_quantity: number;
  packet_price: string;
  sale_price: string;
  packet_per_carton: number;
};

export type StoreOption = { id: number; name: string };
export type BillingOption = { id: number; name: string };