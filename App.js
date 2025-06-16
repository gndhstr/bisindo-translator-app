import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState('');
  const [confident, setConfident] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (!cameraReady || !cameraRef.current) return;
    setLoading(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
      setImagePreview(photo.uri);

      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 224 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      const response = await fetch('https://flaskapp.angelica.cloud/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: manipulated.base64 }),
      });

      const data = await response.json();
      setResult(data.result);
      setConfident(data.confidence);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return alert('Izin galeri ditolak');

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      allowsEditing: false, // tidak crop / edit
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const image = result.assets[0];
      setLoading(true);

      try {
        const resized = await ImageManipulator.manipulateAsync(
          image.uri,
          [{ resize: { width: 224 } }],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

        const response = await fetch('https://flaskapp.angelica.cloud/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: resized.base64 }),
        });

        const data = await response.json();

        setImagePreview(image.uri);
        setResult(data.result);
        setConfident(data.confidence);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    }
  };

  const resetCamera = () => {
    setImagePreview(null);
    setResult('');
    setConfident(0);
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  if (!started) {
    return (
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Selamat Datang di Aplikasi Penerjemah BISINDO</Text>
        <TouchableOpacity style={styles.startButton} onPress={() => setStarted(true)}>
          <Text style={styles.startButtonText}>Mulai</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Penerjemah Bahasa Isyarat BISINDO</Text>

      <View style={styles.cameraContainer}>
        {imagePreview ? (
          <Image
            source={{ uri: imagePreview }}
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              resizeMode: 'cover',
              borderRadius: 12,
            }}
          />
        ) : (
          <Camera
            style={{
              width: '100%',
              aspectRatio: 9 / 16,
            }}
            ratio="16:9"
            ref={cameraRef}
            onCameraReady={() => setCameraReady(true)}
          />
        )}
      </View>

      <Text style={styles.iText}>
        {!imagePreview ? 'Klik tombol untuk mengambil gambar atau dari galeri' : 'Gambar berhasil diambil'}
      </Text>

      <View style={styles.buttonRow}>
        {!imagePreview ? (
          <>
            <TouchableOpacity style={styles.roundButton} onPress={handleCapture}>
              <Ionicons name="camera" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roundButton, { backgroundColor: '#28a745' }]}
              onPress={pickFromGallery}
            >
              <Ionicons name="image" size={28} color="#fff" />
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10 }}>Memproses gambar...</Text>
        </View>
      )}

      {result !== '' && (
        <View style={styles.resultContainer}>
          <Text style={styles.instructionText}>Hasil Penerjemahan</Text>
          <Text style={styles.predictionText}>{result}</Text>
          <Text
            style={{
              fontSize: 16,
              color: confident * 100 > 70 ? 'green' : 'red',
              marginBottom: 30,
            }}
          >
            Akurasi: {(confident * 100).toFixed(1)}%
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={resetCamera}>
            <MaterialIcons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  iText: {
    fontSize: 14,
    marginVertical: 10,
    textAlign: 'center',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 20,
  },
  roundButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  resultContainer: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'black',
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 4,
    color: 'gray',
  },
  predictionText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
  },
  retryButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#ff9500',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
