import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import {
  initDatabase,
  saveRecord,
  getAllHashtags,
  addNewHashtags,
} from "../services/database";
import { FontAwesome } from "@expo/vector-icons";

interface AnalysisResult {
  amount: number;
  recipient: string;
}

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [editableRecipient, setEditableRecipient] = useState("");
  const [editableAmount, setEditableAmount] = useState("");
  const [newHashtag, setNewHashtag] = useState("");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [availableHashtags, setAvailableHashtags] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    initDatabase();
    loadHashtags();
  }, []);

  const loadHashtags = async () => {
    try {
      const hashtags = await getAllHashtags();
      setAvailableHashtags(hashtags);
    } catch (error) {
      console.error("Error loading hashtags:", error);
    }
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Ứng dụng cần quyền truy cập camera</Text>
        <Button onPress={requestPermission} title="Cấp quyền" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  // Format a number as currency with commas (e.g., 1000 -> 1,000)
  const formatMoney = (value: string): string => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/[^0-9]/g, "");

    // Convert to number and format with commas
    if (cleanValue) {
      const number = parseInt(cleanValue, 10);
      return number.toLocaleString("en-US");
    }
    return "";
  };

  // Parse formatted money string back to a number
  const parseFormattedMoney = (value: string): number => {
    return Number(value.replace(/,/g, ""));
  };

  const parseAnalysisResponse = (text: string): AnalysisResult => {
    const amountMatch = text.match(/Amount: ([\d,]+)/);
    const recipientMatch = text.match(/Recipient: ([^,]+)/);

    let amount = 0;
    if (amountMatch) {
      const rawAmount = amountMatch[1].replace(/,/g, "");
      amount = Number(rawAmount);

      // Fix for Vietnamese currency - adjust short numbers
      // In Vietnam, common amounts are in thousands, so small numbers likely need conversion
      // Only apply this logic for amounts less than 1000 (likely missing thousands/millions)
      if (amount > 0 && amount < 1000) {
        amount *= 1000; // Convert to thousands
      }
      // For numbers between 1000-10000, check if they might be in millions
      else if (amount >= 1000 && amount < 10000) {
        // Most transactions in Vietnam are at least tens of thousands
        if (amount < 1000000) {
          amount *= 1000; // Convert to thousands
        }
      }
    }

    const recipient = recipientMatch ? recipientMatch[1].trim() : "Not found";

    return { amount, recipient };
  };

  const analyzePhoto = async (uri: string) => {
    try {
      setAnalyzing(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(
        "https://us-central1-coincard-bd6c8.cloudfunctions.net/analyzeMoneyInImage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64,
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const result = parseAnalysisResponse(data.result);
      setAnalysisResult(result);
      setEditableRecipient(
        result.recipient !== "Not found" ? result.recipient : ""
      );
      setEditableAmount(result.amount.toString());
    } catch (error) {
      Alert.alert("Lỗi", "Không thể phân tích ảnh. Vui lòng thử lại.");
    } finally {
      setAnalyzing(false);
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const result = await cameraRef.current.takePictureAsync();
        if (result?.uri) {
          setPhoto(result.uri);
          await analyzePhoto(result.uri);
        }
      } catch (error) {
        Alert.alert("Lỗi", "Không thể chụp ảnh. Vui lòng thử lại.");
      }
    }
  };

  const saveAndContinue = async () => {
    if (!photo || !editableAmount) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
      // Save the record with hashtags
      await saveRecord({
        recipient: editableRecipient || "Unknown",
        amount: parseFormattedMoney(editableAmount),
        imageUri: photo,
        createdAt: new Date().toISOString(),
        hashtags: selectedHashtags,
      });

      // If we have any new hashtags, save them
      if (selectedHashtags.length > 0) {
        await addNewHashtags(selectedHashtags);
      }

      Alert.alert("Thành công", "Đã lưu thông tin thành công.", [
        {
          text: "Chụp ảnh mới",
          onPress: () => {
            // Reset state for a new photo
            setPhoto(null);
            setAnalysisResult(null);
            setEditableRecipient("");
            setEditableAmount("");
            setSelectedHashtags([]);
          },
        },
        {
          text: "Về danh sách",
          onPress: () => router.push("/(tabs)/records"),
        },
      ]);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu thông tin. Vui lòng thử lại.");
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setAnalysisResult(null);
    setEditableRecipient("");
    setEditableAmount("");
  };

  const handleHashtagSelect = (hashtag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(hashtag)
        ? prev.filter((h) => h !== hashtag)
        : [...prev, hashtag]
    );
  };

  const handleAddHashtag = async () => {
    if (!newHashtag.trim()) return;

    const hashtag = newHashtag.trim();
    try {
      await addNewHashtags([hashtag]);
      setAvailableHashtags((prev) => [...prev, hashtag]);
      setNewHashtag("");
    } catch (error) {
      console.error("Error adding hashtag:", error);
    }
  };

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.camera} />
        {analyzing ? (
          <View style={styles.analysisContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.analysisText}>Đang phân tích ảnh...</Text>
          </View>
        ) : (
          <View style={styles.analysisContainer}>
            <TextInput
              style={styles.input}
              placeholder="Tên người nhận/gửi"
              value={editableRecipient}
              onChangeText={setEditableRecipient}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Số tiền"
              value={formatMoney(editableAmount)}
              onChangeText={setEditableAmount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <View style={styles.hashtagsContainer}>
              <Text style={styles.hashtagsLabel}>Hashtags:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hashtagsList}
              >
                {selectedHashtags.map((hashtag) => (
                  <TouchableOpacity
                    key={hashtag}
                    style={styles.hashtagItem}
                    onPress={() => handleHashtagSelect(hashtag)}
                  >
                    <Text style={styles.hashtagText}>{hashtag}</Text>
                    <FontAwesome
                      name="times"
                      size={14}
                      color="white"
                      style={styles.hashtagIcon}
                    />
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.inputHashtag}
                  placeholder="Thêm hashtag mới"
                  value={newHashtag}
                  onChangeText={setNewHashtag}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.addHashtagButton}
                  onPress={handleAddHashtag}
                >
                  <Text style={styles.addHashtagButtonText}>Thêm</Text>
                </TouchableOpacity>
              </ScrollView>

              {availableHashtags.length > 0 && (
                <View style={styles.availableHashtagsContainer}>
                  <Text style={styles.availableHashtagsLabel}>
                    Hashtag đã có:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.availableHashtagsList}
                  >
                    {availableHashtags
                      .filter((tag) => !selectedHashtags.includes(tag))
                      .map((hashtag) => (
                        <TouchableOpacity
                          key={hashtag}
                          style={styles.availableHashtagItem}
                          onPress={() => handleHashtagSelect(hashtag)}
                        >
                          <Text style={styles.availableHashtagText}>
                            {hashtag}
                          </Text>
                          <FontAwesome
                            name="plus"
                            size={14}
                            color="#3498db"
                            style={styles.hashtagIcon}
                          />
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={retakePhoto}
              >
                <Text style={styles.buttonText}>Chụp lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={saveAndContinue}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Lưu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.recordsButton}
        onPress={() => router.push("/(tabs)/records")}
      >
        <FontAwesome
          name="list"
          size={20}
          color="white"
          style={styles.recordsIcon}
        />
        <Text style={styles.recordsButtonText}>Xem danh sách</Text>
      </TouchableOpacity>
      {isFocused && (
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.text}>Lật camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.captureButton]}
              onPress={takePhoto}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  button: {
    alignItems: "center",
    padding: 15,
  },
  captureButton: {
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 50,
    padding: 5,
    marginBottom: 20,
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "white",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  analysisContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 10,
  },
  analysisText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  hashtagsContainer: {
    marginBottom: 12,
  },
  hashtagsLabel: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
  },
  hashtagsList: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  hashtagItem: {
    backgroundColor: "#2ecc71",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  hashtagText: {
    color: "white",
    fontSize: 14,
    marginRight: 4,
  },
  hashtagIcon: {
    marginLeft: 4,
  },
  inputHashtag: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
    minWidth: 120,
  },
  addHashtagButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addHashtagButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  secondaryButton: {
    backgroundColor: "#666",
    borderRadius: 8,
    padding: 15,
    flex: 1,
    marginRight: 10,
  },
  primaryButton: {
    backgroundColor: "#2ecc71",
    borderRadius: 8,
    padding: 15,
    flex: 1,
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  primaryButtonText: {
    color: "white",
  },
  recordsButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  recordsIcon: {
    marginRight: 8,
  },
  recordsButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  availableHashtagsContainer: {
    marginTop: 12,
  },
  availableHashtagsLabel: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
  },
  availableHashtagsList: {
    flexDirection: "row",
    flexWrap: "nowrap",
  },
  availableHashtagItem: {
    backgroundColor: "#34495e",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  availableHashtagText: {
    color: "white",
    fontSize: 14,
    marginRight: 4,
  },
});
