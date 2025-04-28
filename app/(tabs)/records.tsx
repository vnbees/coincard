import React, { useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  RefreshControl,
} from "react-native";
import {
  getAllRecords,
  searchRecords,
  MoneyRecord,
} from "../services/database";
import { useFocusEffect } from "@react-navigation/native";

export default function RecordsScreen() {
  const [records, setRecords] = React.useState<MoneyRecord[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

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
      <FlatList
        style={styles.list}
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || item.createdAt}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
});
