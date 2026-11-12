import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  AppRouteKey,
  AppUser,
  BuyerPreset,
  Order,
  OrderItem,
  PaymentTerms,
  Product,
  ProductBatch,
  ROLE_ALLOWED_ROUTES,
  UserRole,
} from '../types/labpath';
import {
  INITIAL_BATCHES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_USERS,
  RECENT_BUYER_PRESETS,
} from '../data/initialLabpathData';

export interface CreateOrderInput {
  draftOrderId?: string; // If updating an existing draft
  isDraft?: boolean; // True when saving as draft
  buyerName: string;
  buyerContact: string;
  buyerPhone: string;
  buyerArea: string;
  paymentTerms: PaymentTerms;
  items: {
    productId: string;
    quantity: number;
    bonusQty: number;
    unitPrice: number;
  }[];
  extraDiscountAmount: number;
  orderNote?: string;
}

export interface EditableOrderLine {
  productId: string;
  quantity: number;
  bonusQty: number;
  unitPrice: number;
}

interface LabPathContextValue {
  // Authentication & Role Access Control
  currentUser: AppUser | null;
  users: AppUser[];
  login: (usernameOrPhone: string, password: string) => { ok: boolean; error?: string };
  quickLoginByRole: (role: UserRole) => void;
  logout: () => void;
  canAccessRoute: (route: AppRouteKey) => boolean;

  // Offline Mode
  isOfflineMode: boolean;
  toggleOfflineMode: () => void;
  offlinePendingCount: number;
  syncOfflineQueue: () => number;

  // Data
  recentBuyers: BuyerPreset[];
  products: Product[];
  batches: ProductBatch[];
  orders: Order[];

  // Helpers
  getProductTotalStock: (productId: string) => number;
  getFefoBatchesForProduct: (productId: string) => ProductBatch[];
  getDaysUntilExpiry: (expiryDate: string) => number;

  // Order & Draft Actions
  createOrder: (input: CreateOrderInput) => Order;
  deleteDraftOrder: (orderId: string) => void;
  updateOrderFromAdmin: (
    orderId: string,
    updatedLines: EditableOrderLine[],
    extraDiscountAmount: number,
    adminAdjustmentNote: string,
    approveNow: boolean
  ) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  packAndDispatchOrder: (
    orderId: string,
    nextStatus: 'PACKED' | 'DISPATCHED' | 'DELIVERED'
  ) => void;

