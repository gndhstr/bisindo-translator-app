import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Button, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [result, setResult] = useState('');
  const [accuration, setAccuration] = useState(0);
  const cameraRef = useRef(null);
  const [started, setStarted] = useState(false); // kontrol halaman awal / kamera
  const [restart, setRestart] = useState(0); // trigger restart loop

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loopCapture = async () => {
      if (!isMounted || !cameraRef.current) return;

      try {
        const photo = await cameraRef.current.takePictureAsync();
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 256 } }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        const response = await fetch("http://server.angelica.cloud:3000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: manipulated.base64 }),
        });

        const data = await response.json();
        if (isMounted) {
          setResult(data.result);
          setAccuration(data.confidence);
        }
      } catch (error) {
        console.error("Error in capture loop:", error);
      }

      if (isMounted) {
        setTimeout(loopCapture, 1000); // delay 1 detik antar pengiriman
      }
    };

    if (hasPermission && started) {
      loopCapture();
    }

    return () => {
      isMounted = false;
    };
  }, [hasPermission, restart, started]);

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  if (!started) {
    // Halaman awal selamat datang
    return (
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Selamat Datang di Aplikasi Penerjemah BISINDO</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => setStarted(true)}>
          <Text style={styles.startButtonText}>Mulai</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Halaman kamera & hasil prediksi
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>
        Penerjemah Bahasa Isyarat{"\n"}BISINDO
      </Text>

      <View style={styles.cameraContainer}>
        <Camera style={styles.camera} ref={cameraRef} />
        <Text style={styles.iText}>Arahkan kamera untuk mendeteksi gerakan bahasa isyarat!</Text>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.instructionText}>Hasil Penerjemahan</Text>
        <Text style={styles.predictionText}>{result}</Text>
        <Text
          style={[
            styles.AccurationText,
            { color: accuration * 100 > 70 ? 'green' : 'red' } // Warna tergantung confidence
          ]}
        >
          Akurasi: {(accuration * 100).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  cameraContainer: {
    flex: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 70,
  },
  camera: {
    flex: 1,
  },
  iText: {
    fontSize: 12,
    padding: 5,
    borderRadius: 12,
    marginTop: -80,
    marginBottom: 80,
    marginLeft: 20,
    marginRight: 20,
    textAlign: 'center',
    color: 'black',
    backgroundColor: 'yellow',
  },
  resultContainer: {
    marginTop: -130,
    marginBottom: 30,
    alignItems: 'center',
    backgroundColor: 'white',
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'black',
    borderBlockColor: 'black',
  },
  predictionText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 0,
  },
  instructionText: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
    color: 'gray',
  },
  AccurationText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
});
