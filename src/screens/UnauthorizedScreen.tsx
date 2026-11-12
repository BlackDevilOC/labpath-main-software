import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { AppRouteKey, ROLE_DEFAULT_ROUTE } from '../types/labpath';

interface Props {
  attemptedRouteLabel: string;
  onReturnToAllowed: (route: AppRouteKey) => void;
}

export function UnauthorizedScreen({
  attemptedRouteLabel,
  onReturnToAllowed,
}: Props) {
  const { currentUser, logout } = useLabPath();

  const defaultAllowedRoute: AppRouteKey = currentUser
    ? ROLE_DEFAULT_ROUTE[currentUser.role]
    : 'NEW_ORDER';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>403 • UNAUTHORIZED ACCESS</Text>
        </View>

        <Text style={styles.title}>Access Restricted for Your Role</Text>

        <Text style={styles.description}>
          {`You are currently signed in as ${
            currentUser ? currentUser.name : 'Guest'
          } (Role: ${
            currentUser ? currentUser.role : 'None'
          }). Your account does not have permission to view or modify "${attemptedRouteLabel}".`}
        </Text>

        <View style={styles.permissionsBox}>
          <Text style={styles.permHeading}>Role Permissions Policy:</Text>
          <Text style={styles.permItem}>
            • Salesperson (SALES): Can punch New Orders and view/print their own Invoices.
          </Text>
          <Text style={styles.permItem}>
            • Warehouse (WAREHOUSE): Can Pack & Dispatch orders, receive stock batches, and print barcodes (cannot edit item prices).
          </Text>
          <Text style={styles.permItem}>
            • Stock Manager (MANAGER): Assigned by Admin to add new stock items and manage prices inside Stock & Batches, without access to the main Admin Panel.
          </Text>
          <Text style={styles.permItem}>
            • Admin (ADMIN): Full access to Order Approvals, Staff & Role Assignment, and Admin Control Panel.
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => onReturnToAllowed(defaultAllowedRoute)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Return to My Allowed Workspace</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Switch Account / Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  permissionsBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  permHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  permItem: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
});

