import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import {
  BarcodeLabelData,
  generateBarcodeBars,
  generateThermalBarcodePrintHtml,
} from '../utils/barcodeHtml';

interface Props {
  visible: boolean;
  labelData: BarcodeLabelData | null;
  onClose: () => void;
}

export function BarcodeModal({ visible, labelData, onClose }: Props) {
  const [copiesStr, setCopiesStr] = useState('5');
  const [layout, setLayout] = useState<'THERMAL_50X25' | 'SHEET_GRID'>(
    'THERMAL_50X25'
  );

  if (!labelData) return null;

  const barcodeCode = `${labelData.sku}-${labelData.batchNumber}`;
  const bars = generateBarcodeBars(barcodeCode);
  const copies = Math.max(1, Number(copiesStr) || 1);

  const handlePrint = () => {
    const html = generateThermalBarcodePrintHtml(labelData, copies, layout);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWin = window.open('', '_blank', 'width=720,height=640');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 250);
        return;
      }
    }
    Alert.alert(
      'Barcode Labels Ready',
      `Prepared ${copies} barcode sticker(s) for ${barcodeCode}.`
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.topBar}>
            <Text style={styles.title}>Print Barcode Sticker</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.subHint}>
              Clean black & white label compatible with all local thermal roll printers (Xprinter, TSC, Zebra)
            </Text>

            {/* Live Sticker Preview */}
            <View style={styles.stickerPreview}>
              <Text style={styles.stickerBrand}>LABPATH SUKKUR</Text>
              <Text style={styles.stickerItemName} numberOfLines={1}>
                {labelData.productName}
              </Text>

              {/* Visual Barcode Bars */}
              <View style={styles.barsContainer}>
                {bars.map((w, idx) => (
                  <View
                    key={idx}
                    style={{
                      flex: w,
                      height: 44,
                      backgroundColor: idx % 2 === 0 ? '#000000' : '#ffffff',
                    }}
                  />
                ))}
              </View>

              <Text style={styles.stickerCode}>{barcodeCode}</Text>

              <View style={styles.stickerMetaRow}>
                <Text style={styles.stickerMetaText}>
                  {`BATCH: ${labelData.batchNumber}`}
                </Text>
                <Text style={styles.stickerMetaText}>
                  {`EXP: ${labelData.expiryDate}`}
                </Text>
              </View>
            </View>

            {/* Printer Settings */}
            <View style={styles.settingsGroup}>
              <Text style={styles.label}>Printer Label Format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  onPress={() => setLayout('THERMAL_50X25')}
                  style={[
                    styles.formatBtn,
                    layout === 'THERMAL_50X25' ? styles.formatBtnActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.formatBtnText,
                      layout === 'THERMAL_50X25'
                        ? styles.formatBtnTextActive
                        : null,
                    ]}
                  >
                    Thermal Roll (50×25mm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLayout('SHEET_GRID')}
                  style={[
                    styles.formatBtn,
                    layout === 'SHEET_GRID' ? styles.formatBtnActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.formatBtnText,
                      layout === 'SHEET_GRID'
                        ? styles.formatBtnTextActive
                        : null,
                    ]}
                  >
                    A4 Sticker Sheet
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.label}>Number of Stickers to Print</Text>
              <View style={styles.copiesRow}>
                {['1', '5', '10', '25'].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => setCopiesStr(preset)}
                    style={[
                      styles.copyChip,
                      copiesStr === preset ? styles.copyChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.copyChipText,
                        copiesStr === preset ? styles.copyChipTextActive : null,
                      ]}
                    >
                      {`${preset}x`}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  value={copiesStr}
                  onChangeText={setCopiesStr}
                  keyboardType="numeric"
                  style={styles.copyInput}
                />
              </View>
            </View>

            <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
              <Text style={styles.printBtnText}>
                {`Print ${copies} Barcode Sticker(s)`}
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
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  body: {
    padding: 16,
    gap: 14,
  },
  subHint: {
    fontSize: 12,
    color: '#64748b',
  },
  stickerPreview: {
    alignSelf: 'center',
    width: 260,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 10,
    gap: 4,
  },
  stickerBrand: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    letterSpacing: 0.6,
  },
  stickerItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    height: 44,
    width: '100%',
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  stickerCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  stickerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  stickerMetaText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  settingsGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  formatBtnActive: {
    backgroundColor: '#0f172a',
  },
  formatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  formatBtnTextActive: {
    color: '#ffffff',
  },
  copiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  copyChipActive: {
    backgroundColor: '#0d9488',
  },
  copyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  copyChipTextActive: {
    color: '#ffffff',
  },
  copyInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  printBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

