// This is the final code for the project

import React, { useState } from "react";
import {
  View,
  Button,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ImageBackground,
  Linking,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";

const App = () => {
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    class_name: string;
    probabilities: number[];
    bird_details: {
      ScientificName?: string;
      MoreInfo?: string;
      ImageURL?: string;
    };
  } | null>(null);

  // Function to pick an audio file
  const pickAudioFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (res.canceled) {
        Alert.alert("Cancelled", "No audio file selected");
        return;
      }
      const fileUri = res.assets[0].uri;
      const fileName = res.assets[0].name;
      const localPath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({ from: fileUri, to: localPath });
      setAudioUri(localPath);
      setAudioName(fileName);
      Alert.alert("Audio Selected", fileName);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      Alert.alert("Error", errorMessage);
    }
  };

  // Function to play or pause the audio
  const togglePlayPause = async () => {
    if (!audioUri) {
      Alert.alert("No Audio", "Please upload an audio file first.");
      return;
    }
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlaying(!isPlaying);
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) {
          setIsPlaying(false);
          setSound(null);
        }
      });
      setSound(newSound);
      setIsPlaying(true);
    }
  };

  const handleSubmit = async () => {
    if (!audioUri) {
      Alert.alert("Error", "No audio uploaded. Please upload again.");
      return;
    }
    // console.log("Audio URI:", audioUri);
    setLoading(true);
    const formData = new FormData();
    // formData.append("audio_file", {
    //   uri: audioUri,
    //   name: audioName || "audio.wav",
    //   type: "audio/wav",
    // } as any);
    formData.append("audio_file", {
      uri: audioUri,
      name: audioName || "audio.mp3",
      type: "audio/mpeg",
    } as any);
    // formData.append("audio_file", audioUri);

    try {
      // const backendUrl = "http://127.0.0.1:8000/";
      // const backendUrl = "http://172.17.1.7:8000/api/upload/";
      const backendUrl = "http://192.168.1.66:8000/api/upload/";
      const response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
        headers: new Headers({
          Accept: "application/json",
          // "Content-Type": "multipart/form-data",
        }),
      });

      if (!response.ok) {
        throw new Error("Server error during upload");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      // Alert.alert("Uri:", audioUri);
      Alert.alert("Upload Failed", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Function to clear the selected audio file

  const clearAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
    setAudioUri(null);
    setAudioName(null);
    setResult(null);
    setLoading(false);
  };
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/backImage.png")}
        style={styles.backgroundimg}
      >
        <ScrollView>
          <View style={styles.containerText}>
            <Text style={styles.text}>Upload Bird Song</Text>
            <Text style={styles.text2}>
              Upload an audio file and Let birdy identify the bird!
            </Text>
            <TouchableOpacity style={styles.button1} onPress={pickAudioFile}>
              <Text style={styles.button1Text}>Choose File</Text>
            </TouchableOpacity>
            {audioName && (
              <Text style={styles.audioText}>Audio Selected: {audioName}</Text>
            )}
            {audioUri && (
              <View>
                <TouchableOpacity
                  onPress={togglePlayPause}
                  style={styles.playButton}
                >
                  <Text style={styles.buttonPText}>
                    {isPlaying ? "Pause" : "Play"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {audioUri && (
              <TouchableOpacity style={styles.button2} onPress={clearAudio}>
                <Text style={styles.button2Text}>Remove File</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button3,
                (!audioUri || loading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!audioUri || loading}
            >
              <Text style={styles.button3Text}>
                {loading ? "Analyzing..." : "Analyze"}
              </Text>
            </TouchableOpacity>
            {loading && (
              <ActivityIndicator
                size="large"
                color="blue"
                style={{ marginTop: 10 }}
              />
            )}
            {result && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultHead}>Bird Sounds Like</Text>
                <Text style={styles.resultText}>
                  <Text style={styles.resultName}>Bird Name: </Text>
                  {result.class_name}
                </Text>
                {/* Display Bird Image */}
                {/* {result.bird_details.ImageURL ? (
                  <Image
                    source={{ uri: result.bird_details.ImageURL }}
                    style={styles.birdImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.resultText}>No Image Available</Text>
                )} */}
                <Text style={styles.resultText}>
                  <Text style={styles.resultName}>Highest Probability: </Text>{" "}
                  {Math.max(...result.probabilities).toFixed(2)}
                </Text>
                <Text style={styles.resultText}>
                  <Text style={styles.resultName}>Scientific Name: </Text>
                  {result.bird_details.ScientificName || "N/A"}
                </Text>
                {result.bird_details.MoreInfo && (
                  <Text style={styles.moreResult}>
                    <Text style={styles.resultName}>More Info: </Text>{" "}
                    <Text
                      style={styles.link}
                      onPress={() =>
                        result.bird_details.MoreInfo &&
                        Linking.openURL(result.bird_details.MoreInfo)
                      }
                    >
                      {result.bird_details.MoreInfo}
                    </Text>
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  disabledButton: {},
  resultContainer: {
    alignItems: "center",
    backgroundColor: "lightblue",
    opacity: 0.8,
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  resultHead: { fontWeight: "bold", fontSize: 25, color: "darkblue" },
  resultText: { fontSize: 20, color: "black" },
  resultName: { fontWeight: "bold" },
  birdImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginVertical: 10,
    alignSelf: "center",
  },
  moreResult: {
    fontSize: 20,
    color: "black",
  },
  link: { color: "blue", textDecorationLine: "underline" },

  container: { flex: 1, backgroundColor: "black", paddingBottom: 50 },
  backgroundimg: { flex: 1, height: 900 },
  containerText: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 110,
    marginRight: 10,
    marginLeft: 10,
    // margin: 'auto',
    paddingBottom: 20,
    backgroundColor: "white",
    opacity: 0.7,
    borderRadius: 10,
  },
  text: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    color: "green",
    marginBottom: 5,
  },
  text2: {
    fontSize: 20,
    textAlign: "center",
    color: "black",
    marginBottom: 10,
  },
  button1: {
    backgroundColor: "lightblue",
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    marginRight: 70,
    marginLeft: 70,
  },
  button1Text: {
    color: "blue",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  audioText: {
    marginVertical: 10,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  // controls: { marginTop: 10, width: "30%" },
  playButton: {
    backgroundColor: "green",
    padding: 10,
    paddingLeft: 40,
    paddingRight: 40,
    borderRadius: 10,
    marginTop: 20,
    marginRight: 70,
    marginLeft: 70,
  },
  buttonPText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  button2: {
    backgroundColor: "red",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    marginRight: 70,
    marginLeft: 70,
  },
  button2Text: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  button3: {
    backgroundColor: "red",
    padding: 10,
    paddingRight: 25,
    paddingLeft: 25,
    borderRadius: 10,
    marginTop: 30,
    marginRight: 70,
    marginLeft: 70,
  },
  button3Text: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});

export default App;
