import React, { useCallback, useState, useEffect } from "react";
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
  updateRecord,
  deleteRecord,
  MoneyRecord,
  getAllHashtags,
  addNewHashtags,
} from "../services/database";
import { useFocusEffect } from "@react-navigation/native";
import { FontAwesome } from "@expo/vector-icons";

// Enum để định nghĩa các kiểu sắp xếp
enum SortOrder {
  DESC = "desc", // Giảm dần
  ASC = "asc", // Tăng dần
  NEWEST = "newest", // Mới nhất
  OLDEST = "oldest", // Cũ nhất
}

export default function RecordsScreen() {
  const [records, setRecords] = React.useState<MoneyRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newHashtag, setNewHashtag] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [availableHashtags, setAvailableHashtags] = useState<string[]>([]);
  const [activeHashtagFilter, setActiveHashtagFilter] = useState<string | null>(
    null
  );
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [currentRecord, setCurrentRecord] = useState<MoneyRecord | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC); // Mặc định sắp xếp giảm dần

  // Tính tổng số tiền mỗi khi danh sách records thay đổi
  useEffect(() => {
    calculateTotalAmount();
  }, [records]);

  const calculateTotalAmount = () => {
    const sum = records.reduce((total, record) => total + record.amount, 0);
    setTotalAmount(sum);
  };

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

      // Sort records based on current sortOrder
      const sortedData = [...data].sort((a, b) => {
        switch (sortOrder) {
          case SortOrder.DESC: // Giảm dần theo số tiền
            return b.amount - a.amount;
          case SortOrder.ASC: // Tăng dần theo số tiền
            return a.amount - b.amount;
          case SortOrder.NEWEST: // Mới nhất (theo ngày)
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          case SortOrder.OLDEST: // Cũ nhất (theo ngày)
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          default:
            return 0;
        }
      });

      setRecords(sortedData);
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

  const handleEditRecord = (record: MoneyRecord) => {
    setCurrentRecord(record);
    setNewRecipient(record.recipient);
    setNewAmount(record.amount.toString());
    setSelectedHashtags(record.hashtags || []);
    setEditModalVisible(true);
  };

  const handleDeleteRecord = (id: number) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa giao dịch này không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRecord(id);
            Alert.alert("Thành công", "Đã xóa giao dịch thành công");
            await loadRecords(searchQuery);
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa giao dịch. Vui lòng thử lại.");
          }
        },
      },
    ]);
  };

  const handleUpdateRecord = async () => {
    if (!currentRecord || !newRecipient || !newAmount) {
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

      const updatedRecord: MoneyRecord = {
        ...currentRecord,
        recipient: newRecipient,
        amount: amountNumber,
        hashtags: selectedHashtags,
      };

      await updateRecord(updatedRecord);
      Alert.alert("Thành công", "Đã cập nhật giao dịch thành công.");

      // Reset form and close modal
      setNewRecipient("");
      setNewAmount("");
      setSelectedHashtags([]);
      setCurrentRecord(null);
      setEditModalVisible(false);

      // Refresh the list
      loadRecords(searchQuery);
      loadHashtags();
    } catch (error) {
      console.error("Error updating record:", error);
      Alert.alert("Lỗi", "Không thể cập nhật giao dịch. Vui lòng thử lại.");
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
      <View style={styles.recordActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditRecord(item)}
        >
          <FontAwesome name="pencil" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRecord(item.id!)}
        >
          <FontAwesome name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Hàm để thay đổi thứ tự sắp xếp
  const handleChangeSortOrder = (newOrder: SortOrder) => {
    setSortOrder(newOrder);
    loadRecords(searchQuery);
  };

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

      {/* UI lựa chọn cách sắp xếp */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sắp xếp:</Text>
        <View style={styles.sortButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortOrder === SortOrder.DESC && styles.activeSortButton,
            ]}
            onPress={() => handleChangeSortOrder(SortOrder.DESC)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === SortOrder.DESC && styles.activeSortButtonText,
              ]}
            >
              Số tiền tăng dần
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortOrder === SortOrder.ASC && styles.activeSortButton,
            ]}
            onPress={() => handleChangeSortOrder(SortOrder.ASC)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === SortOrder.ASC && styles.activeSortButtonText,
              ]}
            >
              Số tiền giảm dần
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortOrder === SortOrder.NEWEST && styles.activeSortButton,
            ]}
            onPress={() => handleChangeSortOrder(SortOrder.NEWEST)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === SortOrder.NEWEST && styles.activeSortButtonText,
              ]}
            >
              Cũ nhất
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortButton,
              sortOrder === SortOrder.OLDEST && styles.activeSortButton,
            ]}
            onPress={() => handleChangeSortOrder(SortOrder.OLDEST)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOrder === SortOrder.OLDEST && styles.activeSortButtonText,
              ]}
            >
              Mới nhất
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nút thêm giao dịch mới */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ Thêm giao dịch mới</Text>
      </TouchableOpacity>

      {/* Hiển thị tổng số tiền */}
      <View style={styles.totalAmountContainer}>
        <Text style={styles.totalAmountLabel}>Tổng số tiền:</Text>
        <Text style={styles.totalAmountValue}>
          {totalAmount.toLocaleString()} VND
        </Text>
      </View>

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

      {/* Modal để sửa giao dịch */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa Giao Dịch</Text>

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
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateRecord}
              >
                <Text style={styles.buttonText}>Cập nhật</Text>
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
  totalAmountContainer: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 16,
  },
  totalAmountLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  totalAmountValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2ecc71",
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    padding: 8,
  },
  sortContainer: {
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sortButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sortButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    backgroundColor: "#ecf0f1",
    alignItems: "center",
  },
  activeSortButton: {
    backgroundColor: "#3498db",
  },
  sortButtonText: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  activeSortButtonText: {
    color: "#fff",
  },
});
