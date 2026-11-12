import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { Order } from '../types/labpath';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';

export function PackingDispatchScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const { orders, packAndDispatchOrder } = useLabPath();
  const [stageFilter, setStageFilter] = useState<
    'ALL' | 'APPROVED' | 'PACKED' | 'DISPATCHED'
  >('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDocOrder, setSelectedDocOrder] = useState<{
    order: Order;
    mode: 'INVOICE' | 'CHALLAN';
  } | null>(null);

  const dispatchOrders = orders.filter((o) => {
    if (stageFilter === 'ALL') {
      return (
        o.status === 'APPROVED' ||
        o.status === 'PACKED' ||
        o.status === 'DISPATCHED'
      );
    }
    return o.status === stageFilter;
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const getStageBadge = (status: Order['status']) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#e0f2fe', text: '#0369a1', label: '1. To Pack' };
      case 'PACKED':
        return { bg: '#ede9fe', text: '#6d28d9', label: '2. Packed' };
      case 'DISPATCHED':
        return { bg: '#dbeafe', text: '#1d4ed8', label: '3. Dispatched' };
      default:
        return { bg: '#dcfce7', text: '#15803d', label: status };
    }
  };

  // DETAIL PAGE: Single Order Packing & Dispatch Sheet
  if (selectedOrder) {
    const badge = getStageBadge(selectedOrder.status);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          <TouchableOpacity
            onPress={() => setSelectedOrderId(null)}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to Dispatch Queue</Text>
          </TouchableOpacity>

          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.orderNo}>{selectedOrder.orderNumber}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailBuyer}>{selectedOrder.buyerName}</Text>
                <Text style={styles.detailMeta}>
                  {`Address: ${selectedOrder.buyerArea} • Contact: ${selectedOrder.buyerContact} (${selectedOrder.buyerPhone})`}
                </Text>
                {selectedOrder.adminAdjustmentNote ? (
                  <Text style={styles.adminNote}>
                    {`Instruction: ${selectedOrder.adminAdjustmentNote}`}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionSubTitle}>
              Items & FEFO Batch Allocation:
            </Text>

            {selectedOrder.items.map((item, idx) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>
                    {`${idx + 1}. ${item.productName}`}
                  </Text>
                  <Text style={styles.itemSub}>
                    {`Pack: ${item.packSizeInfo} • Pick Batch: ${
                      item.allocatedBatchNumber || 'FEFO-Auto'
                    } (Exp: ${item.allocatedBatchExpiry || 'Verified'})`}
                  </Text>
                </View>
                <Text style={styles.itemQty}>
                  {`${item.quantity} ${item.unit}${
                    item.bonusQty ? ` + ${item.bonusQty} Bonus` : ''
                  }`}
                </Text>
              </View>
            ))}

            <View style={styles.footerRow}>
              <View style={styles.docBtns}>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedDocOrder({
                      order: selectedOrder,
                      mode: 'CHALLAN',
                    })
                  }
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Delivery Challan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedDocOrder({
                      order: selectedOrder,
                      mode: 'INVOICE',
                    })
                  }
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Invoice</Text>
                </TouchableOpacity>
              </View>

              <View>
                {selectedOrder.status === 'APPROVED' ? (
                  <TouchableOpacity
                    onPress={() =>
                      packAndDispatchOrder(selectedOrder.id, 'PACKED')
                    }
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>
                      1. Confirm Packed (Assign FEFO)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {selectedOrder.status === 'PACKED' ? (
                  <TouchableOpacity
                    onPress={() =>
                      packAndDispatchOrder(selectedOrder.id, 'DISPATCHED')
                    }
                    style={[styles.primaryBtn, { backgroundColor: '#1d4ed8' }]}
                  >
                    <Text style={styles.primaryBtnText}>
                      2. Mark Dispatched (Deduct Stock)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {selectedOrder.status === 'DISPATCHED' ? (
                  <TouchableOpacity
                    onPress={() => {
                      packAndDispatchOrder(selectedOrder.id, 'DELIVERED');
                      setSelectedOrderId(null);
                    }}
                    style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                  >
                    <Text style={styles.primaryBtnText}>
                      3. Confirm Delivered
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <InvoicePreviewModal
          visible={Boolean(selectedDocOrder)}
          order={selectedDocOrder ? selectedDocOrder.order : null}
          initialMode={selectedDocOrder ? selectedDocOrder.mode : 'CHALLAN'}
          onClose={() => setSelectedDocOrder(null)}
        />
      </ScrollView>
    );
  }

  // MASTER PAGE: Compact Box Grid
  const boxWidthStyle = isDesktop
    ? { width: '31.8%' as const }
    : isTablet
    ? { width: '48.2%' as const }
    : { width: '100%' as const };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(
              [
                { key: 'ALL', label: 'All Active' },
                { key: 'APPROVED', label: '1. To Pack' },
                { key: 'PACKED', label: '2. Packed' },
                { key: 'DISPATCHED', label: '3. Out for Delivery' },
              ] as const
            ).map((f) => {
              const active = stageFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setStageFilter(f.key)}
                  style={[
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {dispatchOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Orders in Queue</Text>
            <Text style={styles.emptySub}>
              Approved orders will appear here for packing and dispatch.
            </Text>
          </View>
        ) : (
          <View style={styles.boxGrid}>
            {dispatchOrders.map((order) => {
              const badge = getStageBadge(order.status);
              const totalUnits = order.items.reduce(
                (s, i) => s + i.quantity + (i.bonusQty || 0),
                0
              );

              return (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => setSelectedOrderId(order.id)}
                  style={[styles.orderBox, boxWidthStyle]}
                >
                  <View style={styles.boxTop}>
                    <Text style={styles.orderNo}>{order.orderNumber}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.boxBuyerName} numberOfLines={1}>
                    {order.buyerName}
                  </Text>
                  <Text style={styles.boxAreaText} numberOfLines={1}>
                    {order.buyerArea}
                  </Text>

                  <View style={styles.boxBottom}>
                    <Text style={styles.boxUnits}>
                      {`${order.items.length} item(s) • ${totalUnits} units`}
                    </Text>
                    <View style={styles.openBtn}>
                      <Text style={styles.openBtnText}>Open →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
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
  orderNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  boxUnits: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  openBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailBuyer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  detailMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  adminNote: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '600',
    marginTop: 4,
  },
  sectionSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 11,
    color: '#0f766e',
    marginTop: 2,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    flexWrap: 'wrap',
    gap: 10,
  },
  docBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
