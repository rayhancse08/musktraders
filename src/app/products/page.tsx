"use client";

import React, { useState, useRef } from "react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Modal } from "@/components/inventory/modal";
import { Pagination } from "@/components/inventory/pagination";
import {
  TabSwitcher, SearchInput, FormSelect, FormLabel, FormInput, FormTextarea,
  PrimaryButton, SecondaryButton, AlertError, EmptyState, DeleteModal, Badge,
  SectionLoader, TableLoader,
} from "@/components/inventory/ui-primitives";
import {
  Product, ProductDetail, ProductCategory,
  ProductFormData, ProductCategoryFormData,
  UNIT_OPTIONS,
} from "@/types/product";
import {
  useProducts, useProductDetail, useProductCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct, useRecalculateProduct,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
} from "@/hooks/useProducts";
import { useBrandsAll } from "@/hooks/useBrands";
import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";

function ProductPlaceholder({ name }: { name?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">

      {/* subtle pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.15)_1px,_transparent_0)] bg-[size:12px_12px]" />

      {/* icon */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-10 h-10 mb-2 text-gray-400">
          {/* package icon */}
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="1.5" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <path strokeWidth="1.5" d="M3.3 7l8.7 5 8.7-5M12 22V12" />
          </svg>
        </div>

        {/* name */}
        <p className="text-[10px] text-gray-500 font-medium text-center px-2 line-clamp-2">
          {name || "No Image"}
        </p>
      </div>
    </div>
  );
}

const fmt = (v: string | number | null | undefined) =>
  v ? "$" + parseFloat(String(v)).toLocaleString("en-BD", { minimumFractionDigits: 2 }) : "—";

// ── Stock badge ────────────────────────────────────────────────────────────
function StockBadge({ qty }: { qty: number | null }) {
  if (qty === null || qty === 0)
    return <Badge variant="danger">Out of stock</Badge>;
  if (qty <= 5)
    return <Badge variant="warning">Low — {qty}</Badge>;
  return <Badge variant="success">{qty} ctn</Badge>;
}

function ProductThumb({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const src = product.image || product.thumbnail;

  if (!src || imgError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeWidth="1.5" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={product.name ?? "Product"}
      className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
      onError={() => setImgError(true)}
    />
  );
}

// ── Delete confirm (categories use shared DeleteModal) ─────────────────────

// ── Image preview input ────────────────────────────────────────────────────
function ImageInput({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = value ? URL.createObjectURL(value) : null;
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition-colors min-h-[80px]"
      >
        {preview
          ? <img src={preview} alt="preview" className="h-20 w-20 object-cover rounded-lg" />
          : <span className="text-xs text-gray-400">Click to upload image</span>
        }
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </div>
  );
}

const EMPTY_PRODUCT_FORM: ProductFormData = {
  brand: "", name: "", description: "", category: "",
  packet_per_carton: "", weight: "", unit: "gm",
  discount_type: "percentage", discount: "",
  manual_entry: false, image: null,
};

const EMPTY_CAT_FORM: ProductCategoryFormData = {
  name: "", is_featured: false, image: null,
};

// ════════════════════════════════════════════════════════════════════════════
export default function ProductsPage() {
  const [tab, setTab] = useState<"products" | "categories">("products");

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 24;

  // ── Product modal ─────────────────────────────────────────────────────────
  const [productModal,      setProductModal]      = useState(false);
  const [productEditId,     setProductEditId]     = useState<number | null>(null);
  const [productForm,       setProductForm]       = useState<ProductFormData>(EMPTY_PRODUCT_FORM);
  const [productDeleteId,   setProductDeleteId]   = useState<number | null>(null);
  const [productFormError,  setProductFormError]  = useState<string | null>(null);
  const [productEditLoading, setProductEditLoading] = useState(false);
  const [recalcId,          setRecalcId]          = useState<number | null>(null);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState<number | null>(null);

  // ── Category modal ────────────────────────────────────────────────────────
  const [catModal,       setCatModal]       = useState(false);
  const [catEditTarget,  setCatEditTarget]  = useState<ProductCategory | null>(null);
  const [catForm,        setCatForm]        = useState<ProductCategoryFormData>(EMPTY_CAT_FORM);
  const [catDeleteId,    setCatDeleteId]    = useState<number | null>(null);

  // ── React Query ───────────────────────────────────────────────────────────
  const params: Record<string, string> = { page: String(page) };
  if (search)    params.search   = search;
  if (catFilter) params.category = catFilter;

  const { data: productsData, isLoading: productsLoading } = useProducts(params);
  const { data: detailProduct, isLoading: detailLoading }  = useProductDetail(detailId);
  const { data: categories = [], isLoading: categoriesLoading } = useProductCategories();
  const { data: brands = [] }                              = useBrandsAll();

  const createProduct    = useCreateProduct();
  const updateProduct    = useUpdateProduct();
  const deleteProduct    = useDeleteProduct();
  const recalcProduct    = useRecalculateProduct();
  const createCategory   = useCreateCategory();
  const updateCategory   = useUpdateCategory();
  const deleteCategory   = useDeleteCategory();

  const products     = productsData?.results ?? [];
  const productCount = productsData?.count ?? 0;
  const pages        = Math.ceil(productCount / PAGE_SIZE);

  // ── Product handlers ──────────────────────────────────────────────────────
  const openCreateProduct = () => {
    setProductEditId(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setProductFormError(null);
    setProductModal(true);
  };

  const openEditProduct = async (p: Product | ProductDetail) => {
    setProductEditLoading(true);
    setProductFormError(null);
    try {
      const detail: ProductDetail = "description" in p && p.description !== undefined
        ? (p as ProductDetail)
        : await apiFetch(`${getApiBase()}/products/${p.id}/`);

      setProductEditId(p.id);
      setProductForm({
        brand:             String(detail.brand ?? ""),
        name:              detail.name ?? "",
        description:       detail.description ?? "",
        category:          String(detail.category ?? ""),
        packet_per_carton: String(detail.packet_per_carton ?? ""),
        weight:            String(detail.weight),
        unit:              detail.unit,
        discount_type:     detail.discount_type,
        discount:          detail.discount ?? "",
        manual_entry:      detail.manual_entry ?? false,
        image:             null,
      });
      setProductModal(true);
    } catch (err: unknown) {
      setProductFormError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setProductEditLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      setProductFormError("Product name is required.");
      return;
    }
    if (!productForm.brand) {
      setProductFormError("Please select a brand.");
      return;
    }
    if (!productForm.category) {
      setProductFormError("Please select a category.");
      return;
    }
    if (!productForm.weight) {
      setProductFormError("Weight is required.");
      return;
    }

    setProductFormError(null);
    try {
      if (productEditId) {
        await updateProduct.mutateAsync({ id: productEditId, form: productForm });
      } else {
        await createProduct.mutateAsync(productForm);
      }
      setProductModal(false);
    } catch (err: unknown) {
      setProductFormError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  // ── Category handlers ─────────────────────────────────────────────────────
  const openCreateCategory = () => {
    setCatEditTarget(null);
    setCatForm(EMPTY_CAT_FORM);
    setCatModal(true);
  };

  const openEditCategory = (c: ProductCategory) => {
    setCatEditTarget(c);
    setCatForm({ name: c.name, is_featured: c.is_featured, image: null });
    setCatModal(true);
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      if (catEditTarget) {
        await updateCategory.mutateAsync({ id: catEditTarget.id, form: catForm });
      } else {
        await createCategory.mutateAsync(catForm);
      }
      setCatModal(false);
    } catch {
      // errors shown via mutation state
    }
  };

  const setField = <T extends keyof ProductFormData>(k: T, v: ProductFormData[T]) =>
    setProductForm((p) => ({ ...p, [k]: v }));

  return (
    <>
      <Breadcrumb pageName="Products" />

      {/* Tabs */}
      <TabSwitcher
        tabs={[
          { key: "products" as const, label: "Products", count: productCount },
          { key: "categories" as const, label: "Categories", count: categories.length },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {/* ══════════════ PRODUCTS TAB ══════════════ */}
      {tab === "products" && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <div className="flex gap-2 flex-wrap">
              <SearchInput
                placeholder="Search products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <FormSelect
                value={catFilter}
                onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FormSelect>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{productCount} products</Badge>
              <PrimaryButton onClick={openCreateProduct}>
                <span className="text-lg leading-none">+</span> Add Product
              </PrimaryButton>
            </div>
          </div>

          {/* Product table */}
          <div className="card mb-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    {["Product", "Brand", "Category", "Weight", "Sale Price", "Packet Price", "Stock", "Discount", "Actions"].map((h) => (
                      <th
                        key={h}
                        className={["Sale Price", "Packet Price", "Actions"].includes(h) ? "text-right" : "text-left"}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productsLoading && <TableLoader colSpan={9} message="Loading products..." />}
                  {!productsLoading && products.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        No products found. Try adjusting your search or add a new product.
                      </td>
                    </tr>
                  )}
                  {!productsLoading && products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setDetailId(p.id)}
                      className="group cursor-pointer"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <ProductThumb product={p} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{p.name ?? "Unnamed"}</p>
                            {p.packet_per_carton && (
                              <p className="text-xs text-slate-400">{p.packet_per_carton} pkt/ctn</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
                            {p.brand_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-medium text-slate-700">{p.brand_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{p.category_name ?? "—"}</td>
                      <td className="text-slate-600">{p.weight}{p.unit}</td>
                      <td className="text-right font-mono font-semibold text-slate-900">{fmt(p.sale_price)}</td>
                      <td className="text-right font-mono text-slate-500">{fmt(p.packet_price)}</td>
                      <td><StockBadge qty={p.stocked_quantity} /></td>
                      <td>
                        {p.discount ? (
                          <span className="badge bg-red-50 text-red-700">
                            {p.discount_type === "percentage" ? `-${p.discount}%` : `-$${p.discount}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setDetailId(p.id)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditProduct(p)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setProductDeleteId(p.id)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <Pagination page={page} pages={pages} onChange={setPage} className="mb-6 rounded-2xl border border-gray-200/80 bg-white dark:bg-gray-dark dark:border-dark-3" />
          )}
        </>
      )}

      {/* ══════════════ CATEGORIES TAB ══════════════ */}
      {tab === "categories" && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">{categories.length} categories</span>
            <button onClick={openCreateCategory} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
              <span className="text-lg leading-none">+</span> Add Category
            </button>
          </div>
          {categoriesLoading && <SectionLoader message="Loading categories..." />}
          {!categoriesLoading && categories.length === 0 && (
            <EmptyState message="No categories found. Add a category to get started." />
          )}
          {!categoriesLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-sm transition-shadow">
                <div className="aspect-video bg-gray-50 relative overflow-hidden">
                  {c.image ? (
                    <>
                      <img
                        src={c.image}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div className="hidden absolute inset-0">
                        <ProductPlaceholder name={c.name ?? undefined} />
                      </div>
                    </>
                  ) : (
                    <ProductPlaceholder name={c.name ?? undefined} />
                  )}
                  {c.is_featured && (
                    <div className="absolute top-2 left-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Featured</div>
                  )}
                </div>
                <div className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                    {c.product_count !== undefined && (
                      <p className="text-xs text-gray-400">{c.product_count} products</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditCategory(c)} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 font-medium">Edit</button>
                    <button onClick={() => setCatDeleteId(c.id)} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 font-medium">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </>
      )}

      {/* ══════════════ PRODUCT DETAIL MODAL ══════════════ */}
      {detailId !== null && (
        <Modal
          open
          onClose={() => setDetailId(null)}
          title={detailProduct?.name ?? "Loading..."}
          subtitle={detailProduct ? `${detailProduct.brand_name} · ${detailProduct.category_name}` : undefined}
          maxWidth="2xl"
          headerActions={detailProduct ? (
            <>
              <button
                onClick={async () => { setRecalcId(detailProduct.id); await recalcProduct.mutateAsync(detailProduct.id); setRecalcId(null); }}
                disabled={recalcId === detailProduct.id}
                className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium disabled:opacity-50"
              >
                {recalcId === detailProduct.id ? "..." : "↻ Recalc"}
              </button>
              <button onClick={() => { setDetailId(null); openEditProduct(detailProduct); }} className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 font-medium">Edit</button>
            </>
          ) : undefined}
          footer={
            <div className="flex justify-end">
              <SecondaryButton onClick={() => setDetailId(null)}>Close</SecondaryButton>
            </div>
          }
        >
              {detailLoading && <SectionLoader message="Loading product details..." />}
              {detailProduct && !detailLoading && (
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
                      {detailProduct.image ? (
                        <>
                          <img
                            src={detailProduct.image}
                            alt={detailProduct.name ?? ""}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="hidden w-full h-full">
                            <ProductPlaceholder name={detailProduct.name ?? undefined} />
                          </div>
                        </>
                      ) : (
                        <ProductPlaceholder name={detailProduct.name ?? undefined} />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    {/* Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Stocked (ctn)", value: String(detailProduct.stocked_quantity ?? 0), color: "text-gray-800" },
                        { label: "Stocked (pcs)", value: String(detailProduct.stocked_packet_quantity ?? 0), color: "text-gray-800" },
                        { label: "Pkt/Carton",    value: String(detailProduct.packet_per_carton ?? "—"),   color: "text-gray-600" },
                        { label: "Weight",         value: `${detailProduct.weight}${detailProduct.unit}`,  color: "text-gray-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className={`font-semibold text-sm ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Purchase Price", value: fmt(detailProduct.purchase_price), color: "text-gray-700" },
                        { label: "Sale Price",     value: fmt(detailProduct.sale_price),     color: "text-blue-700" },
                        { label: "Packet Price",   value: fmt(detailProduct.packet_price),   color: "text-gray-600" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Discount */}
                    {detailProduct.discount && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Discount:</span>
                        <span className="font-medium text-red-600">
                          {detailProduct.discount_type === "percentage" ? `${detailProduct.discount}%` : `$${detailProduct.discount}`}
                        </span>
                        <span className="text-gray-400">→ Discounted price:</span>
                        <span className="font-mono font-semibold text-emerald-700">{fmt(detailProduct.discount_price)}</span>
                      </div>
                    )}

                    {/* Description */}
                    {detailProduct.description && (
                      <p className="text-sm text-gray-500 leading-relaxed">{detailProduct.description}</p>
                    )}
                  </div>
                </div>
              )}
        </Modal>
      )}

      {/* ══════════════ PRODUCT FORM MODAL ══════════════ */}
      {productModal && (
        <Modal
          open
          onClose={() => setProductModal(false)}
          title={productEditId ? "Edit Product" : "New Product"}
          subtitle="Stock & prices auto-calculated from warehouse"
          maxWidth="lg"
          footer={
            <div className="flex justify-end gap-3">
              <SecondaryButton onClick={() => setProductModal(false)}>Cancel</SecondaryButton>
              <PrimaryButton
                onClick={handleSaveProduct}
                disabled={createProduct.isPending || updateProduct.isPending || productEditLoading}
              >
                {createProduct.isPending || updateProduct.isPending ? "Saving..." : productEditId ? "Update" : "Save Product"}
              </PrimaryButton>
            </div>
          }
        >
          {productEditLoading ? (
            <SectionLoader message="Loading product details..." />
          ) : (
            <div className="space-y-4">
              {(productFormError || createProduct.isError || updateProduct.isError) && (
                <AlertError
                  message={
                    productFormError
                    ?? ((createProduct.error || updateProduct.error) as Error)?.message
                    ?? "Failed to save"
                  }
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormLabel>Product Name</FormLabel>
                  <FormInput placeholder="e.g. Rice Bran Oil 5L" value={productForm.name} onChange={(e) => setField("name", e.target.value)} />
                </div>

                <div>
                  <FormLabel>Brand</FormLabel>
                  <FormSelect value={productForm.brand} onChange={(e) => setField("brand", e.target.value)}>
                    <option value="">Select brand...</option>
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </FormSelect>
                </div>

                <div>
                  <FormLabel>Category</FormLabel>
                  <FormSelect value={productForm.category} onChange={(e) => setField("category", e.target.value)}>
                    <option value="">Select category...</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </FormSelect>
                </div>

                <div>
                  <FormLabel>Packets / Carton</FormLabel>
                  <FormInput type="number" placeholder="12" value={productForm.packet_per_carton} onChange={(e) => setField("packet_per_carton", e.target.value)} />
                </div>

                <div>
                  <FormLabel>Weight</FormLabel>
                  <FormInput type="number" placeholder="500" value={productForm.weight} onChange={(e) => setField("weight", e.target.value)} />
                </div>

                <div>
                  <FormLabel>Unit</FormLabel>
                  <FormSelect value={productForm.unit} onChange={(e) => setField("unit", e.target.value as ProductFormData["unit"])}>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </FormSelect>
                </div>

                <div>
                  <FormLabel>Discount Type</FormLabel>
                  <FormSelect value={productForm.discount_type} onChange={(e) => setField("discount_type", e.target.value as ProductFormData["discount_type"])}>
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat</option>
                  </FormSelect>
                </div>

                <div>
                  <FormLabel>Discount {productForm.discount_type === "percentage" ? "(%)" : "($)"}</FormLabel>
                  <FormInput type="number" placeholder="0" value={productForm.discount} onChange={(e) => setField("discount", e.target.value)} />
                </div>

                <div className="col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormTextarea rows={2} placeholder="Optional description..." value={productForm.description} onChange={(e) => setField("description", e.target.value)} />
                </div>

                <div className="col-span-2">
                  <ImageInput label="Product Image" value={productForm.image} onChange={(f) => setField("image", f)} />
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="manual_entry" checked={productForm.manual_entry} onChange={(e) => setField("manual_entry", e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  <label htmlFor="manual_entry" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">Manual entry (bypass warehouse stock calculation)</label>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary">
                <strong>stocked_quantity</strong>, <strong>sale_price</strong>, <strong>purchase_price</strong> and <strong>packet_price</strong> are computed from warehouse items. Use ↻ Recalc on the detail view to refresh.
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ══════════════ CATEGORY FORM MODAL ══════════════ */}
      {catModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start">
              <h2 className="text-lg font-semibold text-gray-900">{catEditTarget ? "Edit Category" : "New Category"}</h2>
              <button onClick={() => setCatModal(false)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">✕</button>
            </div>
            <div className="px-7 py-6 space-y-4">
              {(createCategory.isError || updateCategory.isError) && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {((createCategory.error || updateCategory.error) as any)?.message ?? "Failed"}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Category Name</label>
                <input autoFocus className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-blue-400" value={catForm.name} onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_featured" checked={catForm.is_featured} onChange={(e) => setCatForm((p) => ({ ...p, is_featured: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="is_featured" className="text-sm text-gray-600 cursor-pointer">Featured category</label>
              </div>
              <ImageInput label="Category Image" value={catForm.image} onChange={(f) => setCatForm((p) => ({ ...p, image: f }))} />
            </div>
            <div className="px-7 pb-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setCatModal(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveCategory} disabled={createCategory.isPending || updateCategory.isPending} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-blue-700">
                {createCategory.isPending || updateCategory.isPending ? "Saving..." : catEditTarget ? "Update" : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE CONFIRMS ══════════════ */}
      {productDeleteId !== null && (
        <DeleteModal
          label="product"
          loading={deleteProduct.isPending}
          onConfirm={async () => { await deleteProduct.mutateAsync(productDeleteId); setProductDeleteId(null); }}
          onClose={() => setProductDeleteId(null)}
        />
      )}
      {catDeleteId !== null && (
        <DeleteModal
          label="category"
          loading={deleteCategory.isPending}
          onConfirm={async () => { await deleteCategory.mutateAsync(catDeleteId); setCatDeleteId(null); }}
          onClose={() => setCatDeleteId(null)}
        />
      )}
    </>
  );
}
