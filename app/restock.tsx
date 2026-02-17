import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { db, Book } from "@/lib/db";

export default function Restock() {
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const lowStock = await db.getLowStockBooks();
    setBooks(lowStock);

    const initialOrders: Record<number, string> = {};
    const initialSelected: Record<number, boolean> = {};

    lowStock.forEach((b) => {
      const target = b.targetStock || 5;
      const needed = Math.max(0, target - b.stock);
      initialOrders[b.id] = needed.toString();
      initialSelected[b.id] = true;
    });

    setOrders(initialOrders);
    setSelected(initialSelected);
  };

  const handleQtyChange = (id: number, text: string) => {
    setOrders((prev) => ({ ...prev, [id]: text }));
  };

  const toggleSelection = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateOrder = async () => {
    let message = "*Book Reorder List*\n";
    message += "_Automated Order_\n\n";

    let hasItems = false;
    books.forEach((b) => {
      if (!selected[b.id]) return;
      const qty = orders[b.id];
      if (qty && parseInt(qty) > 0) {
        message += `- ${b.name}: *${qty} pcs*\n`;
        hasItems = true;
      }
    });

    if (!hasItems) {
      Alert.alert("No Items", "No items selected to order!");
      return;
    }

    try {
      await Share.share({ message });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (error.message) {
        Alert.alert("Error", error.message);
      }
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const renderItem = ({ item }: { item: Book }) => {
    const isSelected = !!selected[item.id];
    return (
      <TouchableOpacity
        style={[styles.card, !isSelected && styles.cardDisabled]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.85}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Ionicons name="checkmark" size={16} color={Colors.white} />}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.name, !isSelected && styles.textDisabled]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.sub}>
            Current:{" "}
            <Text
              style={{
                color: isSelected ? Colors.danger : Colors.textTertiary,
                fontFamily: "Inter_700Bold",
              }}
            >
              {item.stock}
            </Text>
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.orderLabel}>Order:</Text>
          <TextInput
            style={[styles.qtyInput, !isSelected && styles.inputDisabled]}
            keyboardType="numeric"
            value={orders[item.id]}
            onChangeText={(t) => handleQtyChange(item.id, t)}
            editable={isSelected}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="clipboard-outline" size={22} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Review Restock Needs</Text>
            <Text style={styles.headerSub}>
              {books.length} items below target stock
            </Text>
          </View>
          {selectedCount > 0 && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedCount} selected</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={books}
        keyExtractor={(b) => b.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyText}>All stocked up!</Text>
            <Text style={styles.emptySub}>No items need restocking</Text>
          </View>
        }
      />

      {books.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.shareBtn} onPress={generateOrder} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={20} color={Colors.white} />
            <Text style={styles.shareText}>Share Order List</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
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
  headerTitle: {
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
  selectedBadge: {
    backgroundColor: Colors.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.blue,
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderLeftColor: Colors.border,
    elevation: 0,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.blue,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  textDisabled: { color: Colors.textTertiary },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  qtyInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 8,
    width: 56,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    backgroundColor: Colors.surface,
    color: Colors.text,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    color: Colors.textTertiary,
    borderColor: Colors.borderLight,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  shareBtn: {
    backgroundColor: Colors.whatsappGreen,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  shareText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
