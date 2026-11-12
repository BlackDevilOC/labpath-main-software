import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  AppUser,
  ApprovalPolicy,
  Customer,
  CustomerPrice,
  LedgerEntry,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  ProductBatch,
  UserRole,
} from '../types/labpath';
import {
  INITIAL_BATCHES,
  INITIAL_CUSTOMER_PRICES,
  INITIAL_CUSTOMERS,
  INITIAL_LEDGER,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
} from '../data/initialLabpathData';

interface CreateOrderInput {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  extraDiscountAmount: number;
  note?: string;
}

interface LabPathContextValue {
  // Active User / Role Switcher
  currentUser: AppUser;
  users: AppUser[];
  switchRole: (role: UserRole) => void;

  // Network / Offline Mode Simulation (for Field Sales in low-signal hospitals)
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  offlinePendingCount: number;
  syncOfflineQueue: () => number;

  // Database Provider Toggle (Neon.tech <-> Supabase portability preview)
  activeDbProvider: 'NEON' | 'SUPABASE';
  setActiveDbProvider: (provider: 'NEON' | 'SUPABASE') => void;

  // Approval Policy Settings
  approvalPolicy: ApprovalPolicy;
  updateApprovalPolicy: (patch: Partial<ApprovalPolicy>) => void;

  // Master Data
  customers: Customer[];
  products: Product[];
  batches: ProductBatch[];
  customerPrices: CustomerPrice[];
  orders: Order[];
  ledger: LedgerEntry[];

  // Helpers & Computations
  getEffectivePrice: (customerId: string, productId: string) => { price: number; isCustom: boolean; standardPrice: number };
  getProductTotalStock: (productId: string) => number;
  getFefoBatchesForProduct: (productId: string) => ProductBatch[];
  getDaysUntilExpiry: (expiryDate: string) => number;

  // Actions
  createOrder: (input: CreateOrderInput) => Order;
  approveOrder: (orderId: string, approvalNote?: string, updatedExtraDiscount?: number) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  packAndDispatchOrder: (orderId: string, status: 'PACKED' | 'DISPATCHED' | 'DELIVERED') => void;
  upsertCustomerPrice: (customerId: string, productId: string, customPrice: number) => void;
  addProductBatch: (batch: Omit<ProductBatch, 'id'>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'isActive'>) => void;
  recordRecoveryPayment: (input: {
    customerId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNo: string;
    note?: string;
  }) => void;
  verifyRecoveryPayment: (ledgerId: string, approve: boolean) => void;
}

const LabPathContext = createContext<LabPathContextValue | undefined>(undefined);

