import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopControlBar } from '../components/TopControlBar';
import { LoginScreen } from '../screens/LoginScreen';
import { UnauthorizedScreen } from '../screens/UnauthorizedScreen';
import { NewOrderScreen } from '../screens/NewOrderScreen';
import { OrderApprovalsScreen } from '../screens/OrderApprovalsScreen';
import { PackingDispatchScreen } from '../screens/PackingDispatchScreen';
import { InvoicesHistoryScreen } from '../screens/InvoicesHistoryScreen';
import { InventoryAndBatchesScreen } from '../screens/InventoryAndBatchesScreen';
import { AdminPanelScreen } from '../screens/AdminPanelScreen';
import { useLabPath } from '../context/LabPathContext';
import { AppRouteKey, ROLE_DEFAULT_ROUTE, UserRole } from '../types/labpath';

const SIDEBAR_ITEMS: {
  key: AppRouteKey;
  label: string;
  rolesHint: string;
}[] = [
  {
    key: 'NEW_ORDER',
    label: 'New Order',
    rolesHint: 'Sales & Admin',
  },
  {
    key: 'APPROVALS',
    label: 'Order Approvals',
    rolesHint: 'Admin Only',
  },
  {
    key: 'DISPATCH',
    label: 'Packing & Dispatch',
    rolesHint: 'Warehouse & Admin',
  },
  {
    key: 'INVOICES',
    label: 'Orders & Invoices',
    rolesHint: 'Own (Sales) / All',
  },
  {
    key: 'INVENTORY',
    label: 'Stock & Batches',
    rolesHint: 'Warehouse, Manager & Admin',
  },
  {
    key: 'ADMIN_PANEL',
    label: 'Admin Control Panel',
    rolesHint: 'Admin Only',
  },
];

