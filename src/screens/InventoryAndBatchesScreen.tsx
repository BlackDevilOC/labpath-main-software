import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { ProductCategory, ProductUnit } from '../types/labpath';
import { formatPKR } from '../utils/invoiceHtml';
import { BarcodeModal } from '../components/BarcodeModal';
import { BarcodeLabelData } from '../utils/barcodeHtml';

export function InventoryAndBatchesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const {
    currentUser,
    products,
    batches,
    getProductTotalStock,
    getDaysUntilExpiry,
    addProductBatch,
    updateBatchQuantity,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useLabPath();

  // ADMIN or assigned MANAGER can add new items, manage prices, and edit catalog details.
  const canManageCatalogAndPrices =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const [viewMode, setViewMode] = useState<'GRID' | 'DETAIL' | 'ADD_PRODUCT'>(
    'GRID'
  );
  const [filterMode, setFilterMode] = useState<
    'ALL' | 'NEAR_EXPIRY' | 'LOW_STOCK'
  >('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  // Clean Modal States so forms are NEVER dumped on the main detail page
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [receiveBatchModalOpen, setReceiveBatchModalOpen] = useState(false);

  // Edit Existing Product & Price State (inside clean modal)
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editPackSize, setEditPackSize] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editMinAlert, setEditMinAlert] = useState('');
  const [editColdChain, setEditColdChain] = useState(false);

  // Receive New Batch Form State (inside clean modal)
  const [batchNumber, setBatchNumber] = useState('');
  const [mfgDate, setMfgDate] = useState('2026-11-01');
  const [expiryDate, setExpiryDate] = useState('2027-11-01');
  const [qtyStr, setQtyStr] = useState('20');
  const [costStr, setCostStr] = useState('3500');
  const [rackLocation, setRackLocation] = useState('Cold Fridge #1 - Shelf A');

  // Add New Product + Optional Opening Batch Form State
  const [newSku, setNewSku] = useState('LP-BIO-008');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('HUMAN / Spinreact');
  const [newCategory, setNewCategory] = useState<ProductCategory>('REAGENT');
  const [newUnit, setNewUnit] = useState<ProductUnit>('KIT');
  const [newPackSize, setNewPackSize] = useState('2 x 100 ml');
  const [newBasePrice, setNewBasePrice] = useState('4500');
  const [newColdChain, setNewColdChain] = useState(true);
  const [includeOpeningBatch, setIncludeOpeningBatch] = useState(false);
  const [initBatchNo, setInitBatchNo] = useState('LOT-26A');
  const [initMfgDate, setInitMfgDate] = useState('2026-11-01');
  const [initExpDate, setInitExpDate] = useState('2027-11-01');
  const [initQty, setInitQty] = useState('15');

  // Barcode Modal State
  const [barcodeTarget, setBarcodeTarget] = useState<BarcodeLabelData | null>(
    null
  );

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || null;

  const showToast = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(null), 2500);
  };

  const openProductDetail = (productId: string) => {
    setSelectedProductId(productId);
    setViewMode('DETAIL');
  };

  const openEditItemModal = () => {
    if (!selectedProduct || !canManageCatalogAndPrices) return;
    setEditName(selectedProduct.name);
    setEditBrand(selectedProduct.brand);
    setEditPackSize(selectedProduct.packSizeInfo);
    setEditBasePrice(String(selectedProduct.basePrice));
    setEditMinAlert(String(selectedProduct.minStockAlert));
    setEditColdChain(selectedProduct.requiresColdChain);
    setEditItemModalOpen(true);
  };

  const handleSaveProductEdits = () => {
    if (!selectedProduct || !canManageCatalogAndPrices) return;
    updateProduct(selectedProduct.id, {
      name: editName.trim() || selectedProduct.name,
      brand: editBrand.trim() || selectedProduct.brand,
      packSizeInfo: editPackSize.trim() || selectedProduct.packSizeInfo,
      basePrice: Number(editBasePrice) || selectedProduct.basePrice,
      minStockAlert: Number(editMinAlert) || selectedProduct.minStockAlert,
      requiresColdChain: editColdChain,
    });
    setEditItemModalOpen(false);
    showToast('Saved item & price changes');
  };

  const handleDeleteCurrentProduct = () => {
    if (!selectedProduct || !canManageCatalogAndPrices) return;
    deleteProduct(selectedProduct.id);
    setEditItemModalOpen(false);
    setSelectedProductId(null);
    setViewMode('GRID');
  };

  const handleSaveNewBatch = () => {
    if (!selectedProduct || !batchNumber.trim()) return;
    addProductBatch({
      productId: selectedProduct.id,
      batchNumber: batchNumber.trim().toUpperCase(),
      mfgDate: mfgDate.trim() || '2026-11-01',
      expiryDate: expiryDate.trim() || '2027-12-31',
      quantityOnHand: Number(qtyStr) || 10,
      purchaseCost: Number(costStr) || 0,
      rackLocation: rackLocation.trim() || 'Main Store',
    });
    setBatchNumber('');
    setReceiveBatchModalOpen(false);
    showToast('Added new batch to inventory');
  };

  const handleCreateProductAndBatch = () => {
    if (!canManageCatalogAndPrices) return;
    if (!newName.trim() || !newSku.trim()) return;
    const created = addProduct(
      {
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        brand: newBrand.trim(),
        category: newCategory,
        unit: newUnit,
        packSizeInfo: newPackSize.trim(),
        basePrice: Number(newBasePrice) || 1000,
        minStockAlert: 8,
        requiresColdChain: newColdChain,
      },
      includeOpeningBatch && initBatchNo.trim()
        ? {
            batchNumber: initBatchNo.trim().toUpperCase(),
            mfgDate: initMfgDate.trim(),
            expiryDate: initExpDate.trim(),
            quantityOnHand: Number(initQty) || 0,
            purchaseCost: Math.round((Number(newBasePrice) || 1000) * 0.75),
            rackLocation: newColdChain ? 'Cold Fridge #1' : 'Main Store Rack',
          }
        : undefined
    );
    setNewName('');
    openProductDetail(created.id);
  };

  const visibleProducts = products.filter((p) => {
    const totalStock = getProductTotalStock(p.id);
    const prodBatches = batches.filter(
      (b) => b.productId === p.id && b.quantityOnHand > 0
    );
    const hasNearExpiry = prodBatches.some(
      (b) => getDaysUntilExpiry(b.expiryDate) <= 60
    );

    if (filterMode === 'NEAR_EXPIRY') return hasNearExpiry;
    if (filterMode === 'LOW_STOCK') return totalStock <= p.minStockAlert;
    return true;
  });

  // PAGE A: Clean Add New Product Page (Only for ADMIN or assigned MANAGER)
  if (viewMode === 'ADD_PRODUCT' && canManageCatalogAndPrices) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.narrowWrap}>
          <TouchableOpacity
            onPress={() => setViewMode('GRID')}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to Stock</Text>
          </TouchableOpacity>

          <View style={styles.cleanCard}>
            <Text style={styles.pageTitle}>Add New Stock Item</Text>

            <View style={styles.formGrid}>
              <View style={[styles.fieldCol, { flex: 2 }]}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Urea UV Kinetic Kit"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>SKU Code *</Text>
                <TextInput
                  value={newSku}
                  onChangeText={setNewSku}
                  placeholder="LP-BIO-008"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Selling Rate (Rs) *</Text>
                <TextInput
                  value={newBasePrice}
                  onChangeText={setNewBasePrice}
                  keyboardType="numeric"
                  style={[styles.input, { fontWeight: '700' }]}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Pack Size</Text>
                <TextInput
                  value={newPackSize}
                  onChangeText={setNewPackSize}
                  placeholder="e.g. 2 x 100 ml"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Brand</Text>
                <TextInput
                  value={newBrand}
                  onChangeText={setNewBrand}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.pillsRow}>
                  {(
                    ['REAGENT', 'TUBE', 'CHEMICAL', 'EQUIPMENT'] as ProductCategory[]
                  ).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[
                        styles.pill,
                        newCategory === cat ? styles.pillActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          newCategory === cat ? styles.pillTextActive : null,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldCol}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.pillsRow}>
                  {(['KIT', 'TRAY', 'BOX', 'UNIT', 'PACK'] as ProductUnit[]).map(
                    (u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setNewUnit(u)}
                        style={[
                          styles.pill,
                          newUnit === u ? styles.pillActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            newUnit === u ? styles.pillTextActive : null,
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                onPress={() => setNewColdChain((v) => !v)}
                style={[
                  styles.optionChip,
                  newColdChain ? styles.optionChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    newColdChain ? styles.optionChipTextActive : null,
                  ]}
                >
                  {`Cold Chain (2°C–8°C): ${newColdChain ? 'Yes' : 'No'}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIncludeOpeningBatch((v) => !v)}
                style={[
                  styles.optionChip,
                  includeOpeningBatch ? styles.optionChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    includeOpeningBatch ? styles.optionChipTextActive : null,
                  ]}
                >
                  {includeOpeningBatch
                    ? '✓ Including Opening Batch'
                    : '+ Add Opening Stock Batch (Optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {includeOpeningBatch ? (
              <View style={styles.subSectionBox}>
                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Batch / Lot #</Text>
                    <TextInput
                      value={initBatchNo}
                      onChangeText={setInitBatchNo}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={initMfgDate}
                      onChangeText={setInitMfgDate}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={initExpDate}
                      onChangeText={setInitExpDate}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Opening Qty</Text>
                    <TextInput
                      value={initQty}
                      onChangeText={setInitQty}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleCreateProductAndBatch}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Create Stock Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // PAGE B: Clean, Uncluttered Product Detail & Batches View
  // (Forms are opened on demand in sleek modals instead of cluttering the screen)
  if (viewMode === 'DETAIL' && selectedProduct) {
    const totalStock = getProductTotalStock(selectedProduct.id);
    const prodBatches = batches
      .filter((b) => b.productId === selectedProduct.id)
      .sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          <TouchableOpacity
            onPress={() => {
              setSelectedProductId(null);
              setViewMode('GRID');
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back to Stock</Text>
          </TouchableOpacity>

          {savedBanner ? (
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{savedBanner}</Text>
            </View>
          ) : null}

          {/* Clean Summary Header Card */}
          <View style={styles.cleanHeaderCard}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <View style={styles.tagRow}>
                  <Text style={styles.skuTag}>{selectedProduct.sku}</Text>
                  <Text style={styles.catBadge}>{selectedProduct.category}</Text>
                  {selectedProduct.requiresColdChain ? (
                    <Text style={styles.coldTag}>2°C–8°C Cold Chain</Text>
                  ) : null}
                </View>
                <Text style={styles.detailName}>{selectedProduct.name}</Text>
                <Text style={styles.detailMeta}>
                  {`${selectedProduct.brand} • Pack: ${selectedProduct.packSizeInfo}`}
                </Text>
              </View>

              <View style={styles.statsCluster}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>SELLING RATE</Text>
                  <Text style={styles.statPillPrice}>
                    {`${formatPKR(selectedProduct.basePrice)} / ${selectedProduct.unit}`}
                  </Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>AVAILABLE STOCK</Text>
                  <Text style={styles.statPillStock}>
                    {`${totalStock} ${selectedProduct.unit}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Clean Action Toolbar — No forms dumped inline */}
            <View style={styles.actionToolbar}>
              <TouchableOpacity
                onPress={() => setReceiveBatchModalOpen(true)}
                style={styles.toolbarPrimaryBtn}
              >
                <Text style={styles.toolbarPrimaryText}>+ Receive New Batch</Text>
              </TouchableOpacity>

              {canManageCatalogAndPrices ? (
                <TouchableOpacity
                  onPress={openEditItemModal}
                  style={styles.toolbarSecondaryBtn}
                >
                  <Text style={styles.toolbarSecondaryText}>
                    Edit Price & Item Info
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() =>
                  setBarcodeTarget({
                    productName: selectedProduct.name,
                    sku: selectedProduct.sku,
                    batchNumber: prodBatches[0]?.batchNumber || 'STD',
                    expiryDate: prodBatches[0]?.expiryDate || '2027-12-31',
                    unit: selectedProduct.unit,
                  })
                }
                style={styles.toolbarOutlineBtn}
              >
                <Text style={styles.toolbarOutlineText}>Print Barcode</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clean Batches List */}
          <View style={styles.batchesSectionHeader}>
            <Text style={styles.sectionTitle}>
              {`Active Batches (${prodBatches.length})`}
            </Text>
            <Text style={styles.sectionHint}>
              Sorted by FEFO (First-Expired, First-Out)
            </Text>
          </View>

          <View style={styles.batchesList}>
            {prodBatches.map((batch, idx) => {
              const daysLeft = getDaysUntilExpiry(batch.expiryDate);
              const expiringSoon = daysLeft <= 60;
              return (
                <View
                  key={batch.id}
                  style={[
                    styles.batchCard,
                    expiringSoon ? styles.batchCardWarn : null,
                  ]}
                >
                  <View style={styles.batchMainRow}>
                    <View style={{ flex: 1.3, minWidth: 160 }}>
                      <View style={styles.batchTitleRow}>
                        <Text style={styles.batchCode}>{batch.batchNumber}</Text>
                        {idx === 0 && batch.quantityOnHand > 0 ? (
                          <View style={styles.fefoBadge}>
                            <Text style={styles.fefoBadgeText}>FEFO #1</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.batchRack}>
                        {batch.rackLocation || 'Main Store'}
                      </Text>
                    </View>

                    <View style={styles.dateBox}>
                      <Text style={styles.dateBoxLabel}>START / MFG DATE</Text>
                      <Text style={styles.dateBoxValue}>
                        {batch.mfgDate || '2026-01-01'}
                      </Text>
                    </View>

                    <View style={styles.dateBox}>
                      <Text style={styles.dateBoxLabel}>EXPIRY DATE</Text>
                      <Text
                        style={[
                          styles.dateBoxValue,
                          expiringSoon ? { color: '#dc2626' } : null,
                        ]}
                      >
                        {`${batch.expiryDate} (${daysLeft}d)`}
                      </Text>
                    </View>

                    <View style={styles.batchRightActions}>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          onPress={() =>
                            updateBatchQuantity(
                              batch.id,
                              batch.quantityOnHand - 1
                            )
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.batchQty}>
                          {`${batch.quantityOnHand} ${selectedProduct.unit}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            updateBatchQuantity(
                              batch.id,
                              batch.quantityOnHand + 1
                            )
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          setBarcodeTarget({
                            productName: selectedProduct.name,
                            sku: selectedProduct.sku,
                            batchNumber: batch.batchNumber,
                            expiryDate: batch.expiryDate,
                            mfgDate: batch.mfgDate,
                            unit: selectedProduct.unit,
                          })
                        }
                        style={styles.barcodeSmallBtn}
                      >
                        <Text style={styles.barcodeSmallText}>Barcode</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* MODAL 1: Clean Popover Modal for Editing Price & Item Details (Admin / Manager Only) */}
        <Modal
          visible={editItemModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setEditItemModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setEditItemModalOpen(false)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Price & Item Info</Text>
                  <Text style={styles.modalSub}>{selectedProduct.sku}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditItemModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>
                      {`Selling Rate per ${selectedProduct.unit} (Rs)`}
                    </Text>
                    <TextInput
                      value={editBasePrice}
                      onChangeText={setEditBasePrice}
                      keyboardType="numeric"
                      style={[styles.input, styles.priceHighlightInput]}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Pack Size</Text>
                    <TextInput
                      value={editPackSize}
                      onChangeText={setEditPackSize}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Product Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    style={styles.input}
                  />
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Brand</Text>
                    <TextInput
                      value={editBrand}
                      onChangeText={setEditBrand}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Low Stock Alert</Text>
                    <TextInput
                      value={editMinAlert}
                      onChangeText={setEditMinAlert}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setEditColdChain((v) => !v)}
                  style={[
                    styles.optionChip,
                    editColdChain ? styles.optionChipActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      editColdChain ? styles.optionChipTextActive : null,
                    ]}
                  >
                    {`Cold-Chain Storage (2°C–8°C): ${
                      editColdChain ? 'Yes' : 'No'
                    }`}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={handleDeleteCurrentProduct}
                  style={styles.deleteItemBtn}
                >
                  <Text style={styles.deleteItemText}>Delete Item</Text>
                </TouchableOpacity>

                <View style={styles.modalFooterRight}>
                  <TouchableOpacity
                    onPress={() => setEditItemModalOpen(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveProductEdits}
                    style={styles.saveModalBtn}
                  >
                    <Text style={styles.saveModalBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: Clean Popover Modal for Receiving a New Batch */}
        <Modal
          visible={receiveBatchModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiveBatchModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setReceiveBatchModalOpen(false)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Receive New Stock Batch</Text>
                  <Text style={styles.modalSub}>{selectedProduct.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReceiveBatchModalOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Batch / Lot Number *</Text>
                    <TextInput
                      value={batchNumber}
                      onChangeText={setBatchNumber}
                      placeholder="e.g. LOT-26B"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>
                      {`Quantity (${selectedProduct.unit}) *`}
                    </Text>
                    <TextInput
                      value={qtyStr}
                      onChangeText={setQtyStr}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Start / Mfg Date (YYYY-MM-DD)</Text>
                    <TextInput
                      value={mfgDate}
                      onChangeText={setMfgDate}
                      placeholder="2026-11-01"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Expiry Date (YYYY-MM-DD) *</Text>
                    <TextInput
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="2027-11-01"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Shelf / Fridge Location</Text>
                    <TextInput
                      value={rackLocation}
                      onChangeText={setRackLocation}
                      placeholder="Cold Fridge #1"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={styles.label}>Purchase Cost (Rs)</Text>
                    <TextInput
                      value={costStr}
                      onChangeText={setCostStr}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <View />
                <View style={styles.modalFooterRight}>
                  <TouchableOpacity
                    onPress={() => setReceiveBatchModalOpen(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveNewBatch}
                    style={styles.saveModalBtn}
                  >
                    <Text style={styles.saveModalBtnText}>Add Batch</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <BarcodeModal
          visible={Boolean(barcodeTarget)}
          labelData={barcodeTarget}
          onClose={() => setBarcodeTarget(null)}
        />
      </ScrollView>
    );
  }

  // PAGE C: Master Box Card Grid of Products
  const boxWidthStyle = isDesktop
    ? { width: '31.8%' as const }
    : isTablet
    ? { width: '48.2%' as const }
    : { width: '48%' as const };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWrap}>
        <View style={styles.topHeaderBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'ALL', label: 'All Stock' },
                  { key: 'NEAR_EXPIRY', label: 'Expiring Soon (< 60d)' },
                  { key: 'LOW_STOCK', label: 'Low Stock' },
                ] as const
              ).map((f) => {
                const active = filterMode === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilterMode(f.key)}
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

          {canManageCatalogAndPrices ? (
            <TouchableOpacity
              onPress={() => setViewMode('ADD_PRODUCT')}
              style={styles.addNewItemBtn}
            >
              <Text style={styles.addNewItemText}>+ Add New Item</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.boxGrid}>
          {visibleProducts.map((product) => {
            const totalStock = getProductTotalStock(product.id);
            const lowStock = totalStock <= product.minStockAlert;

            return (
              <TouchableOpacity
                key={product.id}
                onPress={() => openProductDetail(product.id)}
                style={[styles.prodBox, boxWidthStyle]}
              >
                <View style={styles.boxTop}>
                  <Text style={styles.boxCatTag}>{product.category}</Text>
                  {product.requiresColdChain ? (
                    <Text style={styles.coldTag}>2°C–8°C</Text>
                  ) : null}
                </View>

                <Text style={styles.boxName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.boxPack} numberOfLines={1}>
                  {`${product.brand} • ${product.packSizeInfo}`}
                </Text>

                <View style={styles.boxBottom}>
                  <View>
                    <Text style={styles.boxPrice}>
                      {formatPKR(product.basePrice)}
                    </Text>
                    <Text
                      style={[
                        styles.boxStock,
                        lowStock ? { color: '#dc2626' } : null,
                      ]}
                    >
                      {`Stock: ${totalStock} ${product.unit}`}
                    </Text>
                  </View>
                  <View style={styles.openBtn}>
                    <Text style={styles.openBtnText}>Open →</Text>
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
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  narrowWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  toastBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    borderRadius: 8,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  addNewItemBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addNewItemText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prodBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
    minHeight: 136,
    gap: 6,
  },
  boxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxCatTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coldTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boxName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 17,
  },
  boxPack: {
    fontSize: 11,
    color: '#64748b',
  },
  boxBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  boxPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  boxStock: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  openBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  openBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
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
  cleanHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 14,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  skuTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  catBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  statsCluster: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  statPillPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  statPillStock: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f766e',
    marginTop: 2,
  },
  actionToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  toolbarPrimaryBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  toolbarPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarSecondaryBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  toolbarSecondaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarOutlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  toolbarOutlineText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  batchesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionHint: {
    fontSize: 11,
    color: '#64748b',
  },
  batchesList: {
    gap: 8,
  },
  batchCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  batchCardWarn: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  batchMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  batchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  fefoBadge: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fefoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f766e',
  },
  batchRack: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  dateBox: {
    minWidth: 115,
    gap: 2,
  },
  dateBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  dateBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  batchRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 8,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  batchQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 46,
    textAlign: 'center',
  },
  barcodeSmallBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  barcodeSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  cleanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
    minWidth: 150,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  priceHighlightInput: {
    fontWeight: '800',
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  pillActive: {
    backgroundColor: '#0f172a',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionChipTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  subSectionBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  modalBody: {
    padding: 18,
    gap: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalFooterRight: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  saveModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: '#0d9488',
  },
  saveModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  deleteItemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: '#fef2f2',
  },
  deleteItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
});
