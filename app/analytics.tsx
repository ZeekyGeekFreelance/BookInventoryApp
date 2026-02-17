import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Colors from "@/constants/colors";
import { db, Sale, Expense } from "@/lib/db";

type FilterType = "Today" | "Week" | "Month" | "Custom";
type SortMode = "REVENUE" | "PROFIT" | "COUNT";
type ViewMode = "SALES" | "EXPENSES";

interface GroupedSale {
  name: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
  transactions: Sale[];
}

interface GroupedExpense {
  type: string;
  total: number;
  count: number;
  entries: Expense[];
}

export default function Analytics() {
  const [filter, setFilter] = useState<FilterType>("Today");
  const [viewMode, setViewMode] = useState<ViewMode>("SALES");
  const [stats, setStats] = useState({
    revenue: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    salesCount: 0,
  });
  const [groupedSales, setGroupedSales] = useState<Record<string, GroupedSale>>({});
  const [groupedExpenses, setGroupedExpenses] = useState<Record<string, GroupedExpense>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("REVENUE");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getFromDate = (f: FilterType): Date => {
    const now = new Date();
    const fromDate = new Date();
    if (f === "Today") {
      fromDate.setHours(0, 0, 0, 0);
    } else if (f === "Week") {
      const day = now.getDay() || 7;
      if (day !== 1) fromDate.setHours(-24 * (day - 1));
      else fromDate.setHours(0, 0, 0, 0);
    } else if (f === "Month") {
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    } else if (f === "Custom") {
      return selectedDate;
    }
    return fromDate;
  };

  const loadData = useCallback(async () => {
    const fromDate = getFromDate(filter);

    const salesData = await db.getSalesFromDate(fromDate.toISOString());
    const expenseData = await db.getExpensesFromDate(fromDate.toISOString());

    const totalRevenue = salesData.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const grossProfit = salesData.reduce((acc, curr) => acc + (curr.profit || 0), 0);
    const totalExpenses = expenseData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    setStats({
      revenue: totalRevenue,
      grossProfit,
      totalExpenses,
      netProfit,
      salesCount: salesData.length,
    });

    const sGroups: Record<string, GroupedSale> = {};
    salesData.forEach((sale) => {
      const name = sale.bookName || "Unknown Book";
      if (!sGroups[name]) {
        sGroups[name] = { name, totalQty: 0, totalRevenue: 0, totalProfit: 0, transactions: [] };
      }
      sGroups[name].totalQty += sale.qty || 0;
      sGroups[name].totalRevenue += sale.totalAmount || 0;
      sGroups[name].totalProfit += sale.profit || 0;
      sGroups[name].transactions.push(sale);
    });
    setGroupedSales(sGroups);

    const eGroups: Record<string, GroupedExpense> = {};
    expenseData.forEach((exp) => {
      const type = exp.type || "Misc";
      if (!eGroups[type]) {
        eGroups[type] = { type, total: 0, count: 0, entries: [] };
      }
      eGroups[type].total += exp.amount || 0;
      eGroups[type].count++;
      eGroups[type].entries.push(exp);
    });
    setGroupedExpenses(eGroups);
  }, [filter, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleExpand = (key: string) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const getSortedSales = (): GroupedSale[] => {
    const list = Object.values(groupedSales);
    switch (sortBy) {
      case "REVENUE": return list.sort((a, b) => b.totalRevenue - a.totalRevenue);
      case "PROFIT": return list.sort((a, b) => b.totalProfit - a.totalProfit);
      case "COUNT": return list.sort((a, b) => b.totalQty - a.totalQty);
      default: return list;
    }
  };

  const getSortedExpenses = (): GroupedExpense[] => {
    return Object.values(groupedExpenses).sort((a, b) => b.total - a.total);
  };

  const formatCurrency = (val: number) =>
    `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const profitMargin = stats.revenue > 0
    ? ((stats.netProfit / stats.revenue) * 100).toFixed(1)
    : "0.0";

  const renderSalesGroup = ({ item }: { item: GroupedSale }) => {
    const isExpanded = expandedItem === item.name;
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
            <Text style={styles.groupAmount}>{formatCurrency(item.totalRevenue)}</Text>
            <Text style={styles.groupProfit}>+{formatCurrency(item.totalProfit)} Profit</Text>
          </View>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.transactionsList}>
            {item.transactions.map((t, index) => (
              <View key={t.id || index} style={styles.transactionRow}>
                <Text style={styles.tDate}>
                  {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })},{" "}
                  {new Date(t.date).toLocaleDateString()}
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

  const getCategoryColor = (type: string): string => {
    const map: Record<string, string> = {
      Food: "#E67E22", Rent: "#9B59B6", Fuel: "#E74C3C",
      Utilities: "#3498DB", Stationery: "#1ABC9C", Transport: "#F39C12",
    };
    return map[type] || Colors.textSecondary;
  };

  const renderExpenseGroup = ({ item }: { item: GroupedExpense }) => {
    const isExpanded = expandedItem === `exp_${item.type}`;
    const color = getCategoryColor(item.type);
    return (
      <View style={[styles.groupContainer, { borderLeftColor: color, borderLeftWidth: 3 }]}>
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleExpand(`exp_${item.type}`)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.groupTitle}>{item.type}</Text>
            <Text style={styles.groupSub}>{item.count} entries</Text>
          </View>
          <View style={{ alignItems: "flex-end", marginRight: 8 }}>
            <Text style={[styles.groupAmount, { color: Colors.danger }]}>
              -{formatCurrency(item.total)}
            </Text>
          </View>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.transactionsList}>
            {item.entries.map((e, index) => (
              <View key={e.id || index} style={styles.transactionRow}>
                <View>
                  <Text style={styles.tDate}>
                    {new Date(e.date).toLocaleDateString()}{" "}
                    {new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {e.description ? <Text style={styles.tQty}>{e.description}</Text> : null}
                </View>
                <Text style={[styles.tPrice, { color: Colors.danger }]}>-₹{e.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={(viewMode === "SALES" ? getSortedSales() : getSortedExpenses()) as any[]}
        keyExtractor={(item) => ("name" in item ? item.name : (item as GroupedExpense).type)}
        renderItem={viewMode === "SALES" ? renderSalesGroup : (renderExpenseGroup as any)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
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
              <TouchableOpacity
                style={[styles.tab, filter === "Custom" && styles.activeTab, { flex: 0.8 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={16} color={filter === "Custom" ? Colors.white : Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {filter === "Custom" && (
              <View style={styles.dateLabelRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.dateLabelText}>
                  Showing for: {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.changeDateText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setSelectedDate(date);
                    setFilter("Custom");
                  }
                }}
              />
            )}

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: Colors.blue }]}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={[styles.statValue, { color: Colors.blue }]}>{formatCurrency(stats.revenue)}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
                <Text style={styles.statLabel}>Gross Profit</Text>
                <Text style={[styles.statValue, { color: Colors.success }]}>{formatCurrency(stats.grossProfit)}</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: Colors.danger }]}>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statValue, { color: Colors.danger }]}>{formatCurrency(stats.totalExpenses)}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: stats.netProfit >= 0 ? Colors.success : Colors.danger }]}>
                <Text style={styles.statLabel}>Net Profit</Text>
                <Text style={[styles.statValue, { color: stats.netProfit >= 0 ? Colors.success : Colors.danger }]}>
                  {formatCurrency(stats.netProfit)}
                </Text>
                <Text style={styles.statSub}>{profitMargin}% margin</Text>
              </View>
            </View>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === "SALES" && styles.toggleBtnActive]}
                onPress={() => { setViewMode("SALES"); setExpandedItem(null); }}
              >
                <Ionicons name="cart-outline" size={16} color={viewMode === "SALES" ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.toggleText, viewMode === "SALES" && styles.toggleTextActive]}>
                  Sales ({stats.salesCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === "EXPENSES" && styles.toggleBtnActive]}
                onPress={() => { setViewMode("EXPENSES"); setExpandedItem(null); }}
              >
                <MaterialCommunityIcons name="wallet-outline" size={16} color={viewMode === "EXPENSES" ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.toggleText, viewMode === "EXPENSES" && styles.toggleTextActive]}>
                  Expenses ({Object.values(groupedExpenses).reduce((s, g) => s + g.count, 0)})
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === "SALES" && (
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
            )}

            <Text style={styles.sectionHeader}>
              {viewMode === "SALES" ? "Performance by Book" : "Expenses by Category"}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={viewMode === "SALES" ? "receipt-outline" : "wallet-outline"}
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyText}>
              No {viewMode === "SALES" ? "sales" : "expenses"} in this period
            </Text>
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
    marginBottom: 12,
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
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
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
  statSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
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
  list: { paddingBottom: 24 },
  groupContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginHorizontal: 16,
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
    alignItems: "center",
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
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  dateLabelText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  changeDateText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginLeft: 4,
  },
});
