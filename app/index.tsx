import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { db, DashboardStats } from "@/lib/db";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStock: 0,
    stockValue: 0,
    totalSales: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalBooks: 0,
    lowStockCount: 0,
    profitMargin: 0,
    totalTransactions: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadStats = useCallback(async () => {
    const data = await db.getDashboardStats();
    setStats(data);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        Platform.OS === "web" ? { paddingBottom: 34 } : undefined,
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >
      <Text style={styles.sectionTitle}>Business Overview</Text>

      <View style={styles.grid}>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: Colors.blue }]}
          onPress={() => router.push({ pathname: "/stats-detail", params: { type: "STOCK" } })}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconWrap, { backgroundColor: Colors.blueLight }]}>
            <Ionicons name="cube-outline" size={20} color={Colors.blue} />
          </View>
          <Text style={styles.statLabel}>Stock Value</Text>
          <Text style={[styles.statValue, { color: Colors.blue }]}>
            {formatCurrency(stats.stockValue)}
          </Text>
          <Text style={styles.statSub}>{stats.totalStock} books in {stats.totalBooks} titles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: stats.netProfit >= 0 ? Colors.success : Colors.danger }]}
          onPress={() => router.push({ pathname: "/stats-detail", params: { type: "PROFIT" } })}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconWrap, { backgroundColor: stats.netProfit >= 0 ? Colors.successLight : Colors.dangerLight }]}>
            <Ionicons name="trending-up" size={20} color={stats.netProfit >= 0 ? Colors.success : Colors.danger} />
          </View>
          <Text style={styles.statLabel}>Net Profit</Text>
          <Text style={[styles.statValue, { color: stats.netProfit >= 0 ? Colors.success : Colors.danger }]}>
            {formatCurrency(stats.netProfit)}
          </Text>
          <Text style={styles.statSub}>
            {stats.profitMargin > 0 ? `${stats.profitMargin.toFixed(1)}% margin` : "No sales yet"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Revenue</Text>
          <Text style={[styles.miniStatValue, { color: Colors.blue }]}>{formatCurrency(stats.totalSales)}</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Expenses</Text>
          <Text style={[styles.miniStatValue, { color: Colors.danger }]}>{formatCurrency(stats.totalExpenses)}</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatLabel}>Transactions</Text>
          <Text style={[styles.miniStatValue, { color: Colors.text }]}>{stats.totalTransactions}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.analyticsBtn}
        onPress={() => router.push("/analytics")}
        activeOpacity={0.7}
      >
        <View style={styles.analyticsBtnInner}>
          <View style={styles.analyticsIconWrap}>
            <Ionicons name="bar-chart" size={22} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.analyticsBtnTitle}>Detailed Analytics</Text>
            <Text style={styles.analyticsBtnSub}>Revenue, profit, expenses & per-book data</Text>
          </View>
          <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push("/inventory")}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.blueLight }]}>
          <MaterialCommunityIcons name="bookshelf" size={24} color={Colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Manage Inventory</Text>
          <Text style={styles.actionSub}>Add, edit, search & sell books</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push("/expenses")}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.dangerLight }]}>
          <MaterialCommunityIcons name="wallet-outline" size={24} color={Colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Track Expenses</Text>
          <Text style={styles.actionSub}>Food, rent, fuel & custom categories</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, { borderLeftColor: Colors.warning, borderLeftWidth: 4 }]}
        onPress={() => router.push("/restock")}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.warningLight }]}>
          <Ionicons name="clipboard-outline" size={24} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Restock Order</Text>
          <Text style={styles.actionSub}>Generate & share reorder list</Text>
        </View>
        {stats.lowStockCount > 0 && (
          <View style={styles.lowBadge}>
            <Text style={styles.lowBadgeText}>{stats.lowStockCount}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push("/data-manage")}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.accentLight }]}>
          <Ionicons name="cloud-outline" size={24} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Backup & Restore</Text>
          <Text style={styles.actionSub}>Export/import Excel data</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  statSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  miniStatsRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
  },
  miniStatDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  miniStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  miniStatValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  analyticsBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  analyticsBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  analyticsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  analyticsBtnTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  analyticsBtnSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  actionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lowBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  lowBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.danger,
  },
});