  // Inventory & Batch Actions
  addProductBatch: (batch: Omit<ProductBatch, 'id'>) => ProductBatch;
  updateBatchQuantity: (batchId: string, newQuantity: number) => void;
  addProduct: (
    product: Omit<Product, 'id'>,
    initialBatch?: Omit<ProductBatch, 'id' | 'productId'>
  ) => Product;
  updateProduct: (productId: string, patch: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (productId: string) => void;

  // Global Buyer & Staff Admin Actions
  addGlobalBuyer: (buyer: Omit<BuyerPreset, 'id'>) => BuyerPreset;
  deleteGlobalBuyer: (buyerId: string) => void;
  addStaffUser: (user: Omit<AppUser, 'id'>) => void;
  updateStaffRole: (userId: string, newRole: UserRole) => void;
  removeStaffUser: (userId: string) => void;
}

const LabPathContext = createContext<LabPathContextValue | undefined>(undefined);

export function LabPathProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  const [recentBuyers, setRecentBuyers] = useState<BuyerPreset[]>(RECENT_BUYER_PRESETS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [batches, setBatches] = useState<ProductBatch[]>(INITIAL_BATCHES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  const login = (usernameOrPhone: string, password: string) => {
    const clean = usernameOrPhone.trim().toLowerCase();
    const matched = users.find(
      (u) =>
        u.isActive !== false &&
        (u.username.toLowerCase() === clean || u.phone.toLowerCase() === clean) &&
        u.password === password.trim()
    );
    if (!matched) {
      return { ok: false, error: 'Invalid username/phone or password' };
    }
    setCurrentUser(matched);
    return { ok: true };
  };

  const quickLoginByRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role);
    if (found) setCurrentUser(found);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const canAccessRoute = (route: AppRouteKey): boolean => {
    if (!currentUser) return false;
    if (route === 'UNAUTHORIZED') return true;
    return ROLE_ALLOWED_ROUTES[currentUser.role].includes(route);
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
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const buildOrderItems = (lines: EditableOrderLine[]): OrderItem[] => {
    return lines
      .filter((l) => l.quantity > 0)
      .map((line, idx) => {
        const product = products.find((p) => p.id === line.productId)!;
        const primaryBatch = getFefoBatchesForProduct(line.productId)[0];
        return {
          id: `oi-${Date.now()}-${idx}`,
          productId: product.id,
          productName: product.name,
          brand: product.brand,
          packSizeInfo: product.packSizeInfo,
          sku: product.sku,
          unit: product.unit,
          quantity: line.quantity,
          bonusQty: line.bonusQty || 0,
          standardPrice: product.basePrice,
          unitPrice: line.unitPrice,
          lineTotal: line.quantity * line.unitPrice,
          allocatedBatchId: primaryBatch?.id,
          allocatedBatchNumber: primaryBatch?.batchNumber,
          allocatedBatchExpiry: primaryBatch?.expiryDate,
        };
      });
  };

  const addGlobalBuyer = (buyer: Omit<BuyerPreset, 'id'>): BuyerPreset => {
    const cleanName = buyer.buyerName.trim();
    const existing = recentBuyers.find(
      (b) => b.buyerName.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      const updated: BuyerPreset = {
        ...existing,
        buyerName: cleanName,
        contactPerson: buyer.contactPerson.trim() || existing.contactPerson,
        phone: buyer.phone.trim() || existing.phone,
        areaCity: buyer.areaCity.trim() || existing.areaCity,
      };
      setRecentBuyers((prev) =>
        prev.map((b) => (b.id === existing.id ? updated : b))
      );
      return updated;
    }
    const created: BuyerPreset = {
      id: `bp-${Date.now()}`,
      buyerName: cleanName,
      contactPerson: buyer.contactPerson.trim() || 'Incharge',
      phone: buyer.phone.trim(),
      areaCity: buyer.areaCity.trim() || 'Sukkur',
    };
    setRecentBuyers((prev) => [created, ...prev]);
    return created;
  };

  const deleteGlobalBuyer = (buyerId: string) => {
    setRecentBuyers((prev) => prev.filter((b) => b.id !== buyerId));
  };

  const createOrder = (input: CreateOrderInput): Order => {
    const orderItems = buildOrderItems(input.items);
    const subtotalAmount = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalAmount = Math.max(0, subtotalAmount - input.extraDiscountAmount);

    const cleanBuyer = input.buyerName.trim();
    if (cleanBuyer) {
      addGlobalBuyer({
        buyerName: cleanBuyer,
        contactPerson: input.buyerContact,
        phone: input.buyerPhone,
        areaCity: input.buyerArea,
      });
    }

    const nextStatus = input.isDraft ? 'DRAFT' : 'PENDING_APPROVAL';

    if (input.draftOrderId) {
      let updatedOrder: Order | null = null;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== input.draftOrderId) return o;
          updatedOrder = {
            ...o,
            buyerName: cleanBuyer || 'Draft Lab Buyer',
            buyerContact: input.buyerContact.trim() || 'Lab Manager',
            buyerPhone: input.buyerPhone.trim() || '-',
            buyerArea: input.buyerArea.trim() || 'Sukkur',
            paymentTerms: input.paymentTerms,
            status: nextStatus,
            items: orderItems,
            subtotalAmount,
            extraDiscountAmount: input.extraDiscountAmount,
            totalAmount,
            orderNote: input.orderNote,
            isOfflineQueued: isOfflineMode,
          };
          return updatedOrder;
        })
      );
      if (updatedOrder) return updatedOrder;
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `LP-2026-0${101 + orders.length + 1}`,
      buyerName: cleanBuyer || (input.isDraft ? 'Untitled Draft Order' : 'Walk-in Buyer'),
      buyerContact: input.buyerContact.trim() || 'Lab Manager',
      buyerPhone: input.buyerPhone.trim() || '-',
      buyerArea: input.buyerArea.trim() || 'Sukkur',
      paymentTerms: input.paymentTerms,
      salespersonId: currentUser?.id || 'u-sales-1',
      salespersonName: currentUser?.name || 'Sales Rep',
      status: nextStatus,
      items: orderItems,
      subtotalAmount,
      extraDiscountAmount: input.extraDiscountAmount,
      totalAmount,
      orderNote: input.orderNote,
      isOfflineQueued: isOfflineMode,
      clientSyncId: `sync-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const deleteDraftOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const updateOrderFromAdmin = (
    orderId: string,
    updatedLines: EditableOrderLine[],
    extraDiscountAmount: number,
    adminAdjustmentNote: string,
    approveNow: boolean
  ) => {
    const rebuiltItems = buildOrderItems(updatedLines);
    const subtotalAmount = rebuiltItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalAmount = Math.max(0, subtotalAmount - extraDiscountAmount);

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: rebuiltItems,
          subtotalAmount,
          extraDiscountAmount,
          totalAmount,
          adminAdjustmentNote:
            adminAdjustmentNote.trim() ||
            (approveNow ? 'Verified & approved by Admin' : o.adminAdjustmentNote),
          status: approveNow ? 'APPROVED' : o.status,
          approvedBy: approveNow ? currentUser?.name || 'Admin' : o.approvedBy,
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
              approvedBy: currentUser?.name || 'Admin',
              adminAdjustmentNote: reason || 'Rejected by Admin',
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

    if (nextStatus === 'PACKED') {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.map((item) => {
            const fefo = getFefoBatchesForProduct(item.productId)[0];
            return {
              ...item,
              allocatedBatchId: fefo?.id || item.allocatedBatchId,
              allocatedBatchNumber:
                fefo?.batchNumber || item.allocatedBatchNumber || 'FEFO-STD',
              allocatedBatchExpiry:
                fefo?.expiryDate || item.allocatedBatchExpiry || '2027-12-31',
            };
          });
          return {
            ...o,
            status: 'PACKED',
            items: updatedItems,
            dispatchedBy: currentUser?.name || 'Warehouse Staff',
          };
        })
      );
      return;
    }

    if (nextStatus === 'DISPATCHED') {
      setBatches((prevBatches) =>
        prevBatches.map((batch) => {
          const matchedItem = targetOrder.items.find(
            (i) => i.allocatedBatchId === batch.id
          );
          if (!matchedItem) return batch;
          const totalOut = matchedItem.quantity + (matchedItem.bonusQty || 0);
          return {
            ...batch,
            quantityOnHand: Math.max(0, batch.quantityOnHand - totalOut),
          };
        })
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: 'DISPATCHED',
                dispatchedBy:
                  currentUser?.name || o.dispatchedBy || 'Warehouse Staff',
                dispatchedAt: new Date().toISOString(),
              }
            : o
        )
      );
      return;
    }

    if (nextStatus === 'DELIVERED') {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'DELIVERED', deliveredAt: new Date().toISOString() }
            : o
        )
      );
    }
  };

  const syncOfflineQueue = (): number => {
    let count = 0;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.isOfflineQueued) {
          count++;
          return { ...o, isOfflineQueued: false };
        }
        return o;
      })
    );
    setIsOfflineMode(false);
    return count;
  };

  const addProductBatch = (batchInput: Omit<ProductBatch, 'id'>): ProductBatch => {
    const created: ProductBatch = {
      ...batchInput,
      id: `batch-${Date.now()}`,
    };
    setBatches((prev) => [created, ...prev]);
    return created;
  };

  const updateBatchQuantity = (batchId: string, newQuantity: number) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId ? { ...b, quantityOnHand: Math.max(0, newQuantity) } : b
      )
    );
  };

  const addProduct = (
    productInput: Omit<Product, 'id'>,
    initialBatch?: Omit<ProductBatch, 'id' | 'productId'>
  ): Product => {
    const newProd: Product = {
      ...productInput,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
    if (initialBatch && initialBatch.batchNumber.trim()) {
      addProductBatch({
        ...initialBatch,
        productId: newProd.id,
      });
    }
    return newProd;
  };

  const updateProduct = (
    productId: string,
    patch: Partial<Omit<Product, 'id'>>
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...patch } : p))
    );
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const addStaffUser = (userInput: Omit<AppUser, 'id'>) => {
    setUsers((prev) => [
      ...prev,
      {
        ...userInput,
        id: `u-${Date.now()}`,
        isActive: true,
      },
    ]);
  };

  const updateStaffRole = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setCurrentUser((prev) =>
      prev && prev.id === userId ? { ...prev, role: newRole } : prev
    );
  };

  const removeStaffUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
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
        login,
        quickLoginByRole,
        logout,
        canAccessRoute,
        isOfflineMode,
        toggleOfflineMode: () => setIsOfflineMode((v) => !v),
        offlinePendingCount,
        syncOfflineQueue,
        recentBuyers,
        products,
        batches,
        orders,
        getProductTotalStock,
        getFefoBatchesForProduct,
        getDaysUntilExpiry,
        createOrder,
        deleteDraftOrder,
        updateOrderFromAdmin,
        rejectOrder,
        packAndDispatchOrder,
        addProductBatch,
        updateBatchQuantity,
        addProduct,
        updateProduct,
        deleteProduct,
        addGlobalBuyer,
        deleteGlobalBuyer,
        addStaffUser,
        updateStaffRole,
        removeStaffUser,
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
