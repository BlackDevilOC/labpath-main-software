import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';
import { UserRole } from '../types/labpath';

const ROLES: { role: UserRole; label: string; shortLabel: string; color: string }[] = [
  { role: 'ADMIN', label: 'Admin / Manager', shortLabel: 'Admin', color: '#0f766e' },
  { role: 'SALES', label: 'Field Salesperson', shortLabel: 'Sales', color: '#1d4ed8' },
  { role: 'WAREHOUSE', label: 'Warehouse / Dispatch', shortLabel: 'Dispatch', color: '#7c3aed' },
];

export function TopControlBar() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const {
    currentUser,
    switchRole,
    isOfflineMode,
    toggleOfflineMode,
    offlinePendingCount,
    syncOfflineQueue,
    activeDbProvider,
    setActiveDbProvider,
    orders,
  } = useLabPath();

  const pendingApprovals = orders.filter((o) => o.status === 'PENDING_APPROVAL').length;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.topRow, isDesktop && styles.topRowDesktop]}>
        {/* Brand Identity */}
        <View style={styles.brandBlock}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>LP</Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>LabPath Sukkur</Text>
              <TouchableOpacity
                onPress={() =>
                  setActiveDbProvider(activeDbProvider === 'NEON' ? 'SUPABASE' : 'NEON')
                }
                style={[
                  styles.dbBadge,
                  activeDbProvider === 'NEON' ? styles.dbNeon : styles.dbSupabase,
                ]}
              >
                <Text style={styles.dbBadgeText}>
                  PG: {activeDbProvider === 'NEON' ? 'Neon.tech' : 'Supabase'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.brandSub}>
              {currentUser.name} • {currentUser.area}
            </Text>
          </View>
        </View>

        {/* Role Switcher & Offline Controls */}
        <View style={styles.controlsRow}>
          <View style={styles.roleGroup}>
            {ROLES.map((r) => {
              const active = currentUser.role === r.role;
              return (
                <TouchableOpacity
                  key={r.role}
                  onPress={() => switchRole(r.role)}
                  style={[
                    styles.roleBtn,
                    active && { backgroundColor: r.color, borderColor: r.color },
                  ]}
                >
                  <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>
                    {isDesktop ? r.label : r.shortLabel}
                  </Text>
                  {r.role === 'ADMIN' && pendingApprovals > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>{pendingApprovals}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={toggleOfflineMode}
            style={[
              styles.netBtn,
              isOfflineMode ? styles.netBtnOffline : styles.netBtnOnline,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOfflineMode ? '#f59e0b' : '#10b981' },
              ]}
            />
            <Text
              style={[
                styles.netBtnText,
                { color: isOfflineMode ? '#fef3c7' : '#d1fae5' },
              ]}
            >
              {isOfflineMode ? 'Offline Queue Mode' : 'Online'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Outbox Sync Banner */}
      {(isOfflineMode || offlinePendingCount > 0) && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            {isOfflineMode
              ? `Offline Field Mode Active: Orders punched now are saved locally on phone (${offlinePendingCount} queued).`
              : `${offlinePendingCount} offline order(s) waiting in local SQLite outbox.`}
          </Text>
          {offlinePendingCount > 0 && (
            <TouchableOpacity onPress={syncOfflineQueue} style={styles.syncNowBtn}>
              <Text style={styles.syncNowBtnText}>
                Sync {offlinePendingCount} Order(s) Now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  topRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  brandSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 1,
  },
  dbBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  dbNeon: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  dbSupabase: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  dbBadgeText: {
    color: '#ecfdf5',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleGroup: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 3,
    borderRadius: 9,
    gap: 4,
  },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    gap: 5,
  },
  roleBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  countPill: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  netBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  netBtnOnline: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  netBtnOffline: {
    backgroundColor: '#78350f',
    borderColor: '#d97706',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  netBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  offlineBanner: {
    backgroundColor: '#92400e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  offlineBannerText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncNowBtn: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  syncNowBtnText: {
    color: '#451a03',
    fontSize: 12,
    fontWeight: '800',
  },
});
