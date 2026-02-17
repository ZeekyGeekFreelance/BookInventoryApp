import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { db } from "@/lib/db";
import { createBackup, shareBackup } from "@/lib/backup-service";
import { pickExcelFile, restoreFromExcel, RestoreResult } from "@/lib/restore-service";

export default function DataManage() {
  const [hasData, setHasData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingFileUri, setPendingFileUri] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [stats, setStats] = useState({ books: 0, sales: 0, expenses: 0 });

  const loadStats = useCallback(async () => {
    const data = await db.getRawData();
    setStats({
      books: data.books.length,
      sales: data.sales.length,
      expenses: data.expenses.length,
    });
    setHasData(data.books.length > 0 || data.sales.length > 0 || data.expenses.length > 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await createBackup();
      if (result.success && result.filePath) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Backup Created",
          `File: ${result.fileName}\n\nWould you like to share it?`,
          [
            { text: "Done", style: "cancel" },
            {
              text: "Share",
              onPress: async () => {
                await shareBackup(result.filePath!);
              },
            },
          ]
        );
      } else {
        if (!result.success) {
          Alert.alert("Export Failed", result.message);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const file = await pickExcelFile();
      if (!file) {
        setIsImporting(false);
        return;
      }

      setPendingFileUri(file.uri);
      setPendingFileName(file.name);

      if (hasData) {
        setShowOverwriteModal(true);
        setIsImporting(false);
        return;
      }

      await performRestore(file.uri);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Import failed");
      setIsImporting(false);
    }
  };

  const performRestore = async (uri: string) => {
    setIsImporting(true);
    setShowOverwriteModal(false);
    try {
      const result = await restoreFromExcel(uri);
      setRestoreResult(result);
      setShowResultModal(true);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      loadStats();
    } catch (error: any) {
      Alert.alert("Restore Error", error?.message || "Unexpected error");
    } finally {
      setIsImporting(false);
      setPendingFileUri(null);
    }
  };

  const handleClearData = () => {
    if (!hasData) {
      Alert.alert("No Data", "There is no data to clear.");
      return;
    }
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all books, sales, and expenses. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            await db.clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            loadStats();
            Alert.alert("Done", "All data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Ionicons name="book-outline" size={16} color={Colors.blue} />
          <Text style={styles.statText}>{stats.books} Books</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="cart-outline" size={16} color={Colors.success} />
          <Text style={styles.statText}>{stats.sales} Sales</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="wallet-outline" size={16} color={Colors.danger} />
          <Text style={styles.statText}>{stats.expenses} Expenses</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Backup</Text>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleExport}
        disabled={isExporting}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.successLight }]}>
          {isExporting ? (
            <ActivityIndicator size="small" color={Colors.success} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.success} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Export to Excel</Text>
          <Text style={styles.actionSub}>
            Create a multi-sheet .xlsx backup of all data
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Restore</Text>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={handleImport}
        disabled={isImporting}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.blueLight }]}>
          {isImporting ? (
            <ActivityIndicator size="small" color={Colors.blue} />
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color={Colors.blue} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionTitle}>Import from Excel</Text>
          <Text style={styles.actionSub}>
            Restore data from a .xlsx backup file
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Danger Zone</Text>
      <TouchableOpacity
        style={[styles.actionCard, { borderLeftWidth: 4, borderLeftColor: Colors.danger }]}
        onPress={handleClearData}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIconWrap, { backgroundColor: Colors.dangerLight }]}>
          <Ionicons name="trash-outline" size={24} color={Colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, { color: Colors.danger }]}>Clear All Data</Text>
          <Text style={styles.actionSub}>
            Permanently delete all books, sales & expenses
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="information-outline" size={18} color={Colors.blue} />
        <Text style={styles.infoText}>
          Backups include 5 sheets: Summary, Books, Sales, Expenses, and Restocks history.
          Always export a backup before clearing data.
        </Text>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showOverwriteModal}
        onRequestClose={() => {
          setShowOverwriteModal(false);
          setIsImporting(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowOverwriteModal(false);
            setIsImporting(false);
          }}
        >
          <Pressable style={styles.modalView} onPress={() => { }}>
            <View style={styles.warningIconWrap}>
              <Ionicons name="warning-outline" size={36} color={Colors.warning} />
            </View>
            <Text style={styles.modalTitle}>Overwrite Data?</Text>
            <Text style={styles.modalDesc}>
              Restoring "{pendingFileName}" will replace all current data
              ({stats.books} books, {stats.sales} sales, {stats.expenses} expenses).{"\n\n"}
              This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setShowOverwriteModal(false);
                  setIsImporting(false);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.danger }]}
                onPress={() => {
                  if (pendingFileUri) performRestore(pendingFileUri);
                }}
              >
                <Text style={styles.modalBtnConfirmText}>Overwrite & Restore</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showResultModal}
        onRequestClose={() => setShowResultModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowResultModal(false)}>
          <Pressable style={styles.modalView} onPress={() => { }}>
            <View style={styles.resultIconWrap}>
              <Ionicons
                name={restoreResult?.success ? "checkmark-circle" : "close-circle"}
                size={48}
                color={restoreResult?.success ? Colors.success : Colors.danger}
              />
            </View>
            <Text style={styles.modalTitle}>
              {restoreResult?.success ? "Restore Complete" : "Restore Failed"}
            </Text>
            <Text style={styles.modalDesc}>{restoreResult?.message}</Text>

            {restoreResult?.imported && (
              <View style={styles.resultStats}>
                <View style={styles.resultStatRow}>
                  <Text style={styles.resultStatLabel}>Books restored:</Text>
                  <Text style={styles.resultStatValue}>{restoreResult.imported.books.added}</Text>
                </View>
                <View style={styles.resultStatRow}>
                  <Text style={styles.resultStatLabel}>Sales restored:</Text>
                  <Text style={styles.resultStatValue}>{restoreResult.imported.sales.added}</Text>
                </View>
                <View style={styles.resultStatRow}>
                  <Text style={styles.resultStatLabel}>Expenses restored:</Text>
                  <Text style={styles.resultStatValue}>{restoreResult.imported.expenses.added}</Text>
                </View>
              </View>
            )}

            {restoreResult?.errors && restoreResult.errors.length > 0 && (
              <View style={styles.errorsBox}>
                <Text style={styles.errorsTitle}>
                  {restoreResult.errors.length} warning(s):
                </Text>
                {restoreResult.errors.slice(0, 5).map((e, i) => (
                  <Text key={i} style={styles.errorItem}>- {e}</Text>
                ))}
                {restoreResult.errors.length > 5 && (
                  <Text style={styles.errorItem}>...and {restoreResult.errors.length - 5} more</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.doneBtn]}
              onPress={() => setShowResultModal(false)}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    marginBottom: 16,
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.blueLight,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
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
  warningIconWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  resultIconWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
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
  resultStats: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resultStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  resultStatLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  resultStatValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  errorsBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.danger,
    marginBottom: 6,
  },
  errorItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.danger,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
