import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
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
} from "react-native";
import { Link, router } from "expo-router";
import * as FileSystem from "expo-file-system";
import { saveRecord } from "./services/database";

interface AnalysisResult {
  amount: number;
  recipient: string;
}

export default function App() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [editableRecipient, setEditableRecipient] = useState("");
  const [editableAmount, setEditableAmount] = useState("");
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  const parseAnalysisResponse = (text: string): AnalysisResult => {
    // Expected format: "Amount: [amount], Recipient: [name]"
    const amountMatch = text.match(/Amount: ([\d,]+)/);
    const recipientMatch = text.match(/Recipient: ([^,]+)/);

    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
    const recipient = recipientMatch ? recipientMatch[1].trim() : "Not found";

    return { amount, recipient };
  };

  const analyzePhoto = async (uri: string) => {
    try {
      setAnalyzing(true);
      const startTime = Date.now();

      const base64StartTime = Date.now();
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const base64Time = Date.now() - base64StartTime;
      console.log("Base64 conversion time:", base64Time, "ms");

      const apiStartTime = Date.now();
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
      const apiResponseTime = Date.now() - apiStartTime;
      console.log("API call time:", apiResponseTime, "ms");

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
      console.error("Failed to analyze photo:", error);
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
        console.error("Failed to take photo:", error);
      }
    }
  };

  const saveAndContinue = async () => {
    if (!photo || !editableAmount) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
      const record = {
        recipient: editableRecipient || "Unknown",
        amount: Number(editableAmount),
        imageUri: photo,
        createdAt: new Date().toISOString(),
      };
      console.log("Saving record:", record);

      await saveRecord(record);
      console.log("Record saved successfully");

      Alert.alert("Thành công", "Đã lưu thông tin thành công.", [
        {
          text: "OK",
          onPress: () => {
            console.log("Navigating to records screen");
            router.push("/(tabs)/records");
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to save record:", error);
      Alert.alert("Lỗi", "Không thể lưu thông tin. Vui lòng thử lại.");
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setAnalysisResult(null);
    setEditableRecipient("");
    setEditableAmount("");
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
              value={editableAmount}
              onChangeText={setEditableAmount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
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
      <Link href="/(tabs)/records" asChild>
        <TouchableOpacity style={styles.recordsButton}>
          <Text style={styles.recordsButtonText}>Xem danh sách</Text>
        </TouchableOpacity>
      </Link>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
    top: 20,
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
    padding: 10,
    borderRadius: 8,
  },
  recordsButtonText: {
    color: "white",
    fontSize: 14,
  },
});
