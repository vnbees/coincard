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
  ScrollView,
} from "react-native";
import {
  getAllRecords,
  searchRecords,
  saveRecord,
  MoneyRecord,
  getAllHashtags,
  addNewHashtags,
} from "../services/database";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";

export default function RecordsScreen() {
  const [records, setRecords] = React.useState<MoneyRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newHashtag, setNewHashtag] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [availableHashtags, setAvailableHashtags] = useState<string[]>([]);
  const [activeHashtagFilter, setActiveHashtagFilter] = useState<string | null>(
    null
  );

  const loadRecords = async (query: string = "") => {
    try {
      let data = query ? await searchRecords(query) : await getAllRecords();

      // Filter records by hashtag if a filter is active
      if (activeHashtagFilter) {
        data = data.filter(
          (record) =>
            record.hashtags && record.hashtags.includes(activeHashtagFilter)
        );
      }

      setRecords(data);
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  const loadHashtags = async () => {
    try {
      const hashtags = await getAllHashtags();
      setAvailableHashtags(hashtags);
    } catch (error) {
      console.error("Error loading hashtags:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords(searchQuery);
    await loadHashtags();
    setRefreshing(false);
  }, [searchQuery, activeHashtagFilter]);

  useFocusEffect(
    useCallback(() => {
      loadRecords(searchQuery);
      loadHashtags();
    }, [searchQuery, activeHashtagFilter])
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleAddHashtag = async () => {
    if (!newHashtag.trim()) return;

    const hashtag = newHashtag.trim();
    try {
      // Add to selected hashtags
      if (!selectedHashtags.includes(hashtag)) {
        setSelectedHashtags((prev) => [...prev, hashtag]);
      }
      setNewHashtag("");
    } catch (error) {
      console.error("Error adding hashtag:", error);
    }
  };

  const handleHashtagSelect = (hashtag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(hashtag)
        ? prev.filter((h) => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const handleHashtagFilter = (hashtag: string | null) => {
    setActiveHashtagFilter(hashtag);
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
        hashtags: selectedHashtags,
      };

      await saveRecord(record);

      // Save the hashtags to the database
      if (selectedHashtags.length > 0) {
        await addNewHashtags(selectedHashtags);
      }

      Alert.alert("Thành công", "Đã thêm giao dịch mới thành công.");

      // Reset form and close modal
      setNewRecipient("");
      setNewAmount("");
      setSelectedHashtags([]);
      setModalVisible(false);

      // Refresh the list
      loadRecords(searchQuery);
      loadHashtags();
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
        {item.hashtags && item.hashtags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {item.hashtags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={styles.tagBadge}
                onPress={() => handleHashtagFilter(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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

      {activeHashtagFilter && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.filterLabel}>Đang lọc theo: </Text>
          <TouchableOpacity style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>{activeHashtagFilter}</Text>
            <TouchableOpacity
              onPress={() => handleHashtagFilter(null)}
              style={styles.clearFilterButton}
            >
              <FontAwesome name="times" size={16} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {availableHashtags.length > 0 && (
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {availableHashtags.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterChip,
                  activeHashtagFilter === tag && styles.activeFilterChip,
                ]}
                onPress={() => handleHashtagFilter(tag)}
              >
                <Text style={styles.filterChipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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

            <View style={styles.hashtagContainer}>
              <Text style={styles.hashtagLabel}>Hashtags:</Text>

              {/* Selected hashtags */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedHashtags}
              >
                {selectedHashtags.map((hashtag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tagBadge}
                    onPress={() => handleHashtagSelect(hashtag)}
                  >
                    <Text style={styles.tagText}>{hashtag}</Text>
                    <FontAwesome
                      name="times"
                      size={12}
                      color="#fff"
                      style={styles.tagRemoveIcon}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* New hashtag input */}
              <View style={styles.newHashtagContainer}>
                <TextInput
                  style={styles.newHashtagInput}
                  placeholder="Thêm hashtag mới"
                  value={newHashtag}
                  onChangeText={setNewHashtag}
                />
                <TouchableOpacity
                  style={styles.newHashtagButton}
                  onPress={handleAddHashtag}
                >
                  <Text style={styles.newHashtagButtonText}>Thêm</Text>
                </TouchableOpacity>
              </View>

              {/* Available hashtags */}
              {availableHashtags.length > 0 && (
                <View>
                  <Text style={styles.availableHashtagsLabel}>
                    Hashtag đã có:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.availableHashtags}
                  >
                    {availableHashtags
                      .filter((tag) => !selectedHashtags.includes(tag))
                      .map((hashtag, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.availableTagBadge}
                          onPress={() => handleHashtagSelect(hashtag)}
                        >
                          <Text style={styles.availableTagText}>{hashtag}</Text>
                          <FontAwesome
                            name="plus"
                            size={12}
                            color="#3498db"
                            style={styles.tagAddIcon}
                          />
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>

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
  hashtagContainer: {
    marginBottom: 16,
  },
  hashtagLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  selectedHashtags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  availableHashtags: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
  },
  tagBadge: {
    backgroundColor: "#2ecc71",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tagText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 4,
  },
  tagRemoveIcon: {
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  activeFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3498db",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  filterLabel: {
    color: "#fff",
    fontSize: 14,
    marginRight: 8,
  },
  activeFilter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2980b9",
    borderRadius: 8,
    padding: 8,
    flex: 1,
    minHeight: 36,
  },
  activeFilterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 4,
  },
  clearFilterButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#e74c3c",
  },
  filtersScrollView: {
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    backgroundColor: "#ecf0f1",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterChip: {
    backgroundColor: "#3498db",
  },
  filterChipText: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  newHashtagContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  newHashtagInput: {
    flex: 1,
    borderWidth: 0,
    marginRight: 8,
  },
  newHashtagButton: {
    backgroundColor: "#2ecc71",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newHashtagButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  availableHashtagsLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  availableTagBadge: {
    backgroundColor: "#3498db",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  availableTagText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 4,
  },
  tagAddIcon: {
    marginLeft: 4,
  },
  filtersWrapper: {
    overflow: "hidden",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
