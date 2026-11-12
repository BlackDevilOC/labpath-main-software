import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { UserRole } from '../types/labpath';

export function LoginScreen() {
  const { login, quickLoginByRole } = useLabPath();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = () => {
    setErrorMsg(null);
    const res = login(username, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  const quickRoles: {
    role: UserRole;
    title: string;
    user: string;
    access: string;
  }[] = [
    {
      role: 'ADMIN',
      title: 'Admin (Tariq Solangi)',
      user: 'admin / 123',
      access: 'Full Access: Order Approvals, Admin Control Panel, Stock & Price Control',
    },
    {
      role: 'MANAGER',
      title: 'Stock & Price Manager (Waqas Qureshi)',
      user: 'manager / 123',
      access: 'Assigned by Admin: Can Add New Stock Items & Manage Prices inside Stock & Batches (Restricted from Admin Panel)',
    },
    {
      role: 'SALES',
      title: 'Field Salesperson (Kamran Shaikh)',
      user: 'sales / 123',
      access: 'Allowed: New Order & Own Invoices Only',
    },
    {
      role: 'WAREHOUSE',
      title: 'Warehouse Staff (Asif Mahar)',
      user: 'store / 123',
      access: 'Allowed: Packing & Dispatch, Receive Batches & Print Barcodes (Cannot edit prices or add catalog items)',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>LP</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>LabPath Sukkur</Text>
            <Text style={styles.brandSub}>
              Order, Approval & Dispatch Management System
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Sign in to your account</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Username or Phone</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="admin, sales, or store"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password (123)"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
            />
          </View>

          <TouchableOpacity onPress={handleSignIn} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR QUICK DEMO LOGIN BY ROLE</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.quickList}>
          {quickRoles.map((item) => (
            <TouchableOpacity
              key={item.role}
              onPress={() => quickLoginByRole(item.role)}
              style={styles.quickCard}
            >
              <View style={styles.quickCardTop}>
                <Text style={styles.quickTitle}>{item.title}</Text>
                <Text style={styles.quickCred}>{item.user}</Text>
              </View>
              <Text style={styles.quickAccess}>{item.access}</Text>
            </TouchableOpacity>
          ))}
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  brandSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  formSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
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
  fieldGroup: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  loginBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  quickList: {
    gap: 10,
  },
  quickCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  quickCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickCred: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0d9488',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickAccess: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
});

