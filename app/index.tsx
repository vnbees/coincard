import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import * as FileSystem from "expo-file-system";

export default function App() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
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

  const analyzePhoto = async (uri: string) => {
    try {
      setAnalyzing(true);
      const startTime = Date.now();

      // Measure base64 conversion time
      const base64StartTime = Date.now();
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const base64Time = Date.now() - base64StartTime;
      console.log("Base64 conversion time:", base64Time, "ms");

      // Measure API call time
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

      // Log server-side timing if available
      if (data.timing) {
        console.log("Server processing time:", data.timing.totalTime, "ms");
        console.log(
          "Vertex AI processing time:",
          data.timing.vertexAiProcessingTime,
          "ms"
        );
      }

      const totalTime = Date.now() - startTime;
      console.log("Total client-side processing time:", totalTime, "ms");

      setAnalysis(
        `${
          data.result
        }\n\nThời gian xử lý:\nTổng thời gian: ${totalTime}ms\nChuyển đổi ảnh: ${base64Time}ms\nGọi API: ${apiResponseTime}ms${
          data.timing
            ? `\nXử lý server: ${data.timing.totalTime}ms\nXử lý Vertex AI: ${data.timing.vertexAiProcessingTime}ms`
            : ""
        }`
      );
    } catch (error) {
      console.error("Failed to analyze photo:", error);
      setAnalysis("Không thể phân tích ảnh. Vui lòng thử lại.");
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

  const retakePhoto = () => {
    setPhoto(null);
    setAnalysis("");
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
            <Text style={styles.analysisText}>{analysis}</Text>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={retakePhoto}>
            <Text style={styles.text}>Chụp lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 15,
    borderRadius: 10,
  },
  analysisText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
});