export function LabPathProvider({ children }: { children: React.ReactNode }) {
  const [users] = useState<AppUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]); // Starts as Admin so user can explore everything
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [activeDbProvider, setActiveDbProvider] = useState<'NEON' | 'SUPABASE'>('NEON');

  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>({
    requireApprovalForAllOrders: false,
    autoApproveWithinCreditLimit: true,
    maxSalespersonDiscountPercent: 5,
  });

  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [batches, setBatches] = useState<ProductBatch[]>(INITIAL_BATCHES);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>(INITIAL_CUSTOMER_PRICES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(INITIAL_LEDGER);

  const switchRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role);
    if (found) setCurrentUser(found);
  };

  const getEffectivePrice = (customerId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const standardPrice = prod ? prod.basePrice : 0;
    const custom = customerPrices.find(
      (cp) => cp.customerId === customerId && cp.productId === productId
    );
    if (custom) {
      return { price: custom.customPrice, isCustom: true, standardPrice };
    }
    return { price: standardPrice, isCustom: false, standardPrice };
  };

  const getFefoBatchesForProduct = (productId: string): ProductBatch[] => {
    return batches
      .filter((b) => b.productId === productId && b.quantityOnHand > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  };

  const getProductTotalStock = (productId: string): number => {
    return batches
      .filter((b) => b.productId === productId)
      .reduce((sum, b) => sum + b.quantityOnHand, 0);
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const now = new Date('2026-11-12T00:00:00');
    const exp = new Date(expiryDate);
    const diffMs = exp.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const createOrder = (input: CreateOrderInput): Order => {
    const customer = customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error('Customer not found');

    const orderItems: OrderItem[] = input.items.map((item, idx) => {
      const product = products.find((p) => p.id === item.productId)!;
      const fefoBatches = getFefoBatchesForProduct(item.productId);
      const primaryBatch = fefoBatches[0];

      return {
        id: `oi-${Date.now()}-${idx}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: item.quantity,
        standardPrice: product.basePrice,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        allocatedBatchId: primaryBatch?.id,
        allocatedBatchNumber: primaryBatch?.batchNumber,
        allocatedBatchExpiry: primaryBatch?.expiryDate,
      };
    });

    const subtotalAmount = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalAmount = Math.max(0, subtotalAmount - input.extraDiscountAmount);

    // Evaluate Smart Approval Rules
    const reasons: string[] = [];
    const projectedBalance = customer.currentBalance + totalAmount;

    if (approvalPolicy.requireApprovalForAllOrders) {
      reasons.push('Company policy requires Manager approval for all orders');
    }
    if (projectedBalance > customer.creditLimit) {
      reasons.push(
        `Credit Limit Exceeded: Balance (Rs. ${customer.currentBalance.toLocaleString()}) + Order (Rs. ${totalAmount.toLocaleString()}) = Rs. ${projectedBalance.toLocaleString()} (Limit: Rs. ${customer.creditLimit.toLocaleString()})`
      );
    }
    if (input.extraDiscountAmount > 0) {
      const discountPct = subtotalAmount > 0 ? (input.extraDiscountAmount / subtotalAmount) * 100 : 0;
      if (discountPct > approvalPolicy.maxSalespersonDiscountPercent || input.extraDiscountAmount > 0) {
        reasons.push(
          `Extra Field Discount of Rs. ${input.extraDiscountAmount.toLocaleString()} (${discountPct.toFixed(1)}%) requested`
        );
      }
    }

    const needsApproval = reasons.length > 0 || !approvalPolicy.autoApproveWithinCreditLimit;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `LP-2026-0${101 + orders.length + 1}`,
      customerId: customer.id,
      customerName: customer.labName,
      customerArea: customer.areaCity,
      salespersonId: currentUser.id,
      salespersonName: currentUser.name.split(' (')[0],
      status: needsApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      items: orderItems,
      subtotalAmount,
      extraDiscountAmount: input.extraDiscountAmount,
      totalAmount,
      requiresApprovalReasons: reasons,
      approvalNote: needsApproval
        ? input.note
        : 'Auto-approved (Within credit limit & agreed rates)',
      approvedBy: needsApproval ? undefined : 'System Auto-Rule',
      isOfflineQueued: isOfflineMode,
      clientSyncId: `sync-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const syncOfflineQueue = (): number => {
    let syncedCount = 0;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.isOfflineQueued) {
          syncedCount++;
          return { ...o, isOfflineQueued: false };
        }
        return o;
      })
    );
    setIsOfflineMode(false);
    return syncedCount;
  };

  const approveOrder = (orderId: string, approvalNote?: string, updatedExtraDiscount?: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const discount =
          typeof updatedExtraDiscount === 'number' ? updatedExtraDiscount : o.extraDiscountAmount;
        const total = Math.max(0, o.subtotalAmount - discount);
        return {
          ...o,
          status: 'APPROVED',
          extraDiscountAmount: discount,
          totalAmount: total,
          approvedBy: currentUser.name.split(' (')[0],
          approvalNote: approvalNote || 'Approved by Admin for FEFO Warehouse Dispatch',
        };
      })
    );
  };

  const rejectOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'REJECTED',
              approvedBy: currentUser.name.split(' (')[0],
              approvalNote: reason || 'Rejected due to overdue credit limit',
            }
          : o
      )
    );
  };

  const packAndDispatchOrder = (
    orderId: string,
    nextStatus: 'PACKED' | 'DISPATCHED' | 'DELIVERED'
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // When marking PACKED (if not already allocated), allocate FEFO batches and deduct stock on DISPATCHED/DELIVERED
    if (nextStatus === 'PACKED') {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.map((item) => {
            const fefo = getFefoBatchesForProduct(item.productId)[0];
            return {
              ...item,
              allocatedBatchId: fefo?.id || item.allocatedBatchId,
              allocatedBatchNumber: fefo?.batchNumber || item.allocatedBatchNumber || 'FEFO-STD',
              allocatedBatchExpiry: fefo?.expiryDate || item.allocatedBatchExpiry || '2027-12-31',
            };
          });
          return { ...o, status: 'PACKED', items: updatedItems };
        })
      );
      return;
    }

    if (nextStatus === 'DISPATCHED') {
      // Deduct stock from allocated FEFO batches
      setBatches((prevBatches) =>
        prevBatches.map((batch) => {
          const matchedItem = targetOrder.items.find((i) => i.allocatedBatchId === batch.id);
          if (!matchedItem) return batch;
          return {
            ...batch,
            quantityOnHand: Math.max(0, batch.quantityOnHand - matchedItem.quantity),
          };
        })
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'DISPATCHED', dispatchedAt: new Date().toISOString() }
            : o
        )
      );
      return;
    }

    if (nextStatus === 'DELIVERED' && targetOrder.status !== 'DELIVERED') {
      // Debit Customer Khata (Ledger) and update Customer Balance
      const customer = customers.find((c) => c.id === targetOrder.customerId);
      const newBalance = (customer?.currentBalance || 0) + targetOrder.totalAmount;

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === targetOrder.customerId ? { ...c, currentBalance: newBalance } : c
        )
      );

      const newLedgerEntry: LedgerEntry = {
        id: `led-${Date.now()}`,
        customerId: targetOrder.customerId,
        customerName: targetOrder.customerName,
        type: 'INVOICE_DEBIT',
        amount: targetOrder.totalAmount,
        runningBalance: newBalance,
        referenceNo: targetOrder.orderNumber,
        note: `Invoice #${targetOrder.orderNumber} delivered (${targetOrder.items.length} items)`,
        status: 'VERIFIED',
        recordedById: currentUser.id,
        recordedByName: currentUser.name.split(' (')[0],
        createdAt: new Date().toISOString(),
      };

      setLedger((prev) => [newLedgerEntry, ...prev]);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'DELIVERED', deliveredAt: new Date().toISOString() }
            : o
        )
      );
    }
  };

  const upsertCustomerPrice = (customerId: string, productId: string, customPrice: number) => {
    setCustomerPrices((prev) => {
      const existing = prev.find(
        (cp) => cp.customerId === customerId && cp.productId === productId
      );
      if (existing) {
        return prev.map((cp) => (cp.id === existing.id ? { ...cp, customPrice } : cp));
      }
      return [
        ...prev,
        {
          id: `cp-${Date.now()}`,
          customerId,
          productId,
          customPrice,
        },
      ];
    });
  };

  const addProductBatch = (batchInput: Omit<ProductBatch, 'id'>) => {
    setBatches((prev) => [
      {
        ...batchInput,
        id: `batch-${Date.now()}`,
      },
      ...prev,
    ]);
  };

  const addProduct = (productInput: Omit<Product, 'id'>) => {
    setProducts((prev) => [
      {
        ...productInput,
        id: `prod-${Date.now()}`,
      },
      ...prev,
    ]);
  };

  const addCustomer = (customerInput: Omit<Customer, 'id' | 'isActive'>) => {
    const newCust: Customer = {
      ...customerInput,
      id: `cust-${Date.now()}`,
      isActive: true,
    };
    setCustomers((prev) => [newCust, ...prev]);
  };

  const recordRecoveryPayment = (input: {
    customerId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNo: string;
    note?: string;
  }) => {
    const customer = customers.find((c) => c.id === input.customerId);
    if (!customer) return;

    const isAdminRecording = currentUser.role === 'ADMIN';
    const nextBalance = Math.max(0, customer.currentBalance - input.amount);

    if (isAdminRecording) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, currentBalance: nextBalance } : c))
      );
    }

    const entry: LedgerEntry = {
      id: `led-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.labName,
      type: 'PAYMENT_CREDIT',
      amount: input.amount,
      runningBalance: nextBalance,
      paymentMethod: input.paymentMethod,
      referenceNo: input.referenceNo,
      note:
        input.note ||
        (isAdminRecording
          ? 'Direct recovery verified by Admin'
          : 'Collected in field by Salesperson (Pending Manager Verification)'),
      status: isAdminRecording ? 'VERIFIED' : 'PENDING_VERIFICATION',
      recordedById: currentUser.id,
      recordedByName: currentUser.name.split(' (')[0],
      createdAt: new Date().toISOString(),
    };

    setLedger((prev) => [entry, ...prev]);
  };

  const verifyRecoveryPayment = (ledgerId: string, approve: boolean) => {
    const target = ledger.find((l) => l.id === ledgerId);
    if (!target || target.status !== 'PENDING_VERIFICATION') return;

    if (approve) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === target.customerId
            ? { ...c, currentBalance: Math.max(0, c.currentBalance - target.amount) }
            : c
        )
      );
    }

    setLedger((prev) =>
      prev.map((l) =>
        l.id === ledgerId
          ? { ...l, status: approve ? 'VERIFIED' : 'REJECTED' }
          : l
      )
    );
  };

  const updateApprovalPolicy = (patch: Partial<ApprovalPolicy>) => {
    setApprovalPolicy((prev) => ({ ...prev, ...patch }));
  };

  const offlinePendingCount = useMemo(
    () => orders.filter((o) => o.isOfflineQueued).length,
    [orders]
  );

  return (
    <LabPathContext.Provider
      value={{
        currentUser,
        users,
        switchRole,
        isOfflineMode,
        toggleOfflineMode: () => setIsOfflineMode((v) => !v),
        offlinePendingCount,
        syncOfflineQueue,
        activeDbProvider,
        setActiveDbProvider,
        approvalPolicy,
        updateApprovalPolicy,
        customers,
        products,
        batches,
        customerPrices,
        orders,
        ledger,
        getEffectivePrice,
        getProductTotalStock,
        getFefoBatchesForProduct,
        getDaysUntilExpiry,
        createOrder,
        approveOrder,
        rejectOrder,
        packAndDispatchOrder,
        upsertCustomerPrice,
        addProductBatch,
        addProduct,
        addCustomer,
        recordRecoveryPayment,
        verifyRecoveryPayment,
      }}
    >
      {children}
    </LabPathContext.Provider>
  );
}

export function useLabPath() {
  const ctx = useContext(LabPathContext);
  if (!ctx) throw new Error('useLabPath must be used inside LabPathProvider');
  return ctx;
}
