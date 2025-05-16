import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import {
  getAllRecords,
  searchRecords,
  saveRecord,
  MoneyRecord,
} from "../services/database";
import { useFocusEffect } from "@react-navigation/native";

export default function RecordsScreen() {
  const [records, setRecords] = React.useState<MoneyRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const loadRecords = async (query: string = "") => {
    try {
      const data = query ? await searchRecords(query) : await getAllRecords();
      console.log("Loaded records:", data);
      setRecords(data);
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(searchQuery);
    setRefreshing(false);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadRecords(searchQuery);
    }, [searchQuery])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleAddRecord = async () => {
    if (!newRecipient || !newAmount) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
      const amountNumber = parseFloat(
        newAmount.replace(/\./g, "").replace(/,/g, ".")
      );

      if (isNaN(amountNumber)) {
        Alert.alert("Lỗi", "Số tiền không hợp lệ.");
        return;
      }

      const record = {
        recipient: newRecipient,
        amount: amountNumber,
        imageUri: "https://via.placeholder.com/150/2ecc71/FFFFFF?text=VND",
        createdAt: new Date().toISOString(),
      };

      await saveRecord(record);
      Alert.alert("Thành công", "Đã thêm giao dịch mới thành công.");

      // Reset form and close modal
      setNewRecipient("");
      setNewAmount("");
      setModalVisible(false);

      // Refresh the list
      loadRecords(searchQuery);
    } catch (error) {
      console.error("Error adding record:", error);
      Alert.alert("Lỗi", "Không thể thêm giao dịch. Vui lòng thử lại.");
    }
  };

  const renderItem = ({ item }: { item: MoneyRecord }) => (
    <View style={styles.recordItem}>
      <Image source={{ uri: item.imageUri }} style={styles.recordImage} />
      <View style={styles.recordInfo}>
        <Text style={styles.recipientText}>{item.recipient}</Text>
        <Text style={styles.amountText}>
          {item.amount.toLocaleString()} VND
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm theo tên..."
        value={searchQuery}
        onChangeText={handleSearch}
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Thêm giao dịch mới</Text>
      </TouchableOpacity>
      <FlatList
        style={styles.list}
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || item.createdAt}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Modal để thêm giao dịch mới */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Giao Dịch Mới</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên người nhận/gửi"
              value={newRecipient}
              onChangeText={setNewRecipient}
            />

            <TextInput
              style={styles.input}
              placeholder="Số tiền"
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="numeric"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleAddRecord}
              >
                <Text style={styles.buttonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    marginTop: 60,
  },
  list: {
    flex: 1,
  },
  recordItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  recordImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recipientText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  amountText: {
    fontSize: 14,
    color: "#2ecc71",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  addButton: {
    backgroundColor: "#2ecc71",
    borderRadius: 8,
    padding: 12,
    margin: 16,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  saveButton: {
    backgroundColor: "#2ecc71",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
