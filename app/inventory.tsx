import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { db, Book } from "@/lib/db";

type SortMode = "NAME" | "STOCK" | "PRICE";

export default function Inventory() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("NAME");

  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [isRestockModalVisible, setIsRestockModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sellPriceInput, setSellPriceInput] = useState("");
  const [sellQty, setSellQty] = useState("1");
  const [restockQty, setRestockQty] = useState("1");

  const loadBooks = useCallback(async () => {
    const data = query.trim()
      ? await db.searchBooks(query)
      : await db.getAllBooks();
    setBooks(data);
    setRefreshing(false);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadBooks();
    }, [loadBooks])
  );

  const getSortedBooks = () => {
    const sorted = [...books];
    switch (sortBy) {
      case "NAME":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "STOCK":
        return sorted.sort((a, b) => a.stock - b.stock);
      case "PRICE":
        return sorted.sort((a, b) => (b.sellPrice || 0) - (a.sellPrice || 0));
      default:
        return sorted;
    }
  };

  const openSellModal = (book: Book) => {
    if (book.stock <= 0) {
      Alert.alert("Out of Stock", "This book is currently out of stock.");
      return;
    }
    setSelectedBook(book);
    setSellQty("1");
    setSellPriceInput((book.sellPrice || 0).toString());
    setIsSellModalVisible(true);
  };

  const openRestockModal = (book: Book) => {
    setSelectedBook(book);
    setRestockQty("1");
    setIsRestockModalVisible(true);
  };

  const confirmSale = async () => {
    if (!selectedBook) return;
    const qty = parseInt(sellQty);
    const totalPrice = parseFloat(sellPriceInput);

    if (!qty || qty <= 0 || isNaN(qty)) {
      Alert.alert("Error", "Enter a valid quantity");
      return;
    }
    if (qty > selectedBook.stock) {
      Alert.alert("Error", `Only ${selectedBook.stock} in stock!`);
      return;
    }
    if (!totalPrice || isNaN(totalPrice)) {
      Alert.alert("Error", "Enter a valid price");
      return;
    }

    await db.recordSale(selectedBook.id, qty, totalPrice, selectedBook.costPrice, selectedBook.name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSellModalVisible(false);
    loadBooks();
  };

  const confirmRestock = async () => {
    if (!selectedBook) return;
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0 || isNaN(qty)) {
      Alert.alert("Error", "Enter a valid quantity");
      return;
    }

    await db.updateStock(selectedBook.id, qty);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRestockModalVisible(false);
    loadBooks();
  };

  const confirmDelete = (book: Book) => {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to delete "${book.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await db.deleteBook(book.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadBooks();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Book }) => {
    const target = item.targetStock || 5;
    const isLowStock = item.stock <= target;
    return (
      <View style={[styles.card, isLowStock && styles.lowStockCard]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.bookAuthor}>{item.author || "Unknown Author"}</Text>
          </View>
          <View style={styles.miniActions}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/add-book", params: { bookId: item.id.toString() } })}
            >
              <Feather name="edit-2" size={18} color={Colors.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={{ marginLeft: 16 }}>
              <Feather name="trash-2" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.bookPrice}>₹{(item.sellPrice || 0).toFixed(2)}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.stockContainer}>
            <Text style={[styles.stockLabel, isLowStock && styles.lowStockText]}>
              Stock: {item.stock}
            </Text>
            {isLowStock && (
              <View style={styles.lowBadge}>
                <Text style={styles.lowBadgeText}>LOW</Text>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSell]}
              onPress={() => openSellModal(item)}
            >
              <Ionicons name="cart-outline" size={14} color={Colors.white} />
              <Text style={styles.btnText}>Sell</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnRestock]}
              onPress={() => openRestockModal(item)}
            >
              <Ionicons name="add-circle-outline" size={14} color={Colors.white} />
              <Text style={styles.btnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const SortChip = ({ label, value }: { label: string; value: SortMode }) => (
    <TouchableOpacity
      style={[styles.chip, sortBy === value && styles.chipActive]}
      onPress={() => setSortBy(value)}
    >
      <Text style={[styles.chipText, sortBy === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Feather name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or author..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <SortChip label="Name" value="NAME" />
          <SortChip label="Stock" value="STOCK" />
          <SortChip label="Price" value="PRICE" />
        </View>
      </View>

      <FlatList
        data={getSortedBooks()}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadBooks();
            }}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No books found</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first book</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/add-book")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={isSellModalVisible}
        onRequestClose={() => setIsSellModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsSellModalVisible(false)}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>Sell: {selectedBook?.name}</Text>
            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={sellQty}
                  onChangeText={(t) => {
                    setSellQty(t);
                    if (selectedBook && t && !isNaN(Number(t))) {
                      setSellPriceInput(
                        (parseFloat(t) * (selectedBook.sellPrice || 0)).toString()
                      );
                    }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Total Price (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={sellPriceInput}
                  onChangeText={setSellPriceInput}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsSellModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmSale}
              >
                <Text style={styles.modalBtnConfirmText}>Confirm Sale</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isRestockModalVisible}
        onRequestClose={() => setIsRestockModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsRestockModalVisible(false)}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>Restock: {selectedBook?.name}</Text>
            <Text style={styles.inputLabel}>Quantity to Add</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={restockQty}
              onChangeText={setRestockQty}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setIsRestockModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.success }]}
                onPress={confirmRestock}
              >
                <Text style={styles.modalBtnConfirmText}>Add Stock</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    paddingVertical: 12,
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  sortLabel: {
    marginRight: 10,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  lowStockCard: {
    borderLeftColor: Colors.danger,
    backgroundColor: "#FFFBFB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  miniActions: { flexDirection: "row", alignItems: "center" },
  bookTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  bookAuthor: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bookPrice: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.blue,
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  stockContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  stockLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  lowStockText: {
    color: Colors.danger,
  },
  lowBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lowBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.danger,
  },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  btnSell: { backgroundColor: Colors.blue },
  btnRestock: { backgroundColor: Colors.success },
  btnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalView: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: Colors.surfaceSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.blue,
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
