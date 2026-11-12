import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { EditableOrderLine, useLabPath } from '../context/LabPathContext';
import { Order } from '../types/labpath';
import { formatPKR } from '../utils/invoiceHtml';

export function OrderApprovalsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const {
    orders,
    products,
    getProductTotalStock,
    updateOrderFromAdmin,
    rejectOrder,
  } = useLabPath();

  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL');

  // Master-Detail Page state: null = Compact Box Grid, string = Opened Order Page
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [draftLines, setDraftLines] = useState<Record<string, EditableOrderLine[]>>({});
  const [draftDiscount, setDraftDiscount] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [showAddProductPicker, setShowAddProductPicker] = useState<boolean>(false);

  const selectedOrder = pendingOrders.find((o) => o.id === selectedOrderId) || null;

  const getLinesForOrder = (order: Order): EditableOrderLine[] => {
    if (draftLines[order.id]) return draftLines[order.id];
    return order.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      bonusQty: i.bonusQty || 0,
      unitPrice: i.unitPrice,
    }));
  };

  const openOrderDetailPage = (order: Order) => {
    if (!draftLines[order.id]) {
      setDraftLines((prev) => ({
        ...prev,
        [order.id]: order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          bonusQty: i.bonusQty || 0,
          unitPrice: i.unitPrice,
        })),
      }));
      setDraftDiscount((prev) => ({
        ...prev,
        [order.id]: String(order.extraDiscountAmount),
      }));
      setDraftNote((prev) => ({
        ...prev,
        [order.id]: order.adminAdjustmentNote || '',
      }));
    }
    setShowAddProductPicker(false);
    setSelectedOrderId(order.id);
  };

  const updateLineField = (
    order: Order,
    productId: string,
    field: 'quantity' | 'bonusQty' | 'unitPrice',
    value: number
  ) => {
    const current = getLinesForOrder(order);
    const updated = current
      .map((l) =>
        l.productId === productId ? { ...l, [field]: Math.max(0, value) } : l
      )
      .filter((l) => l.quantity > 0);
    setDraftLines((prev) => ({ ...prev, [order.id]: updated }));
  };

  const removeLineFromOrder = (order: Order, productId: string) => {
    const current = getLinesForOrder(order);
    setDraftLines((prev) => ({
      ...prev,
      [order.id]: current.filter((l) => l.productId !== productId),
    }));
  };

  const addProductToOrder = (order: Order, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const current = getLinesForOrder(order);
    const exists = current.find((l) => l.productId === productId);
    if (exists) {
      updateLineField(order, productId, 'quantity', exists.quantity + 1);
    } else {
      setDraftLines((prev) => ({
        ...prev,
        [order.id]: [
          ...current,
          {
            productId: prod.id,
            quantity: 1,
            bonusQty: 0,
            unitPrice: prod.basePrice,
          },
        ],
      }));
    }
    setShowAddProductPicker(false);
  };

  const handleSaveAndApprove = (order: Order, approveNow: boolean) => {
    const lines = getLinesForOrder(order);
    const discount = Number(draftDiscount[order.id] ?? order.extraDiscountAmount) || 0;
    const note =
      draftNote[order.id] ??
      order.adminAdjustmentNote ??
      'Quantities & stock verified by Admin';
    updateOrderFromAdmin(order.id, lines, discount, note, approveNow);
    if (approveNow) {
      setSelectedOrderId(null);
    }
  };

  // DETAIL PAGE: Opened Single Order Review & Stock Adjustment
  if (selectedOrder) {
    const lines = getLinesForOrder(selectedOrder);
    const discountVal =
      Number(draftDiscount[selectedOrder.id] ?? selectedOrder.extraDiscountAmount) ||
      0;
    const grossTotal = lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice,
      0
    );
    const netTotal = Math.max(0, grossTotal - discountVal);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          <TouchableOpacity
            onPress={() => setSelectedOrderId(null)}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to Pending Orders</Text>
          </TouchableOpacity>

          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailOrderNo}>{selectedOrder.orderNumber}</Text>
                <Text style={styles.detailBuyer}>{selectedOrder.buyerName}</Text>
                <Text style={styles.detailMeta}>
                  {`${selectedOrder.buyerArea} • Contact: ${selectedOrder.buyerContact} (${selectedOrder.buyerPhone})`}
                </Text>
                <Text style={styles.detailMeta}>
                  {`Sales Rep: ${selectedOrder.salespersonName} • Terms: ${selectedOrder.paymentTerms.replace(
                    '_',
                    ' '
                  )}`}
                </Text>
                {selectedOrder.orderNote ? (
                  <Text style={styles.salesNote}>
                    {`Note: "${selectedOrder.orderNote}"`}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.netLabelSmall}>Adjusted Total</Text>
                <Text style={styles.detailTotalBig}>{formatPKR(netTotal)}</Text>
              </View>
            </View>

            <Text style={styles.sectionSubTitle}>
              Adjust Quantities, Bonus, or Rates to Match Available Stock:
            </Text>

            {lines.map((line) => {
              const prod = products.find((p) => p.id === line.productId);
              if (!prod) return null;
              const availableStock = getProductTotalStock(prod.id);
              const exceedsStock = line.quantity + line.bonusQty > availableStock;

              return (
                <View
                  key={line.productId}
                  style={[
                    styles.itemEditBox,
                    exceedsStock ? styles.itemEditBoxWarn : null,
                  ]}
                >
                  <View style={styles.itemEditTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{prod.name}</Text>
                      <Text style={styles.itemStock}>
                        {`Available Stock: ${availableStock} ${prod.unit} • Pack: ${prod.packSizeInfo}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeLineFromOrder(selectedOrder, prod.id)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  {exceedsStock ? (
                    <View style={styles.shortageBar}>
                      <Text style={styles.shortageText}>
                        {`Shortage: Only ${availableStock} in stock`}
                      </Text>
                      {availableStock > 0 ? (
                        <TouchableOpacity
                          onPress={() =>
                            updateLineField(
                              selectedOrder,
                              prod.id,
                              'quantity',
                              availableStock
                            )
                          }
                          style={styles.matchBtn}
                        >
                          <Text style={styles.matchBtnText}>
                            {`Set Qty to ${availableStock}`}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.controlsRow}>
                    <View style={styles.controlCol}>
                      <Text style={styles.ctrlLabel}>Quantity</Text>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          onPress={() =>
                            updateLineField(
                              selectedOrder,
                              prod.id,
                              'quantity',
                              line.quantity - 1
                            )
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          value={String(line.quantity)}
                          onChangeText={(v) =>
                            updateLineField(
                              selectedOrder,
                              prod.id,
                              'quantity',
                              Number(v) || 0
                            )
                          }
                          keyboardType="numeric"
                          style={styles.qtyInput}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            updateLineField(
                              selectedOrder,
                              prod.id,
                              'quantity',
                              line.quantity + 1
                            )
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.controlCol}>
                      <Text style={styles.ctrlLabel}>Bonus</Text>
                      <TextInput
                        value={String(line.bonusQty)}
                        onChangeText={(v) =>
                          updateLineField(
                            selectedOrder,
                            prod.id,
                            'bonusQty',
                            Number(v) || 0
                          )
                        }
                        keyboardType="numeric"
                        style={[styles.smallInput, { width: 52 }]}
                      />
                    </View>

                    <View style={styles.controlCol}>
                      <Text style={styles.ctrlLabel}>Rate (Rs)</Text>
                      <TextInput
                        value={String(line.unitPrice)}
                        onChangeText={(v) =>
                          updateLineField(
                            selectedOrder,
                            prod.id,
                            'unitPrice',
                            Number(v) || 0
                          )
                        }
                        keyboardType="numeric"
                        style={[styles.smallInput, { width: 80 }]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              onPress={() => setShowAddProductPicker((v) => !v)}
              style={styles.addSubBtn}
            >
              <Text style={styles.addSubBtnText}>
                + Add / Substitute Item from Stock
              </Text>
            </TouchableOpacity>

            {showAddProductPicker ? (
              <View style={styles.pickerBox}>
                {products.map((p) => {
                  const stk = getProductTotalStock(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => addProductToOrder(selectedOrder, p.id)}
                      style={styles.pickerRow}
                    >
                      <Text style={styles.pickerName}>{p.name}</Text>
                      <Text style={styles.pickerStock}>
                        {`Stock: ${stk} • ${formatPKR(p.basePrice)}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.metaInputsRow}>
              <View style={{ width: 130 }}>
                <Text style={styles.ctrlLabel}>Discount (Rs)</Text>
                <TextInput
                  value={
                    draftDiscount[selectedOrder.id] ??
                    String(selectedOrder.extraDiscountAmount)
                  }
                  onChangeText={(v) =>
                    setDraftDiscount((prev) => ({
                      ...prev,
                      [selectedOrder.id]: v,
                    }))
                  }
                  keyboardType="numeric"
                  style={styles.smallInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctrlLabel}>Admin Note for Warehouse</Text>
                <TextInput
                  value={draftNote[selectedOrder.id] ?? ''}
                  onChangeText={(v) =>
                    setDraftNote((prev) => ({ ...prev, [selectedOrder.id]: v }))
                  }
                  placeholder="Optional packing instruction..."
                  placeholderTextColor="#94a3b8"
                  style={styles.smallInput}
                />
              </View>
            </View>

            <View style={styles.actionFooter}>
              <TouchableOpacity
                onPress={() => {
                  rejectOrder(selectedOrder.id, 'Rejected by Admin');
                  setSelectedOrderId(null);
                }}
                style={styles.rejectBtn}
              >
                <Text style={styles.rejectBtnText}>Reject Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSaveAndApprove(selectedOrder, true)}
                style={styles.approveBtn}
              >
                <Text style={styles.approveBtnText}>
                  Save & Approve for Packing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // MASTER PAGE: Compact Box Grid of Pending Orders
  const boxWidthStyle = isDesktop
    ? { width: '31.8%' as const }
    : isTablet
    ? { width: '48.2%' as const }
    : { width: '100%' as const };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWrap}>
        <Text style={styles.pageSub}>
          {`${pendingOrders.length} pending order(s) — Tap any box to inspect items, adjust stock, and approve`}
        </Text>

        {pendingOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptySub}>
              All incoming field orders have been reviewed.
            </Text>
          </View>
        ) : (
          <View style={styles.boxGrid}>
            {pendingOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => openOrderDetailPage(order)}
                style={[styles.orderBox, boxWidthStyle]}
              >
                <View style={styles.boxTop}>
                  <Text style={styles.boxOrderNo}>{order.orderNumber}</Text>
                  <View style={styles.pendingPill}>
                    <Text style={styles.pendingPillText}>Needs Approval</Text>
                  </View>
                </View>

                <Text style={styles.boxBuyerName} numberOfLines={1}>
                  {order.buyerName}
                </Text>
                <Text style={styles.boxAreaText} numberOfLines={1}>
                  {`${order.buyerArea} • Rep: ${order.salespersonName}`}
                </Text>

                <View style={styles.boxBottom}>
                  <View>
                    <Text style={styles.boxItemCount}>
                      {`${order.items.length} item(s) • ${order.paymentTerms.replace(
                        '_',
                        ' '
                      )}`}
                    </Text>
                    <Text style={styles.boxTotal}>
                      {formatPKR(order.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.openBtn}>
                    <Text style={styles.openBtnText}>Review →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 14,
    paddingBottom: 48,
  },
  maxWrap: {
    maxWidth: 1050,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  pageSub: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orderBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  boxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxOrderNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  pendingPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  boxBuyerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  boxAreaText: {
    fontSize: 12,
    color: '#64748b',
  },
  boxBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  boxItemCount: {
    fontSize: 11,
    color: '#64748b',
  },
  boxTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  openBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 12,
  },
  detailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  detailOrderNo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
  },
  detailBuyer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  detailMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  salesNote: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
    marginTop: 4,
  },
  netLabelSmall: {
    fontSize: 11,
    color: '#64748b',
  },
  detailTotalBig: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f766e',
  },
  sectionSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemEditBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  itemEditBoxWarn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  itemEditTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemStock: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  removeBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  shortageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shortageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  matchBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  matchBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
  },
  controlCol: {
    gap: 4,
  },
  ctrlLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: '#e2e8f0',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  qtyInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 46,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  smallInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  addSubBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addSubBtnText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '600',
  },
  pickerBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 6,
  },
  pickerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  pickerStock: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  metaInputsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  rejectBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
