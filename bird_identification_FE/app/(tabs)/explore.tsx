// after one recording, it has to be cleared before recording for the second time

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { rgbaColor } from "react-native-reanimated/lib/typescript/Colors";

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | undefined>(
    undefined
  );
  const [recordingItem, setRecordingItem] = useState<RecordingItem | null>(
    null
  );
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
  type RecordingItem = {
    sound: Audio.Sound;
    duration: string;
    file: string | null;
  };

  async function startRecording() {
    try {
      if (recordingItem) {
        alert("Please clear the previous recording before starting a new one.");
        return;
      }

      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (err) {}
  }

  async function stopRecording() {
    if (!recording) {
      console.error("Recording is undefined");
      return;
    }

    await recording.stopAndUnloadAsync();
    const { sound, status } = await recording.createNewLoadedSoundAsync();

    if (status && "durationMillis" in status) {
      setRecordingItem({
        sound: sound,
        duration: getDurationFormatted(status.durationMillis ?? 0),
        file: recording.getURI(),
      });
    } else {
      console.error("Status does not have durationMillis:", status);
    }

    setRecording(undefined);
  }

  function getDurationFormatted(milliseconds: number): string {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  function clearRecording() {
    setRecordingItem(null);
    setResult(null);
  }

  // Function to handle submission
  const handleSubmit = async () => {
    if (!recordingItem?.file) {
      Alert.alert("Error", "No recording to upload. Please record first.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("audio_file", {
      uri: recordingItem.file,
      name: "bird_song.wav", // Change the name accordingly
      type: "audio/wav",
    } as any);

    try {
      // const backendUrl = "http://172.17.1.7:8000/api/upload/"; // Replace with your backend URL
      const backendUrl = "http://192.168.1.66:8000/api/upload/"; // Replace with your backend URL
      const response = await fetch(backendUrl, {
        method: "POST",
        body: formData,
        headers: new Headers({
          Accept: "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error("Server error during upload");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      Alert.alert("Upload Failed", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/backImage.png")}
        style={styles.backgroundimg}
      >
        <ScrollView>
          <View style={styles.containerText}>
            <Text style={styles.text}>Record Bird Song</Text>
            <Text style={styles.text2}>
              Record an audio and Let birdy identify the bird!
            </Text>
            <TouchableOpacity
              style={styles.button1}
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={styles.button1Text}>
                {recording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>
            {recordingItem && (
              <View style={styles.row}>
                <Text style={styles.fill}>
                  Recording | {recordingItem.duration}
                </Text>
                <TouchableOpacity
                  style={styles.button2}
                  onPress={() => recordingItem.sound.replayAsync()}
                >
                  <Text style={styles.button2Text}>Play</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button3}
                  onPress={clearRecording}
                >
                  <Text style={styles.button3Text}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.buttonA, !recordingItem && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!recordingItem}
            >
              <Text style={styles.buttonAText}>
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
}

const styles = StyleSheet.create({
  disabledButton: {},
  resultContainer: {
    alignItems: "center",
    backgroundColor: "lightblue",
    opacity: 1,
    margin: 20,
    padding: 20,
    borderRadius: 10,
  },
  resultHead: { fontWeight: "bold", fontSize: 25, color: "darkblue" },
  resultText: { fontSize: 20, color: "black" },
  resultName: { fontWeight: "bold" },
  // resultClass:{},
  // birdImage: {
  //   width: 150,
  //   height: 150,
  //   borderRadius: 10,
  //   marginVertical: 10,
  //   alignSelf: "center",
  // },
  moreResult: {
    fontSize: 20,
    color: "black",
  },
  link: { color: "blue", textDecorationLine: "underline" },
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingBottom: 50,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    marginRight: 40,
  },
  fill: {
    flex: 1,
    margin: 15,
  },
  backgroundimg: {
    flex: 1,
    height: 900,
  },
  containerText: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 110,
    marginRight: 10,
    marginLeft: 10,
    paddingBottom: 20,
    backgroundColor: "white",
    opacity: 0.6,
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
    backgroundColor: "green",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 30,
  },
  button1Text: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  button2: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 5,
    marginRight: 5,
  },
  button2Text: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  button3: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 5,
    marginLeft: 5,
  },
  button3Text: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  buttonA: {
    backgroundColor: "red",
    padding: 10,
    paddingRight: 25,
    paddingLeft: 25,
    borderRadius: 10,
    marginTop: 30,
    marginRight: 70,
    marginLeft: 70,
  },
  buttonAText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
});
