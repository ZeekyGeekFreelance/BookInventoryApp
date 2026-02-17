import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { db, Book, Sale } from "@/lib/db";

interface StockItem extends Book {
  totalValue: number;
}

export default function StatsDetail() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const navigation = useNavigation();
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: type === "STOCK" ? "Stock Value" : "Sales History",
    });
    loadData();
  }, [type]);

  const loadData = async () => {
    if (type === "STOCK") {
      const data = await db.getStockValueBreakdown();
      setStockData(data);
    } else {
      const data = await db.getSalesHistory();
      setSalesData(data);
    }
  };

  const renderStockItem = ({ item }: { item: StockItem }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sub}>
            {item.stock} pcs x ₹{item.costPrice?.toFixed(2)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.value, { color: Colors.blue }]}>
            ₹{item.totalValue?.toFixed(2)}
          </Text>
          <Text style={styles.label}>TOTAL VALUE</Text>
        </View>
      </View>
    </View>
  );

  const renderSaleItem = ({ item }: { item: Sale }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{item.bookName}</Text>
          <Text style={styles.sub}>{new Date(item.date).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.value, { color: Colors.success }]}>
            +₹{item.profit?.toFixed(2)}
          </Text>
          <Text style={styles.label}>PROFIT ({item.qty} qty)</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Ionicons
            name={type === "STOCK" ? "cube-outline" : "trending-up"}
            size={22}
            color={type === "STOCK" ? Colors.blue : Colors.success}
          />
          <View>
            <Text style={styles.header}>
              {type === "STOCK" ? "Stock Value Breakdown" : "Sales Profit History"}
            </Text>
            <Text style={styles.headerSub}>
              {type === "STOCK"
                ? "Sorted by highest value"
                : "Most recent transactions first"}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={type === "STOCK" ? stockData : salesData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={type === "STOCK" ? renderStockItem as any : renderSaleItem as any}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No data available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  value: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
