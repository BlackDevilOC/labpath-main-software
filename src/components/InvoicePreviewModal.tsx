import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Order } from '../types/labpath';
import {
  formatPKR,
  generateOrderDocumentHtml,
  numberToWordsPKR,
} from '../utils/invoiceHtml';

interface Props {
  visible: boolean;
  order: Order | null;
  initialMode?: 'INVOICE' | 'CHALLAN';
  onClose: () => void;
}

export function InvoicePreviewModal({
  visible,
  order,
  initialMode = 'INVOICE',
  onClose,
}: Props) {
  const [mode, setMode] = useState<'INVOICE' | 'CHALLAN'>(initialMode);
  const [prevResetKey, setPrevResetKey] = useState(
    `${order?.id ?? ''}-${initialMode}`
  );
  const [copiedBanner, setCopiedBanner] = useState(false);

  const currentResetKey = `${order?.id ?? ''}-${initialMode}`;
  if (currentResetKey !== prevResetKey) {
    setPrevResetKey(currentResetKey);
    setMode(initialMode);
  }

  if (!order) return null;

  const isChallan = mode === 'CHALLAN';
  const totalUnits = order.items.reduce(
    (s, i) => s + i.quantity + (i.bonusQty || 0),
    0
  );

  const handlePrintOrExport = () => {
    const html = generateOrderDocumentHtml(order, mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank', 'width=940,height=760');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
        return;
      }
    }
    Alert.alert(
      isChallan ? 'Delivery Challan' : 'Commercial Invoice',
      `Document ${order.orderNumber} ready for printing.`
    );
  };

  const handleShareWhatsAppText = () => {
    const lines = [
      `*LABPATH DIAGNOSTICS & SUPPLIES - SUKKUR*`,
      `*${isChallan ? 'DELIVERY CHALLAN' : 'COMMERCIAL INVOICE'}: ${order.orderNumber}*`,
      `M/S: ${order.buyerName} (${order.buyerArea})`,
      `Contact: ${order.buyerContact} (${order.buyerPhone})`,
      `Terms: ${order.paymentTerms.replace('_', ' ')}`,
      `--------------------------------`,
      ...order.items.map(
        (item, idx) =>
          `${idx + 1}. ${item.productName} (${item.packSizeInfo})\n   Qty: ${item.quantity} ${item.unit}${
            item.bonusQty ? ` + ${item.bonusQty} Bonus` : ''
          } | Batch: ${item.allocatedBatchNumber || 'FEFO'} (Exp: ${
            item.allocatedBatchExpiry || 'OK'
          })${!isChallan ? ` = ${formatPKR(item.lineTotal)}` : ''}`
      ),
      `--------------------------------`,
    ];

    if (!isChallan) {
      if (order.extraDiscountAmount > 0) {
        lines.push(`Gross: ${formatPKR(order.subtotalAmount)}`);
        lines.push(`Discount: -${formatPKR(order.extraDiscountAmount)}`);
      }
      lines.push(`*Net Payable: ${formatPKR(order.totalAmount)}*`);
      lines.push(`_(${numberToWordsPKR(order.totalAmount)})_`);
    } else {
      lines.push(`*Total Packed Units:* ${totalUnits}`);
    }

    const message = lines.join('\n');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopiedBanner(true);
      setTimeout(() => setCopiedBanner(false), 2500);
    } else {
      Alert.alert('WhatsApp Bill Summary', message);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topBar}>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                onPress={() => setMode('INVOICE')}
                style={[styles.modeTab, mode === 'INVOICE' ? styles.modeTabActive : null]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    mode === 'INVOICE' ? styles.modeTabTextActive : null,
                  ]}
                >
                  Local Commercial Invoice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode('CHALLAN')}
                style={[styles.modeTab, mode === 'CHALLAN' ? styles.modeTabActive : null]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    mode === 'CHALLAN' ? styles.modeTabTextActive : null,
                  ]}
                >
                  Delivery Challan (Gate Pass)
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

          {copiedBanner ? (
            <View style={styles.copiedToast}>
              <Text style={styles.copiedToastText}>
                Copied formatted bill summary to clipboard for WhatsApp
              </Text>
            </View>
          ) : null}

          <ScrollView style={styles.docBody}>
            <View style={styles.docPaper}>
              <View style={styles.docHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>LABPATH DIAGNOSTICS & SUPPLIES</Text>
                  <Text style={styles.companyTag}>
                    Importers & Distributors: Biochemistry Reagents, Tubes, Lab Chemicals & Instruments
                  </Text>
                  <Text style={styles.companySub}>
                    Office #04, Al-Shifa Medical Plaza, Hospital Road, Sukkur | Tel: 071-5612233 | WhatsApp: 0300-7151122
                  </Text>
                </View>
                <View style={styles.docBox}>
                  <Text style={styles.docTypeLabel}>
                    {isChallan ? 'DELIVERY CHALLAN' : 'COMMERCIAL INVOICE'}
                  </Text>
                  <Text style={styles.docMetaText}>{`No: ${order.orderNumber}`}</Text>
                  <Text style={styles.docMetaText}>
                    {`Date: ${order.createdAt.slice(0, 10)}`}
                  </Text>
                  <Text style={styles.docMetaText}>
                    {`Terms: ${order.paymentTerms.replace('_', ' ')}`}
                  </Text>
                </View>
              </View>

              <View style={styles.partyGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partyLabel}>M/S (BUYER / LAB / CLINIC):</Text>
                  <Text style={styles.partyName}>{order.buyerName}</Text>
                  <Text style={styles.partySub}>{`Address: ${order.buyerArea}`}</Text>
                  <Text style={styles.partySub}>
                    {`Contact: ${order.buyerContact} (${order.buyerPhone})`}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.partyLabel}>DISPATCH & ORDER INFO:</Text>
                  <Text style={styles.partySub}>
                    {`Booked By: ${order.salespersonName}`}
                  </Text>
                  <Text style={styles.partySub}>
                    {`Approved By: ${order.approvedBy || 'Manager LabPath'}`}
                  </Text>
                  <Text style={styles.partySub}>
                    {`Dispatched By: ${order.dispatchedBy || 'Main Cold Store'}`}
                  </Text>
                  <Text style={styles.partySub}>{`Order Status: ${order.status}`}</Text>
                </View>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 28 }]}>S#</Text>
                <Text style={[styles.th, { flex: 2.2 }]}>Item Description & Brand</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Pack</Text>
                <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>
                  Batch & Exp
                </Text>
                <Text style={[styles.th, { width: 55, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.th, { width: 45, textAlign: 'center' }]}>Bon</Text>
                {!isChallan ? (
                  <>
                    <Text style={[styles.th, { width: 75, textAlign: 'right' }]}>Rate</Text>
                    <Text style={[styles.th, { width: 90, textAlign: 'right' }]}>
                      Amount
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>Check</Text>
                )}
              </View>

              {order.items.map((item, idx) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 28, fontWeight: '600' }]}>
                    {String(idx + 1)}
                  </Text>
                  <View style={{ flex: 2.2 }}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemSub}>
                      {`${item.brand} • SKU: ${item.sku}`}
                    </Text>
                  </View>
                  <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>
                    {item.packSizeInfo}
                  </Text>
                  <View style={{ flex: 1.2, alignItems: 'center' }}>
                    <Text style={styles.batchText}>
                      {item.allocatedBatchNumber || 'FEFO'}
                    </Text>
                    <Text style={styles.expText}>
                      {item.allocatedBatchExpiry || 'Verified'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.td,
                      { width: 55, textAlign: 'center', fontWeight: '700' },
                    ]}
                  >
                    {`${item.quantity} ${item.unit}`}
                  </Text>
                  <Text style={[styles.td, { width: 45, textAlign: 'center' }]}>
                    {item.bonusQty ? String(item.bonusQty) : '-'}
                  </Text>
                  {!isChallan ? (
                    <>
                      <Text style={[styles.td, { width: 75, textAlign: 'right' }]}>
                        {Math.round(item.unitPrice).toLocaleString('en-PK')}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          { width: 90, textAlign: 'right', fontWeight: '700' },
                        ]}
                      >
                        {Math.round(item.lineTotal).toLocaleString('en-PK')}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        styles.td,
                        {
                          width: 90,
                          textAlign: 'center',
                          color: '#15803d',
                          fontWeight: '700',
                        },
                      ]}
                    >
                      Verified
                    </Text>
                  )}
                </View>
              ))}

              <View style={styles.bottomSection}>
                <View style={{ flex: 1.3, gap: 6 }}>
                  {!isChallan ? (
                    <View style={styles.wordsBox}>
                      <Text style={styles.wordsText}>
                        {`Amount in Words: ${numberToWordsPKR(order.totalAmount)}`}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.termsTitle}>Local Supply & Cold-Chain Terms:</Text>
                  <Text style={styles.termsText}>
                    1. Please verify batch numbers, intact seals, and quantities upon delivery.
                  </Text>
                  <Text style={styles.termsText}>
                    2. Cold-chain Biochemistry Reagents (2°C–8°C) must be placed in lab refrigerator immediately.
                  </Text>
                </View>

                {!isChallan ? (
                  <View style={styles.totalsBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Gross Total:</Text>
                      <Text style={styles.summaryVal}>
                        {formatPKR(order.subtotalAmount)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount:</Text>
                      <Text style={styles.summaryVal}>
                        {`- ${formatPKR(order.extraDiscountAmount)}`}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryRowNet]}>
                      <Text style={styles.summaryNetLabel}>NET PAYABLE:</Text>
                      <Text style={styles.summaryNetVal}>
                        {formatPKR(order.totalAmount)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.totalsBox}>
                    <View style={[styles.summaryRow, styles.summaryRowNet]}>
                      <Text style={styles.summaryNetLabel}>TOTAL PACKED:</Text>
                      <Text style={styles.summaryNetVal}>{`${totalUnits} Units`}</Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.sigRow}>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigText}>Prepared / Billed By</Text>
                </View>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigText}>Store / Cold-Chain Dispatch</Text>
                </View>
                <View style={styles.sigBlock}>
                  <Text style={styles.sigText}>Receiver Sign & Lab Stamp</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footerBar}>
            <TouchableOpacity onPress={handleShareWhatsAppText} style={styles.whatsappBtn}>
              <Text style={styles.whatsappBtnText}>Copy for WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrintOrExport} style={styles.printBtn}>
              <Text style={styles.printBtnText}>
                {`Print ${isChallan ? 'Challan' : 'Invoice'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 3,
    borderRadius: 8,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
  },
  modeTabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  copiedToast: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copiedToastText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  docBody: {
    padding: 16,
  },
  docPaper: {
    borderWidth: 1.5,
    borderColor: '#0f172a',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  companyTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  companySub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  docBox: {
    borderWidth: 1.5,
    borderColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 170,
  },
  docTypeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4,
    marginBottom: 4,
  },
  docMetaText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  partyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
    flexWrap: 'wrap',
    gap: 12,
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  partySub: {
    fontSize: 11,
    color: '#334155',
    marginTop: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cbd5e1',
  },
  td: {
    fontSize: 11,
    color: '#0f172a',
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSub: {
    fontSize: 10,
    color: '#64748b',
  },
  batchText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
  },
  expText: {
    fontSize: 10,
    color: '#0f766e',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 6,
  },
  wordsBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  wordsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  termsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  termsText: {
    fontSize: 10,
    color: '#475569',
  },
  totalsBox: {
    minWidth: 230,
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  summaryRowNet: {
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryNetLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryNetVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 10,
    gap: 16,
  },
  sigBlock: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingTop: 6,
    alignItems: 'center',
  },
  sigText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  footerBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  whatsappBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  whatsappBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  printBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
