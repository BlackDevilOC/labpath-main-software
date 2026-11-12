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
import { useLabPath } from '../context/LabPathContext';
import { Order, OrderStatus } from '../types/labpath';
import { formatPKR } from '../utils/invoiceHtml';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal';

export function InvoicesHistoryScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const { currentUser, orders } = useLabPath();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDocOrder, setSelectedDocOrder] = useState<{
    order: Order;
    mode: 'INVOICE' | 'CHALLAN';
  } | null>(null);

  // Salesperson only sees orders booked by themselves; Admin & Warehouse see all
  const roleScopedOrders = orders.filter((o) => {
    if (o.status === 'DRAFT') return false;
    if (currentUser?.role === 'SALES') {
      return o.salespersonId === currentUser.id;
    }
    return true;
  });

  const filtered = roleScopedOrders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      !search.trim() ||
      o.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerArea.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedOrder =
    roleScopedOrders.find((o) => o.id === selectedOrderId) || null;

  const getBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return { bg: '#f1f5f9', text: '#475569', label: 'Draft' };
      case 'PENDING_APPROVAL':
        return { bg: '#fef3c7', text: '#92400e', label: 'Pending' };
      case 'APPROVED':
        return { bg: '#e0f2fe', text: '#0369a1', label: 'Approved' };
      case 'PACKED':
        return { bg: '#ede9fe', text: '#6d28d9', label: 'Packed' };
      case 'DISPATCHED':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'Dispatched' };
      case 'DELIVERED':
        return { bg: '#dcfce7', text: '#15803d', label: 'Delivered' };
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' };
    }
  };

  // DETAIL PAGE: Opened Order & Invoice/Challan Actions
  if (selectedOrder) {
    const badge = getBadge(selectedOrder.status);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          <TouchableOpacity
            onPress={() => setSelectedOrderId(null)}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to Orders Grid</Text>
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
                  {`${selectedOrder.buyerArea} • Contact: ${selectedOrder.buyerContact} (${selectedOrder.buyerPhone})`}
                </Text>
                <Text style={styles.detailMeta}>
                  {`Date: ${selectedOrder.createdAt.slice(
                    0,
                    10
                  )} • Sales Rep: ${selectedOrder.salespersonName}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.totalLabel}>Net Total</Text>
                <Text style={styles.detailTotal}>
                  {formatPKR(selectedOrder.totalAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.itemsWrap}>
              {selectedOrder.items.map((item, idx) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>
                      {`${idx + 1}. ${item.productName}`}
                    </Text>
                    <Text style={styles.itemSub}>
                      {`${item.quantity} ${item.unit}${
                        item.bonusQty ? ` (+${item.bonusQty} Bonus)` : ''
                      } × ${formatPKR(item.unitPrice)} • Batch: ${
                        item.allocatedBatchNumber || 'FEFO'
                      }`}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatPKR(item.lineTotal)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={() =>
                  setSelectedDocOrder({
                    order: selectedOrder,
                    mode: 'CHALLAN',
                  })
                }
                style={styles.challanBtn}
              >
                <Text style={styles.challanBtnText}>
                  Open Delivery Challan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setSelectedDocOrder({
                    order: selectedOrder,
                    mode: 'INVOICE',
                  })
                }
                style={styles.invoiceBtn}
              >
                <Text style={styles.invoiceBtnText}>
                  Open Local Commercial Invoice
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <InvoicePreviewModal
          visible={Boolean(selectedDocOrder)}
          order={selectedDocOrder ? selectedDocOrder.order : null}
          initialMode={selectedDocOrder ? selectedDocOrder.mode : 'INVOICE'}
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
        <Text style={styles.scopeNotice}>
          {currentUser?.role === 'SALES'
            ? `Showing only orders booked by you (${currentUser.name}) — ${filtered.length} order(s)`
            : `Showing all company orders across all salespeople (${filtered.length} order(s))`}
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search order #, buyer, or area..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(
              [
                { key: 'ALL', label: 'All' },
                { key: 'PENDING_APPROVAL', label: 'Pending' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'PACKED', label: 'Packed' },
                { key: 'DISPATCHED', label: 'Dispatched' },
                { key: 'DELIVERED', label: 'Delivered' },
              ] as const
            ).map((f) => {
              const active = statusFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setStatusFilter(f.key)}
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

        <View style={styles.boxGrid}>
          {filtered.map((order) => {
            const badge = getBadge(order.status);
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
                  {`${order.buyerArea} • Rep: ${order.salespersonName}`}
                </Text>

                <View style={styles.boxBottom}>
                  <View>
                    <Text style={styles.boxItemsText}>
                      {`${order.items.length} item(s)`}
                    </Text>
                    <Text style={styles.boxTotal}>
                      {formatPKR(order.totalAmount)}
                    </Text>
                  </View>
                  <View style={styles.openBtn}>
                    <Text style={styles.openBtnText}>Details →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
  scopeNotice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
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
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  boxItemsText: {
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
    gap: 14,
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
  totalLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  detailTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f766e',
  },
  itemsWrap: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  challanBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  challanBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  invoiceBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  invoiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
