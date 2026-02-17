import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { db, Book } from "@/lib/db";

export default function AddBook() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const navigation = useNavigation();
  const isEditMode = !!bookId;

  const [form, setForm] = useState({
    name: "",
    author: "",
    stock: "",
    costPrice: "",
    sellPrice: "",
    targetStock: "5",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: "Edit Book" });
      loadBook();
    }
  }, [bookId]);

  const loadBook = async () => {
    const books = await db.getAllBooks();
    const book = books.find((b) => b.id === parseInt(bookId!));
    if (book) {
      setForm({
        name: book.name,
        author: book.author,
        stock: book.stock.toString(),
        costPrice: book.costPrice.toString(),
        sellPrice: book.sellPrice.toString(),
        targetStock: (book.targetStock || 5).toString(),
      });
    }
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.stock || !form.costPrice || !form.sellPrice) {
      Alert.alert("Missing Fields", "Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const bookData = {
        name: form.name,
        author: form.author,
        stock: parseInt(form.stock) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        sellPrice: parseFloat(form.sellPrice) || 0,
        targetStock: parseInt(form.targetStock) || 5,
        isbn: "",
      };

      if (isEditMode) {
        await db.updateBook({ ...bookData, id: parseInt(bookId!) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Book updated successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await db.addBook(bookData);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Book added successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to save book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={18} color={Colors.blue} />
          <Text style={styles.sectionTitle}>Book Details</Text>
        </View>

        <Text style={styles.inputLabel}>Book Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Alchemist"
          placeholderTextColor={Colors.textTertiary}
          value={form.name}
          onChangeText={(t) => handleChange("name", t)}
        />

        <Text style={styles.inputLabel}>Author</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Paulo Coelho"
          placeholderTextColor={Colors.textTertiary}
          value={form.author}
          onChangeText={(t) => handleChange("author", t)}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="layers-outline" size={18} color={Colors.success} />
          <Text style={styles.sectionTitle}>Stock Information</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Current Stock *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={form.stock}
              onChangeText={(t) => handleChange("stock", t)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Min Target</Text>
            <TextInput
              style={styles.input}
              placeholder="5"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={form.targetStock}
              onChangeText={(t) => handleChange("targetStock", t)}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="pricetag-outline" size={18} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Pricing (₹)</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Cost Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={form.costPrice}
              onChangeText={(t) => handleChange("costPrice", t)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Selling Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={form.sellPrice}
              onChangeText={(t) => handleChange("sellPrice", t)}
            />
          </View>
        </View>

        {form.costPrice && form.sellPrice && (
          <View style={styles.profitBanner}>
            <Ionicons name="trending-up" size={16} color={Colors.success} />
            <Text style={styles.profitText}>
              Margin: ₹{(parseFloat(form.sellPrice || "0") - parseFloat(form.costPrice || "0")).toFixed(2)} per unit
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isEditMode ? "checkmark-circle" : "add-circle"}
          size={20}
          color={Colors.white}
        />
        <Text style={styles.submitText}>
          {isEditMode ? "Update Book" : "Add Book"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  profitBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.successLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  profitText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  submitText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