export default function LabPathMainApp() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { currentUser, orders, canAccessRoute, quickLoginByRole, logout } =
    useLabPath();

  const [activeRoute, setActiveRoute] = useState<AppRouteKey>('APPROVALS');
  const [prevUserId, setPrevUserId] = useState<string | null>(
    currentUser?.id ?? null
  );
  const [attemptedLabel, setAttemptedLabel] = useState<string>('');
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  if ((currentUser?.id ?? null) !== prevUserId) {
    setPrevUserId(currentUser?.id ?? null);
    if (currentUser) {
      setActiveRoute(ROLE_DEFAULT_ROUTE[currentUser.role]);
    }
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <LoginScreen />
      </SafeAreaView>
    );
  }

  const pendingApprovals = orders.filter(
    (o) => o.status === 'PENDING_APPROVAL'
  ).length;
  const activeDispatches = orders.filter(
    (o) =>
      o.status === 'APPROVED' ||
      o.status === 'PACKED' ||
      o.status === 'DISPATCHED'
  ).length;

  const getBadgeCount = (key: AppRouteKey) => {
    if (key === 'APPROVALS') return pendingApprovals;
    if (key === 'DISPATCH') return activeDispatches;
    return 0;
  };

  const handleNavigate = (itemKey: AppRouteKey, itemLabel: string) => {
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
    if (!canAccessRoute(itemKey)) {
      setAttemptedLabel(itemLabel);
      setActiveRoute('UNAUTHORIZED');
      return;
    }
    setActiveRoute(itemKey);
  };

  const activePageTitle =
    activeRoute === 'UNAUTHORIZED'
      ? 'Restricted Page'
      : SIDEBAR_ITEMS.find((i) => i.key === activeRoute)?.label || 'LabPath';

  const renderSidebarContent = () => (
    <View style={styles.sidebarInner}>
      <View style={styles.sidebarBrand}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>LP</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brandTitle}>LabPath Sukkur</Text>
          <Text style={styles.brandSub}>{currentUser.name}</Text>
        </View>
        {isMobile ? (
          <TouchableOpacity
            onPress={() => setMobileDrawerOpen(false)}
            style={styles.closeDrawerBtn}
          >
            <Text style={styles.closeDrawerText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.sidebarSectionLabel}>PAGES</Text>

      {SIDEBAR_ITEMS.map((item) => {
        const isSelected = activeRoute === item.key;
        const allowed = canAccessRoute(item.key);
        const badgeCount = getBadgeCount(item.key);

        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => handleNavigate(item.key, item.label)}
            style={[styles.navItem, isSelected ? styles.navItemActive : null]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.navLabel,
                  isSelected ? styles.navLabelActive : null,
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.navRoleHint}>
                {allowed ? item.rolesHint : `Locked • ${item.rolesHint}`}
              </Text>
            </View>

            {badgeCount > 0 ? (
              <View
                style={[styles.badge, isSelected ? styles.badgeActive : null]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isSelected ? styles.badgeTextActive : null,
                  ]}
                >
                  {String(badgeCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}

      <View style={styles.bottomControls}>
        <View style={styles.roleSwitchBox}>
          <Text style={styles.roleSwitchTitle}>Switch Role (Demo)</Text>
          <View style={styles.roleSwitchRow}>
            {(['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'] as UserRole[]).map((r) => {
              const active = currentUser.role === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    quickLoginByRole(r);
                    if (isMobile) setMobileDrawerOpen(false);
                  }}
                  style={[styles.roleChip, active ? styles.roleChipActive : null]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      active ? styles.roleChipTextActive : null,
                    ]}
                  >
                    {r === 'WAREHOUSE' ? 'STORE' : r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity onPress={logout} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <TopControlBar
        activePageTitle={activePageTitle}
        onToggleSidebar={() => {
          if (isMobile) {
            setMobileDrawerOpen((v) => !v);
          } else {
            setDesktopSidebarOpen((v) => !v);
          }
        }}
      />

      <View style={styles.bodyWrap}>
        {!isMobile && desktopSidebarOpen ? (
          <View style={styles.desktopSidebar}>{renderSidebarContent()}</View>
        ) : null}

        {isMobile ? (
          <Modal
            visible={mobileDrawerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMobileDrawerOpen(false)}
          >
            <View style={styles.drawerOverlay}>
              <View style={styles.mobileDrawer}>{renderSidebarContent()}</View>
              <Pressable
                style={styles.drawerBackdropTouch}
                onPress={() => setMobileDrawerOpen(false)}
              />
            </View>
          </Modal>
        ) : null}

        <View style={styles.contentArea}>
          {activeRoute === 'UNAUTHORIZED' ? (
            <UnauthorizedScreen
              attemptedRouteLabel={attemptedLabel}
              onReturnToAllowed={(allowedRoute) => setActiveRoute(allowedRoute)}
            />
          ) : null}

          {activeRoute === 'NEW_ORDER' ? (
            <NewOrderScreen
              onOrderCreated={() =>
                setActiveRoute(
                  currentUser.role === 'ADMIN' ? 'APPROVALS' : 'INVOICES'
                )
              }
            />
          ) : null}

          {activeRoute === 'APPROVALS' ? <OrderApprovalsScreen /> : null}

          {activeRoute === 'DISPATCH' ? <PackingDispatchScreen /> : null}

          {activeRoute === 'INVOICES' ? <InvoicesHistoryScreen /> : null}

          {activeRoute === 'INVENTORY' ? <InventoryAndBatchesScreen /> : null}

          {activeRoute === 'ADMIN_PANEL' ? <AdminPanelScreen /> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  bodyWrap: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 230,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  mobileDrawer: {
    width: 265,
    maxWidth: '82%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  drawerBackdropTouch: {
    flex: 1,
  },
  sidebarInner: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  brandSub: {
    fontSize: 11,
    color: '#64748b',
  },
  closeDrawerBtn: {
    padding: 6,
  },
  closeDrawerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  sidebarSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 8,
  },
  navItemActive: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  navLabelActive: {
    color: '#0f766e',
    fontWeight: '700',
  },
  navRoleHint: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeActive: {
    backgroundColor: '#0d9488',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  badgeTextActive: {
    color: '#ffffff',
  },
  bottomControls: {
    marginTop: 'auto',
    gap: 8,
  },
  roleSwitchBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  roleSwitchTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  roleSwitchRow: {
    flexDirection: 'row',
    gap: 4,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  roleChipActive: {
    backgroundColor: '#0f172a',
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  signOutBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  contentArea: {
    flex: 1,
  },
});
