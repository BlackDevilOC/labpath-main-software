export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE';

export type ProductCategory = 'REAGENT' | 'TUBE' | 'EQUIPMENT' | 'CHEMICAL';
export type ProductUnit = 'KIT' | 'BOX' | 'TRAY' | 'VIAL' | 'PACK' | 'UNIT';

export type OrderStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
export type LedgerEntryType = 'INVOICE_DEBIT' | 'PAYMENT_CREDIT' | 'RETURN_CREDIT' | 'OPENING_BALANCE';
export type VerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';

export interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  area?: string;
}

export interface Customer {
  id: string;
  labName: string;
  contactPerson: string;
  phone: string;
  areaCity: string; // e.g., "Hospital Road, Sukkur", "Military Road, Sukkur", "Rohri", "Shikarpur Road"
  creditLimit: number;
  currentBalance: number; // Positive means customer owes LabPath (Receivable)
  isActive: boolean;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantityOnHand: number;
  purchaseCost: number;
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
  requiresColdChain: boolean; // 2°C - 8°C storage for Biochemistry Reagents
  packSizeInfo: string; // e.g. "4 x 50ml", "100 Tubes/Tray"
}

export interface CustomerPrice {
  id: string;
  customerId: string;
  productId: string;
  customPrice: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unit: ProductUnit;
  quantity: number;
  standardPrice: number;
  unitPrice: number; // Either customer custom price or salesperson negotiated price
  lineTotal: number;
  allocatedBatchId?: string;
  allocatedBatchNumber?: string;
  allocatedBatchExpiry?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerArea: string;
  salespersonId: string;
  salespersonName: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalAmount: number;
  extraDiscountAmount: number;
  totalAmount: number;
  requiresApprovalReasons: string[]; // e.g. ["Credit limit exceeded by Rs. 24,500", "Custom rate discount applied"]
  approvalNote?: string;
  approvedBy?: string;
  isOfflineQueued?: boolean;
  clientSyncId: string;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  type: LedgerEntryType;
  amount: number;
  runningBalance: number;
  paymentMethod?: PaymentMethod;
  referenceNo?: string; // e.g. Invoice #LP-2026-101 or Meezan Bank Ref
  note?: string;
  status: VerificationStatus;
  recordedById: string;
  recordedByName: string;
  createdAt: string;
}

export interface ApprovalPolicy {
  requireApprovalForAllOrders: boolean;
  autoApproveWithinCreditLimit: boolean;
  maxSalespersonDiscountPercent: number;
}
