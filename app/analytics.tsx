import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { db, Sale } from "@/lib/db";

type FilterType = "Today" | "Week" | "Month";
type SortMode = "REVENUE" | "PROFIT" | "COUNT";

interface GroupedSale {
  name: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
  transactions: Sale[];
}

export default function Analytics() {
  const [filter, setFilter] = useState<FilterType>("Today");
  const [stats, setStats] = useState({ revenue: 0, profit: 0, count: 0 });
  const [groupedSales, setGroupedSales] = useState<Record<string, GroupedSale>>({});
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("REVENUE");

  const loadData = useCallback(async () => {
    const now = new Date();
    let fromDate = new Date();

    if (filter === "Today") {
      fromDate.setHours(0, 0, 0, 0);
    } else if (filter === "Week") {
      const day = now.getDay() || 7;
      if (day !== 1) fromDate.setHours(-24 * (day - 1));
      else fromDate.setHours(0, 0, 0, 0);
    } else if (filter === "Month") {
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    }

    const data = await db.getSalesFromDate(fromDate.toISOString());

    const totalRevenue = data.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalProfit = data.reduce((acc, curr) => acc + (curr.profit || 0), 0);

    setStats({ revenue: totalRevenue, profit: totalProfit, count: data.length });

    const groups: Record<string, GroupedSale> = {};
    data.forEach((sale) => {
      const name = sale.bookName || "Unknown Book";
      if (!groups[name]) {
        groups[name] = {
          name,
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
          transactions: [],
        };
      }
      groups[name].totalQty += sale.qty || 0;
      groups[name].totalRevenue += sale.totalAmount || 0;
      groups[name].totalProfit += sale.profit || 0;
      groups[name].transactions.push(sale);
    });
    setGroupedSales(groups);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleExpand = (bookName: string) => {
    setExpandedBook(expandedBook === bookName ? null : bookName);
  };

  const getSortedGroups = (): GroupedSale[] => {
    const list = Object.values(groupedSales);
    switch (sortBy) {
      case "REVENUE":
        return list.sort((a, b) => b.totalRevenue - a.totalRevenue);
      case "PROFIT":
        return list.sort((a, b) => b.totalProfit - a.totalProfit);
      case "COUNT":
        return list.sort((a, b) => b.totalQty - a.totalQty);
      default:
        return list;
    }
  };

  const renderBookGroup = ({ item }: { item: GroupedSale }) => {
    const isExpanded = expandedBook === item.name;

    return (
      <View style={styles.groupContainer}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleExpand(item.name)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.groupTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.groupSub}>{item.totalQty} sold</Text>
          </View>
          <View style={{ alignItems: "flex-end", marginRight: 8 }}>
            <Text style={styles.groupAmount}>
              ₹{(item.totalRevenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.groupProfit}>
              +₹{(item.totalProfit || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Profit
            </Text>
          </View>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.transactionsList}>
            {item.transactions.map((t, index) => (
              <View key={t.id || index} style={styles.transactionRow}>
                <Text style={styles.tDate}>
                  {new Date(t.date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  , {new Date(t.date).toLocaleDateString()}
                </Text>
                <View style={styles.tDetails}>
                  <Text style={styles.tQty}>Qty: {t.qty}</Text>
                  <Text style={styles.tPrice}>₹{t.totalAmount}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {(["Today", "Week", "Month"] as FilterType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, filter === t && styles.activeTab]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.tabText, filter === t && styles.activeTabText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: Colors.blue }]}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={[styles.statValue, { color: Colors.blue }]}>
            ₹{stats.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
          <Text style={styles.statLabel}>Profit</Text>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            ₹{stats.profit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
          <Text style={styles.statLabel}>Sales</Text>
          <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.count}</Text>
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(["REVENUE", "PROFIT", "COUNT"] as SortMode[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, sortBy === s && styles.chipActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.chipText, sortBy === s && styles.chipTextActive]}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionHeader}>Performance by Book</Text>

      <FlatList
        data={getSortedGroups()}
        keyExtractor={(item) => item.name}
        renderItem={renderBookGroup}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No sales in this period</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sortLabel: {
    marginRight: 10,
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.blueLight,
    borderColor: Colors.blue,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.blue,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginLeft: 16,
    marginBottom: 10,
    color: Colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  groupContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  groupTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  groupSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  groupAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.blue,
  },
  groupProfit: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
    marginTop: 2,
  },
  transactionsList: {
    backgroundColor: Colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  tDetails: { flexDirection: "row", alignItems: "center", gap: 12 },
  tQty: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  tPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
