import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { getAllRecords, searchRecords, MoneyRecord } from "./services/database";
import { Link } from "expo-router";

export default function RecordsScreen() {
  const [records, setRecords] = useState<MoneyRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const data = await getAllRecords();
    setRecords(data);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      const results = await searchRecords(text);
      setRecords(results);
    } else {
      loadRecords();
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const renderItem = ({ item }: { item: MoneyRecord }) => (
    <View style={styles.recordItem}>
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      <View style={styles.recordInfo}>
        <Text style={styles.recipient}>{item.recipient}</Text>
        <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/" style={styles.backButton}>
          <Text>← Quay lại</Text>
        </Link>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên người nhận/gửi..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={(item) => item.id?.toString() || ""}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  recordInfo: {
    flex: 1,
  },
  recipient: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  amount: {
    fontSize: 14,
    color: "#2ecc71",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
});
