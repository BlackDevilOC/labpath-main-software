import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { BuyerPreset, Order, PaymentTerms, ProductCategory } from '../types/labpath';
import { formatPKR } from '../utils/invoiceHtml';

interface CartLine {
  productId: string;
  quantity: number;
  bonusQty: number;
  unitPrice: number;
}

interface Props {
  onOrderCreated: () => void;
}

export function NewOrderScreen({ onOrderCreated }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600 && width < 900;

  const {
    currentUser,
    recentBuyers,
    products,
    orders,
    isOfflineMode,
    getProductTotalStock,
    createOrder,
    deleteDraftOrder,
    addGlobalBuyer,
  } = useLabPath();

  const [stepPage, setStepPage] = useState<'CATALOG' | 'CHECKOUT'>('CATALOG');
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(undefined);

  // Buyer Fields
  const [buyerName, setBuyerName] = useState('');
  const [buyerArea, setBuyerArea] = useState('Hospital Road, Sukkur');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('CASH');
  const [orderNote, setOrderNote] = useState('');

  // Global Buyer Dropdown Modal State
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [savedBuyerToast, setSavedBuyerToast] = useState(false);

  // Catalog & Cart State
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ProductCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [extraDiscountStr, setExtraDiscountStr] = useState<string>('0');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftSavedBanner, setDraftSavedBanner] = useState<string | null>(null);

  // User's Draft Orders
  const myDraftOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'DRAFT' &&
          (currentUser?.role === 'ADMIN' || o.salespersonId === currentUser?.id)
      ),
    [orders, currentUser]
  );

  const filteredBuyers = useMemo(() => {
    const q = buyerSearchQuery.trim().toLowerCase();
    if (!q) return recentBuyers;
    return recentBuyers.filter(
      (b) =>
        b.buyerName.toLowerCase().includes(q) ||
        b.areaCity.toLowerCase().includes(q) ||
        b.contactPerson.toLowerCase().includes(q)
    );
  }, [recentBuyers, buyerSearchQuery]);

  const applyBuyerFromDropdown = (preset: BuyerPreset) => {
    setBuyerName(preset.buyerName);
    setBuyerArea(preset.areaCity);
    setBuyerContact(preset.contactPerson);
    setBuyerPhone(preset.phone);
    setBuyerDropdownOpen(false);
    setFormError(null);
  };

  const handleSaveCurrentBuyerToGlobal = () => {
    if (!buyerName.trim()) {
      setFormError('Enter a Buyer / Lab name first to save it to the global list');
      return;
    }
    addGlobalBuyer({
      buyerName: buyerName.trim(),
      contactPerson: buyerContact.trim() || 'Incharge',
      phone: buyerPhone.trim(),
      areaCity: buyerArea.trim() || 'Sukkur',
    });
    setSavedBuyerToast(true);
    setTimeout(() => setSavedBuyerToast(false), 2500);
  };

  const handleResumeDraft = (draft: Order) => {
    setActiveDraftId(draft.id);
    setBuyerName(draft.buyerName === 'Untitled Draft Order' ? '' : draft.buyerName);
    setBuyerArea(draft.buyerArea);
    setBuyerContact(draft.buyerContact === 'Lab Manager' ? '' : draft.buyerContact);
    setBuyerPhone(draft.buyerPhone === '-' ? '' : draft.buyerPhone);
    setPaymentTerms(draft.paymentTerms);
    setOrderNote(draft.orderNote || '');
    setExtraDiscountStr(String(draft.extraDiscountAmount));
    setCart(
      draft.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        bonusQty: i.bonusQty || 0,
        unitPrice: i.unitPrice,
      }))
    );
    setStepPage('CHECKOUT');
  };

  const updateQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    const defaultPrice = prod ? prod.basePrice : 0;

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (!existing && delta > 0) {
        return [
          ...prev,
          { productId, quantity: delta, bonusQty: 0, unitPrice: defaultPrice },
        ];
      }
      return prev
        .map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0);
    });
  };

  const updateLinePrice = (productId: string, valStr: string) => {
    const val = Number(valStr) || 0;
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, unitPrice: val } : c))
    );
  };

  const updateLineBonus = (productId: string, valStr: string) => {
    const val = Math.max(0, Number(valStr) || 0);
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, bonusQty: val } : c))
    );
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, categoryFilter, searchQuery]);

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const extraDiscount = Number(extraDiscountStr) || 0;
  const netTotal = Math.max(0, subtotal - extraDiscount);
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const resetOrderForm = () => {
    setCart([]);
    setActiveDraftId(undefined);
    setBuyerName('');
    setBuyerContact('');
    setBuyerPhone('');
    setExtraDiscountStr('0');
    setOrderNote('');
    setFormError(null);
  };

  const handleSaveAsDraft = () => {
    if (cart.length === 0) {
      setFormError('Add at least 1 product before saving as draft');
      return;
    }
    const saved = createOrder({
      draftOrderId: activeDraftId,
      isDraft: true,
      buyerName: buyerName.trim() || 'Untitled Draft Order',
      buyerContact: buyerContact.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerArea: buyerArea.trim(),
      paymentTerms,
      items: cart,
      extraDiscountAmount: extraDiscount,
      orderNote: orderNote.trim() || undefined,
    });
    resetOrderForm();
    setStepPage('CATALOG');
    setDraftSavedBanner(`Draft ${saved.orderNumber} saved (${saved.buyerName})`);
    setTimeout(() => setDraftSavedBanner(null), 3000);
  };

  const handleSubmitFinal = () => {
    if (!buyerName.trim()) {
      setFormError('Please select or enter the Buyer / Lab / Clinic name');
      return;
    }
    if (cart.length === 0) {
      setFormError('Please add at least 1 product');
      return;
    }
    createOrder({
      draftOrderId: activeDraftId,
      isDraft: false,
      buyerName: buyerName.trim(),
      buyerContact: buyerContact.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerArea: buyerArea.trim(),
      paymentTerms,
      items: cart,
      extraDiscountAmount: extraDiscount,
      orderNote: orderNote.trim() || undefined,
    });
    resetOrderForm();
    setStepPage('CATALOG');
    onOrderCreated();
  };

  // Dedicated Page 2: Buyer Details & Order Review
  if (stepPage === 'CHECKOUT') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          <View style={styles.checkoutTopNav}>
            <TouchableOpacity
              onPress={() => setStepPage('CATALOG')}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>← Back to Products</Text>
            </TouchableOpacity>

            {activeDraftId ? (
              <View style={styles.editingDraftBadge}>
                <Text style={styles.editingDraftText}>Editing Saved Draft</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.pageTitle}>Buyer Details & Order Confirmation</Text>

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {savedBuyerToast ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Saved to Global Buyers Directory — All team members can now select this buyer!
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.buyerCardTop}>
              <Text style={styles.sectionHeading}>1. Buyer / Party Information</Text>
              <TouchableOpacity
                onPress={handleSaveCurrentBuyerToGlobal}
                style={styles.saveGlobalBtn}
              >
                <Text style={styles.saveGlobalBtnText}>
                  + Save to Global Buyer List
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clean Searchable Dropdown Trigger (Scales to 100+ Buyers cleanly) */}
            <View style={styles.fieldCol}>
              <Text style={styles.label}>
                Quick Select from Global Buyers Directory
              </Text>
              <TouchableOpacity
                onPress={() => setBuyerDropdownOpen(true)}
                style={styles.dropdownTrigger}
              >
                <Text style={styles.dropdownTriggerText}>
                  {buyerName
                    ? `Selected: ${buyerName} (${buyerArea})`
                    : `Select Saved Lab / Buyer (${recentBuyers.length} in Global List)...`}
                </Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>
                  Buyer / Lab / Clinic Name * (Or type a new one)
                </Text>
                <TextInput
                  value={buyerName}
                  onChangeText={setBuyerName}
                  placeholder="Type Lab, Hospital, or Doctor name..."
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Area / City</Text>
                <TextInput
                  value={buyerArea}
                  onChangeText={setBuyerArea}
                  placeholder="e.g. Hospital Road, Sukkur"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Contact Person</Text>
                <TextInput
                  value={buyerContact}
                  onChangeText={setBuyerContact}
                  placeholder="e.g. Dr. Naveed / Lab Incharge"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  value={buyerPhone}
                  onChangeText={setBuyerPhone}
                  placeholder="0300-0000000"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldCol}>
              <Text style={styles.label}>Payment Terms</Text>
              <View style={styles.termsRow}>
                {(
                  [
                    { key: 'CASH', label: 'Cash' },
                    { key: 'CREDIT_BILL', label: 'Credit Bill' },
                    { key: 'BANK_TRANSFER', label: 'Bank' },
                  ] as const
                ).map((t) => {
                  const active = paymentTerms === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setPaymentTerms(t.key)}
                      style={[
                        styles.termPill,
                        active ? styles.termPillActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.termPillText,
                          active ? styles.termPillTextActive : null,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>
              {`2. Selected Items (${cart.length})`}
            </Text>

            {cart.map((line) => {
              const prod = products.find((p) => p.id === line.productId);
              if (!prod) return null;
              return (
                <View key={line.productId} style={styles.reviewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewProdName}>{prod.name}</Text>
                    <Text style={styles.reviewProdSub}>
                      {`${line.quantity} ${prod.unit} × ${formatPKR(
                        line.unitPrice
                      )} = ${formatPKR(line.quantity * line.unitPrice)}`}
                    </Text>
                  </View>

                  <View style={styles.reviewInputs}>
                    <View style={styles.miniField}>
                      <Text style={styles.miniLabel}>Rate (Rs)</Text>
                      <TextInput
                        value={String(line.unitPrice)}
                        onChangeText={(v) => updateLinePrice(prod.id, v)}
                        keyboardType="numeric"
                        style={styles.miniInput}
                      />
                    </View>
                    <View style={styles.miniField}>
                      <Text style={styles.miniLabel}>Bonus</Text>
                      <TextInput
                        value={String(line.bonusQty)}
                        onChangeText={(v) => updateLineBonus(prod.id, v)}
                        keyboardType="numeric"
                        style={[styles.miniInput, { width: 48 }]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.discountRow}>
              <Text style={styles.label}>Special Discount (Rs)</Text>
              <TextInput
                value={extraDiscountStr}
                onChangeText={setExtraDiscountStr}
                keyboardType="numeric"
                style={[styles.miniInput, { width: 95 }]}
              />
            </View>

            <View style={styles.fieldCol}>
              <Text style={styles.label}>Order / Delivery Note</Text>
              <TextInput
                value={orderNote}
                onChangeText={setOrderNote}
                placeholder="Optional note for Admin or Warehouse..."
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
            </View>

            <View style={styles.netRow}>
              <Text style={styles.netLabel}>Net Order Total</Text>
              <Text style={styles.netValue}>{formatPKR(netTotal)}</Text>
            </View>

            <View style={styles.checkoutButtonsRow}>
              <TouchableOpacity
                onPress={handleSaveAsDraft}
                style={styles.draftBtn}
              >
                <Text style={styles.draftBtnText}>Save as Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitFinal}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>
                  {isOfflineMode
                    ? `Save Offline (${formatPKR(netTotal)})`
                    : `Submit Order (${formatPKR(netTotal)})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Global Buyer Searchable Dropdown Modal */}
        <Modal
          visible={buyerDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setBuyerDropdownOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.dropdownModalSheet}>
              <View style={styles.dropdownModalHeader}>
                <Text style={styles.dropdownModalTitle}>
                  {`Global Buyers Directory (${recentBuyers.length})`}
                </Text>
                <TouchableOpacity onPress={() => setBuyerDropdownOpen(false)}>
                  <Text style={styles.closeModalText}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={{ padding: 12 }}>
                <TextInput
                  value={buyerSearchQuery}
                  onChangeText={setBuyerSearchQuery}
                  placeholder="Search lab, hospital, clinic, or city..."
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </View>

              <ScrollView style={styles.dropdownList}>
                {filteredBuyers.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => applyBuyerFromDropdown(b)}
                    style={styles.dropdownItem}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownItemName}>{b.buyerName}</Text>
                      <Text style={styles.dropdownItemMeta}>
                        {`${b.areaCity} • ${b.contactPerson} (${b.phone || 'No phone'})`}
                      </Text>
                    </View>
                    <Text style={styles.selectTag}>Select</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // Page 1: Compact Box Card Grid of Products + Saved Drafts Bar
  const cardWidthStyle = isDesktop
    ? { width: '31.8%' as const }
    : isTablet
    ? { width: '48.2%' as const }
    : { width: '48%' as const };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.maxWrap}>
          {draftSavedBanner ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{draftSavedBanner}</Text>
            </View>
          ) : null}

          {/* Saved Drafts Section */}
          {myDraftOrders.length > 0 ? (
            <View style={styles.draftsCard}>
              <Text style={styles.draftsHeading}>
                {`Saved Draft Orders (${myDraftOrders.length}) — Tap to Resume`}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.draftsRow}>
                  {myDraftOrders.map((draft) => (
                    <View key={draft.id} style={styles.draftBox}>
                      <TouchableOpacity
                        onPress={() => handleResumeDraft(draft)}
                        style={{ flex: 1 }}
                      >
                        <Text style={styles.draftBuyer} numberOfLines={1}>
                          {draft.buyerName}
                        </Text>
                        <Text style={styles.draftMeta}>
                          {`${draft.items.length} item(s) • ${formatPKR(
                            draft.totalAmount
                          )}`}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteDraftOrder(draft.id)}
                        style={styles.deleteDraftBtn}
                      >
                        <Text style={styles.deleteDraftText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search reagents, tubes, chemicals..."
            placeholderTextColor="#94a3b8"
            style={styles.searchBar}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.catRow}>
              {(['ALL', 'REAGENT', 'TUBE', 'CHEMICAL', 'EQUIPMENT'] as const).map(
                (cat) => {
                  const active = categoryFilter === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategoryFilter(cat)}
                      style={[
                        styles.catChip,
                        active ? styles.catChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          active ? styles.catChipTextActive : null,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </ScrollView>

          <View style={styles.boxGrid}>
            {filteredProducts.map((prod) => {
              const stock = getProductTotalStock(prod.id);
              const inCart = cart.find((c) => c.productId === prod.id);
              const qty = inCart ? inCart.quantity : 0;

              return (
                <View
                  key={prod.id}
                  style={[
                    styles.productBox,
                    cardWidthStyle,
                    qty > 0 ? styles.productBoxSelected : null,
                  ]}
                >
                  <View style={styles.boxTopRow}>
                    <Text style={styles.boxCatTag}>{prod.category}</Text>
                    <Text style={styles.boxStockTag}>
                      {`${stock} ${prod.unit}`}
                    </Text>
                  </View>

                  <Text style={styles.boxProdName} numberOfLines={2}>
                    {prod.name}
                  </Text>
                  <Text style={styles.boxPackText} numberOfLines={1}>
                    {`${prod.brand} • ${prod.packSizeInfo}`}
                  </Text>

                  <View style={styles.boxBottomRow}>
                    <Text style={styles.boxPrice}>
                      {formatPKR(prod.basePrice)}
                    </Text>

                    {qty > 0 ? (
                      <View style={styles.boxStepper}>
                        <TouchableOpacity
                          onPress={() => updateQty(prod.id, -1)}
                          style={styles.boxStepBtn}
                        >
                          <Text style={styles.boxStepText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.boxQtyText}>{String(qty)}</Text>
                        <TouchableOpacity
                          onPress={() => updateQty(prod.id, 1)}
                          style={[styles.boxStepBtn, styles.boxStepBtnPlus]}
                        >
                          <Text style={styles.boxStepTextPlus}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => updateQty(prod.id, 1)}
                        style={styles.boxAddBtn}
                      >
                        <Text style={styles.boxAddBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {cart.length > 0 ? (
        <View style={styles.stickyCartBar}>
          <View style={styles.stickyCartInner}>
            <View>
              <Text style={styles.stickyCount}>
                {`${cart.length} item(s) (${totalCartUnits} units)`}
              </Text>
              <Text style={styles.stickyTotal}>{formatPKR(subtotal)}</Text>
            </View>
            <View style={styles.stickyBtnsRow}>
              <TouchableOpacity
                onPress={handleSaveAsDraft}
                style={styles.stickyDraftBtn}
              >
                <Text style={styles.stickyDraftText}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStepPage('CHECKOUT')}
                style={styles.stickyNextBtn}
              >
                <Text style={styles.stickyNextText}>Buyer & Submit →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 14,
    paddingBottom: 95,
  },
  maxWrap: {
    maxWidth: 1050,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  draftsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  draftsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
  },
  draftsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 190,
    gap: 8,
  },
  draftBuyer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  draftMeta: {
    fontSize: 11,
    color: '#0f766e',
  },
  deleteDraftBtn: {
    padding: 4,
  },
  deleteDraftText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  searchBar: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  boxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
    minHeight: 138,
    gap: 6,
  },
  productBoxSelected: {
    borderColor: '#0d9488',
    borderWidth: 1.5,
    backgroundColor: '#f0fdfa',
  },
  boxTopRow: {
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
  boxStockTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0f766e',
  },
  boxProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 17,
  },
  boxPackText: {
    fontSize: 11,
    color: '#64748b',
  },
  boxBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  boxAddBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  boxAddBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  boxStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boxStepBtn: {
    backgroundColor: '#e2e8f0',
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxStepBtnPlus: {
    backgroundColor: '#0d9488',
  },
  boxStepText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  boxStepTextPlus: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  boxQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  stickyCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stickyCartInner: {
    maxWidth: 1050,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyCount: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  stickyTotal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  stickyBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stickyDraftBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stickyDraftText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  stickyNextBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stickyNextText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkoutTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
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
  editingDraftBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editingDraftText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  buyerCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  saveGlobalBtn: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  saveGlobalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
  },
  dropdownTrigger: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#0d9488',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f766e',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#0f766e',
    fontWeight: '700',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  termsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  termPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
  },
  termPillActive: {
    backgroundColor: '#0f172a',
  },
  termPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  termPillTextActive: {
    color: '#ffffff',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  reviewProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewProdSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reviewInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  miniField: {
    alignItems: 'center',
    gap: 2,
  },
  miniLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  miniInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 72,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  netValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f766e',
  },
  checkoutButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  draftBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  draftBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
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
  dropdownModalSheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeModalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  dropdownList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  dropdownItemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  selectTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0d9488',
  },
});
