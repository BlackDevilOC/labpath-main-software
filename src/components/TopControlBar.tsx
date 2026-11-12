import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLabPath } from '../context/LabPathContext';

interface Props {
  activePageTitle: string;
  onToggleSidebar: () => void;
}

export function TopControlBar({ activePageTitle, onToggleSidebar }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const {
    currentUser,
    logout,
    isOfflineMode,
    toggleOfflineMode,
    offlinePendingCount,
    syncOfflineQueue,
  } = useLabPath();

  if (!currentUser) return null;

  return (
    <View style={styles.headerWrap}>
      <View style={styles.bar}>
        <View style={styles.leftRow}>
          <TouchableOpacity onPress={onToggleSidebar} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle} numberOfLines={1}>
              {activePageTitle}
            </Text>
            <Text style={styles.userSub} numberOfLines={1}>
              {`${currentUser.name} • ${currentUser.role}`}
            </Text>
          </View>
        </View>

        <View style={styles.rightControls}>
          <TouchableOpacity
            onPress={toggleOfflineMode}
            style={[
              styles.statusPill,
              isOfflineMode ? styles.statusOffline : styles.statusOnline,
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isOfflineMode ? '#d97706' : '#10b981' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isOfflineMode ? '#92400e' : '#065f46' },
              ]}
            >
              {isOfflineMode ? 'Offline' : 'Online'}
            </Text>
          </TouchableOpacity>

          {!isMobile ? (
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {offlinePendingCount > 0 ? (
        <View style={styles.syncStrip}>
          <Text style={styles.syncStripText}>
            {`${offlinePendingCount} offline order(s) waiting`}
          </Text>
          <TouchableOpacity onPress={syncOfflineQueue} style={styles.syncBtn}>
            <Text style={styles.syncBtnText}>Sync</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  userSub: {
    fontSize: 11,
    color: '#64748b',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  statusOnline: {
    backgroundColor: '#ecfdf5',
  },
  statusOffline: {
    backgroundColor: '#fef3c7',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  syncStrip: {
    backgroundColor: '#fffbeb',
    borderTopWidth: 1,
    borderTopColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStripText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  syncBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
