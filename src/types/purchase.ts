export type PurchaseItem = {
  id: number;
  product: number;
  product_name: string;
  product_weight?: number;
  product_unit?: string;
  packet_per_carton: number;
  unit_price: string;
  total_unit_price: string;
  purchased_carton: number;
  received_carton: number | null;
  damaged_carton: number | null;
  profit_percentage: string | null;
  carton_price: string;
  carton_total_price: string;
  sale_price: string;
  total_price: string;
  cbm: string | null;
  cbm_total: string;
};

export type PurchasePayment = {
  id: number;
  amount: string;
  date: string;
  account_information: string | null;
  note: string | null;
};

export type Purchase = {
  id: number;
  lot_number: string;
  date: string | null;
  receive_date: string | null;
  vendor: number | null;
  vendor_name: string | null;
  total_product_price: string;
  shipping_cost: string;
  food_quality_control_cost: string;
  container_clearing_cost: string;
  lory_shipping_cost: string;
  labourer_handling_cost: string;
  warehouse_rent: string;
  employee_salary: string;
  warehouse_other_cost: string;
  additional_cost: string;
  total_purchase_cost: string;
  total_carton: number;
  carton_handling_cost: string;
  payment: string;
  payment_due: string;
  expected_sales: string;
  expected_profit: string;
};

export type PurchaseListSummary = {
  total_product_price: string;
  total_purchase_cost: string;
  payment: string;
  payment_due: string;
  total_carton: number;
};

export type PurchaseDetail = Purchase & {
  vendor_phone: string | null;
  vendor_email: string | null;
  vendor_address: string | null;
  total_cbm: string;
  lc_information: string | null;
  bil_information: string | null;
  container_information: string | null;
  purchase_items: PurchaseItem[];
  purchase_payments: PurchasePayment[];
  created: string;
  updated: string;
};

export type PurchaseItemFormData = {
  key: string;
  id?: number;
  product: string;
  product_name: string;
  packet_per_carton: string;
  unit_price: string;
  purchased_carton: string;
  received_carton: string;
  damaged_carton: string;
  profit_percentage: string;
  cbm: string;
};

export type PurchasePaymentFormData = {
  key: string;
  id?: number;
  date: string;
  amount: string;
  account_information: string;
  note: string;
};

export type PurchaseFormData = {
  date: string;
  receive_date: string;
  vendor: string;
  vendor_name: string;
  lot_number: string;
  shipping_cost: string;
  food_quality_control_cost: string;
  container_clearing_cost: string;
  lory_shipping_cost: string;
  labourer_handling_cost: string;
  warehouse_rent: string;
  employee_salary: string;
  warehouse_other_cost: string;
  lc_information: string;
  bil_information: string;
  container_information: string;
  purchase_items: PurchaseItemFormData[];
  purchase_payments: PurchasePaymentFormData[];
};

export type VendorOption = { id: number; name: string };

export type ProductOption = {
  id: number;
  name: string;
  stocked_quantity: number;
  packet_per_carton: number;
  sale_price: string | null;
  packet_price: string | null;
};
