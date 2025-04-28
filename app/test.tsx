import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator } from "react-native";

const Test = () => {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callVertexAIApi = async () => {
    setLoading(true);
    setError("");
    setResult("");

    // Thay thế bằng URL Firebase Function của bạn
    const apiUrl =
      "https://us-central1-coincard-bd6c8.cloudfunctions.net/callVertexAI";

    try {
      const response = await fetch(apiUrl, {
        method: "POST", // Hoặc 'GET' nếu bạn truyền prompt qua query parameters
        headers: {
          "Content-Type": "application/json", // Nếu bạn gửi prompt trong body
        },
        body: JSON.stringify({ prompt }), // Nếu bạn gửi prompt trong body
        // Hoặc bạn có thể truyền prompt qua query parameters như sau:
        // method: 'GET',
        // body: null,
      });

      console.log(response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Đã có lỗi xảy ra khi gọi API.");
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Kết quả từ Vertex AI:", error);
  }, [error]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Kết nối React Native với Vertex AI qua Firebase Function
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "gray",
          width: "80%",
          marginBottom: 10,
          padding: 10,
        }}
        placeholder="Nhập prompt của bạn"
        value={prompt}
        onChangeText={setPrompt}
      />
      <Button
        title="Gửi Prompt"
        onPress={callVertexAIApi}
        disabled={loading || !prompt}
      />

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {error && (
        <Text style={{ color: "red", marginTop: 20 }}>Lỗi: {error}</Text>
      )}
      {result && (
        <Text style={{ marginTop: 20 }}>Kết quả từ Vertex AI: {result}</Text>
      )}
    </View>
  );
};

export default Test;
