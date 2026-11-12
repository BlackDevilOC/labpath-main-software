export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';

export type ProductCategory = 'REAGENT' | 'TUBE' | 'EQUIPMENT' | 'CHEMICAL';
export type ProductUnit = 'KIT' | 'BOX' | 'TRAY' | 'VIAL' | 'PACK' | 'UNIT';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED';

export type PaymentTerms = 'CASH' | 'CREDIT_BILL' | 'BANK_TRANSFER';

export type AppRouteKey =
  | 'NEW_ORDER'
  | 'APPROVALS'
  | 'DISPATCH'
  | 'INVOICES'
  | 'INVENTORY'
  | 'ADMIN_PANEL'
  | 'UNAUTHORIZED';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  area?: string;
  isActive?: boolean;
}

export interface BuyerPreset {
  id: string;
  buyerName: string;
  contactPerson: string;
  phone: string;
  areaCity: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  mfgDate?: string; // YYYY-MM-DD (Manufacturing or Stock Received Date)
  expiryDate: string; // YYYY-MM-DD (Expiry Date)
  quantityOnHand: number;
  purchaseCost: number;
  rackLocation?: string; // e.g., "Cold Room Fridge #1" or "Rack B-02"
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string;
  unit: ProductUnit;
  basePrice: number;
  minStockAlert: number;
  requiresColdChain: boolean;
  packSizeInfo: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  packSizeInfo: string;
  sku: string;
  unit: ProductUnit;
  quantity: number;
  bonusQty: number;
  standardPrice: number;
  unitPrice: number;
  lineTotal: number;
  allocatedBatchId?: string;
  allocatedBatchNumber?: string;
  allocatedBatchExpiry?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerContact: string;
  buyerPhone: string;
  buyerArea: string;
  paymentTerms: PaymentTerms;
  salespersonId: string;
  salespersonName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalAmount: number;
  extraDiscountAmount: number;
  totalAmount: number;
  orderNote?: string;
  adminAdjustmentNote?: string;
  approvedBy?: string;
  dispatchedBy?: string;
  isOfflineQueued?: boolean;
  clientSyncId: string;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export const ROLE_ALLOWED_ROUTES: Record<UserRole, AppRouteKey[]> = {
  ADMIN: [
    'NEW_ORDER',
    'APPROVALS',
    'DISPATCH',
    'INVOICES',
    'INVENTORY',
    'ADMIN_PANEL',
  ],
  MANAGER: ['DISPATCH', 'INVOICES', 'INVENTORY'],
  SALES: ['NEW_ORDER', 'INVOICES'],
  WAREHOUSE: ['DISPATCH', 'INVOICES', 'INVENTORY'],
};

export const ROLE_DEFAULT_ROUTE: Record<UserRole, AppRouteKey> = {
  ADMIN: 'APPROVALS',
  MANAGER: 'INVENTORY',
  SALES: 'NEW_ORDER',
  WAREHOUSE: 'DISPATCH',
};
