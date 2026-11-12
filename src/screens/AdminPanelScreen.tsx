import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { UserRole } from '../types/labpath';
import { formatPKR } from '../utils/invoiceHtml';

export function AdminPanelScreen() {
  const {
    products,
    users,
    recentBuyers,
    orders,
    addStaffUser,
    updateStaffRole,
    removeStaffUser,
    addGlobalBuyer,
    deleteGlobalBuyer,
  } = useLabPath();

  const [subTab, setSubTab] = useState<'STAFF' | 'BUYERS'>('STAFF');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Add Staff State
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('123');
  const [staffPhone, setStaffPhone] = useState('0300-');
  const [staffRole, setStaffRole] = useState<UserRole>('SALES');
  const [staffArea, setStaffArea] = useState('Sukkur / Rohri Route');

  // Add Global Buyer State
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerArea, setBuyerArea] = useState('Hospital Road, Sukkur');

  const showToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleAddStaff = () => {
    if (!staffName.trim() || !staffUsername.trim()) return;
    addStaffUser({
      name: staffName.trim(),
      username: staffUsername.trim().toLowerCase(),
      password: staffPassword.trim() || '123',
      phone: staffPhone.trim(),
      role: staffRole,
      area: staffArea.trim(),
    });
    setStaffName('');
    setStaffUsername('');
    showToast(`Created new ${staffRole} staff account`);
  };

  const handleChangeRole = (userId: string, nextRole: UserRole, name: string) => {
    updateStaffRole(userId, nextRole);
    showToast(`Assigned ${name} to ${nextRole} role`);
  };

  const handleAddGlobalBuyer = () => {
    if (!buyerName.trim()) return;
    addGlobalBuyer({
      buyerName: buyerName.trim(),
      contactPerson: buyerContact.trim() || 'Incharge',
      phone: buyerPhone.trim(),
      areaCity: buyerArea.trim() || 'Sukkur',
    });
    setBuyerName('');
    setBuyerContact('');
    setBuyerPhone('');
    showToast('Added buyer to Global Directory');
  };

  const totalSalesBooked = orders
    .filter((o) => o.status !== 'DRAFT' && o.status !== 'REJECTED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.maxWrap}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active Stock Items</Text>
            <Text style={styles.summaryValue}>{String(products.length)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Staff Accounts</Text>
            <Text style={styles.summaryValue}>{String(users.length)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Global Buyers</Text>
            <Text style={styles.summaryValue}>{String(recentBuyers.length)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Sales Booked</Text>
            <Text style={[styles.summaryValue, { color: '#0f766e' }]}>
              {formatPKR(totalSalesBooked)}
            </Text>
          </View>
        </View>

        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            Note: Adding new stock items, editing existing items, and managing prices is now inside the &quot;Stock &amp; Batches&quot; page. You can assign any staff member the MANAGER role below so they can manage stock items &amp; prices without accessing this Admin Control Panel.
          </Text>
        </View>

        {savedToast ? (
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{savedToast}</Text>
          </View>
        ) : null}

        <View style={styles.tabsBar}>
          {(
            [
              { key: 'STAFF', label: '1. Staff Roles, Manager Assignment & Sales' },
              { key: 'BUYERS', label: '2. Global Buyers Directory' },
            ] as const
          ).map((t) => {
            const active = subTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setSubTab(t.key)}
                style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    active ? styles.tabBtnTextActive : null,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SUB-TAB 1: Staff Accounts, Manager Role Assignment & Salesperson Performance */}
        {subTab === 'STAFF' ? (
          <View style={{ gap: 14 }}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Add New Staff Account</Text>
              <Text style={styles.sectionSub}>
                Assign MANAGER to let a trusted person add new stock items &amp; edit prices inside Stock &amp; Batches (without access to this Admin Panel).
              </Text>

              <View style={styles.formGrid}>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    value={staffName}
                    onChangeText={setStaffName}
                    placeholder="e.g. Imran Shaikh"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Login Username *</Text>
                  <TextInput
                    value={staffUsername}
                    onChangeText={setStaffUsername}
                    placeholder="e.g. imran"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    value={staffPassword}
                    onChangeText={setStaffPassword}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    value={staffPhone}
                    onChangeText={setStaffPhone}
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Assigned Area / Route</Text>
                  <TextInput
                    value={staffArea}
                    onChangeText={setStaffArea}
                    style={styles.input}
                  />
                </View>
                <View style={[styles.fieldCol, { flex: 1.5 }]}>
                  <Text style={styles.label}>Role Permission</Text>
                  <View style={styles.roleRow}>
                    {(
                      ['SALES', 'WAREHOUSE', 'MANAGER', 'ADMIN'] as UserRole[]
                    ).map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setStaffRole(r)}
                        style={[
                          styles.rolePill,
                          staffRole === r ? styles.rolePillActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            staffRole === r ? styles.rolePillTextActive : null,
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAddStaff}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Create Staff Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Team Accounts, Role Assignment &amp; Sales Performance
              </Text>
              <Text style={styles.sectionSub}>
                Switch any staff member to MANAGER to grant them Stock &amp; Price editing rights
              </Text>

              {users.map((u) => {
                const repOrders = orders.filter(
                  (o) => o.salespersonId === u.id && o.status !== 'DRAFT'
                );
                const repTotal = repOrders.reduce(
                  (sum, o) => sum + o.totalAmount,
                  0
                );

                return (
                  <View key={u.id} style={styles.staffRow}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <Text style={styles.prodName}>
                        {`${u.name} (${u.role})`}
                      </Text>
                      <Text style={styles.prodMeta}>
                        {`Login: ${u.username} / Pass: ${u.password} • ${u.phone} • ${u.area}`}
                      </Text>
                      {u.role === 'SALES' ? (
                        <Text style={styles.perfText}>
                          {`Booked Orders: ${repOrders.length} • Total Value: ${formatPKR(
                            repTotal
                          )}`}
                        </Text>
                      ) : null}
                      {u.role === 'MANAGER' ? (
                        <Text style={styles.managerTag}>
                          Assigned Stock &amp; Price Manager (Cannot access Admin Panel)
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.staffActionsWrap}>
                      {u.id !== 'u-admin-1' ? (
                        <View style={styles.inlineRoleGroup}>
                          {(
                            ['SALES', 'WAREHOUSE', 'MANAGER'] as UserRole[]
                          ).map((roleOpt) => {
                            const active = u.role === roleOpt;
                            return (
                              <TouchableOpacity
                                key={roleOpt}
                                onPress={() =>
                                  handleChangeRole(u.id, roleOpt, u.name)
                                }
                                style={[
                                  styles.miniRoleChip,
                                  active ? styles.miniRoleChipActive : null,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.miniRoleText,
                                    active ? styles.miniRoleTextActive : null,
                                  ]}
                                >
                                  {roleOpt}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : null}

                      {u.id !== 'u-admin-1' ? (
                        <TouchableOpacity
                          onPress={() => removeStaffUser(u.id)}
                          style={styles.delSmallBtn}
                        >
                          <Text style={styles.delSmallText}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* SUB-TAB 2: Global Buyers Directory */}
        {subTab === 'BUYERS' ? (
          <View style={{ gap: 14 }}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Add Lab / Clinic to Global Buyers List
              </Text>
              <View style={styles.formGrid}>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Lab / Hospital / Buyer Name *</Text>
                  <TextInput
                    value={buyerName}
                    onChangeText={setBuyerName}
                    placeholder="e.g. Peoples Medical Lab"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Area / City</Text>
                  <TextInput
                    value={buyerArea}
                    onChangeText={setBuyerArea}
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Contact Person</Text>
                  <TextInput
                    value={buyerContact}
                    onChangeText={setBuyerContact}
                    style={styles.input}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    value={buyerPhone}
                    onChangeText={setBuyerPhone}
                    style={styles.input}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={handleAddGlobalBuyer}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>
                  Add to Global Buyers Dropdown
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {`Saved Global Buyers (${recentBuyers.length})`}
              </Text>
              {recentBuyers.map((b) => (
                <View key={b.id} style={styles.staffRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prodName}>{b.buyerName}</Text>
                    <Text style={styles.prodMeta}>
                      {`${b.areaCity} • ${b.contactPerson} (${b.phone || 'N/A'})`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteGlobalBuyer(b.id)}
                    style={styles.delSmallBtn}
                  >
                    <Text style={styles.delSmallText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ) : null}
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
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  infoNote: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: 12,
    borderRadius: 8,
  },
  infoNoteText: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '600',
    lineHeight: 17,
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
  tabsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -6,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  prodMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  perfText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f766e',
    marginTop: 3,
  },
  managerTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    marginTop: 3,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#0f172a',
  },
  delSmallBtn: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 7,
  },
  delSmallText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '600',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fieldCol: {
    flex: 1,
    minWidth: 170,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rolePill: {
    flex: 1,
    minWidth: 68,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  rolePillActive: {
    backgroundColor: '#0f172a',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rolePillTextActive: {
    color: '#ffffff',
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
  staffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  staffActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineRoleGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  miniRoleChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  miniRoleChipActive: {
    backgroundColor: '#0d9488',
  },
  miniRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  miniRoleTextActive: {
    color: '#ffffff',
  },
});
