import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { db, Expense, EXPENSE_CATEGORIES } from "@/lib/db";

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({ type: "Misc", amount: "", description: "" });
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const loadExpenses = useCallback(async () => {
    const data = await db.getAllExpenses();
    setExpenses(data);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const openAddModal = () => {
    setEditingExpense(null);
    setForm({ type: "Misc", amount: "", description: "" });
    setShowAddModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      type: expense.type,
      amount: expense.amount.toString(),
      description: expense.description,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    try {
      if (editingExpense) {
        await db.updateExpense({
          ...editingExpense,
          type: form.type,
          amount,
          description: form.description,
        });
      } else {
        await db.addExpense({
          type: form.type,
          amount,
          description: form.description,
          date: new Date().toISOString(),
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddModal(false);
      loadExpenses();
    } catch {
      Alert.alert("Error", "Failed to save expense");
    }
  };

  const confirmDelete = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      `Delete this ${expense.type} expense of ₹${expense.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await db.deleteExpense(expense.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadExpenses();
          },
        },
      ]
    );
  };

  const getCategoryIcon = (type: string): string => {
    const map: Record<string, string> = {
      Food: "restaurant-outline",
      Rent: "home-outline",
      Fuel: "car-outline",
      Utilities: "flash-outline",
      Stationery: "pencil-outline",
      Transport: "bus-outline",
    };
    return map[type] || "receipt-outline";
  };

  const getCategoryColor = (type: string): string => {
    const map: Record<string, string> = {
      Food: "#E67E22",
      Rent: "#9B59B6",
      Fuel: "#E74C3C",
      Utilities: "#3498DB",
      Stationery: "#1ABC9C",
      Transport: "#F39C12",
    };
    return map[type] || Colors.textSecondary;
  };

  const renderExpense = ({ item }: { item: Expense }) => {
    const color = getCategoryColor(item.type);
    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
          <Ionicons name={getCategoryIcon(item.type) as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.cardRow}>
            <Text style={styles.cardType}>{item.type}</Text>
            <Text style={[styles.cardAmount, { color }]}>
              -₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
          </View>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={styles.cardDate}>
            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEditModal(item)}>
            <Feather name="edit-2" size={16} color={Colors.blue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={{ marginLeft: 14 }}>
            <Feather name="trash-2" size={16} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryInner}>
          <MaterialCommunityIcons name="wallet-outline" size={22} color={Colors.danger} />
          <View>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>
              ₹{totalExpenses.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.summaryCount}>
            <Text style={styles.summaryCountText}>{expenses.length} records</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadExpenses(); }}
            tintColor={Colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No expenses recorded</Text>
            <Text style={styles.emptySub}>Tap + to add your first expense</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </Text>

            <Text style={styles.inputLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Ionicons name={getCategoryIcon(form.type) as any} size={18} color={getCategoryColor(form.type)} />
              <Text style={styles.categorySelectorText}>{form.type}</Text>
              <Feather name="chevron-down" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              value={form.amount}
              onChangeText={(t) => setForm((p) => ({ ...p, amount: t }))}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 60, textAlignVertical: "top" }]}
              placeholder="What was this for?"
              placeholderTextColor={Colors.textTertiary}
              value={form.description}
              onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {editingExpense ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showCategoryPicker}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={styles.modalView} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {EXPENSE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catOption, form.type === cat && styles.catOptionActive]}
                onPress={() => {
                  setForm((p) => ({ ...p, type: cat }));
                  setShowCategoryPicker(false);
                }}
              >
                <Ionicons name={getCategoryIcon(cat) as any} size={18} color={getCategoryColor(cat)} />
                <Text style={[styles.catOptionText, form.type === cat && styles.catOptionTextActive]}>
                  {cat}
                </Text>
                {form.type === cat && <Ionicons name="checkmark" size={18} color={Colors.blue} />}
              </TouchableOpacity>
            ))}
            <View style={styles.customCatRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Custom category..."
                placeholderTextColor={Colors.textTertiary}
                value={customCategory}
                onChangeText={setCustomCategory}
              />
              <TouchableOpacity
                style={styles.customCatBtn}
                onPress={() => {
                  if (customCategory.trim()) {
                    setForm((p) => ({ ...p, type: customCategory.trim() }));
                    setCustomCategory("");
                    setShowCategoryPicker(false);
                  }
                }}
              >
                <Ionicons name="checkmark" size={20} color={Colors.white} />
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
  summaryBar: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.danger,
  },
  summaryCount: {
    marginLeft: "auto",
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryCountText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  cardAmount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
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
  emptySub: {
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
    backgroundColor: Colors.danger,
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
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
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  categorySelectorText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
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
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  catOptionActive: {
    backgroundColor: Colors.blueLight,
  },
  catOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  catOptionTextActive: {
    color: Colors.blue,
    fontFamily: "Inter_600SemiBold",
  },
  customCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  customCatBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
