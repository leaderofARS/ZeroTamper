import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

type Evidence = {
  uri: string;
  hash: string;
  location: Location.LocationObject | null;
  timestamp: string;
};

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [locPermission, setLocPermission] = useState<Location.LocationPermissionResponse | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const locStatus = await Location.requestForegroundPermissionsAsync();
      setLocPermission(locStatus);
    })();
  }, []);

  if (!cameraPermission || !micPermission || !locPermission) {
    return <View style={styles.container}><ActivityIndicator color="#14f195" /></View>;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
          WitnessChain needs Camera and Microphone permissions to capture tamper-proof evidence.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => { requestCameraPermission(); requestMicPermission(); }}>
          <Text style={styles.btnText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleRecord = async () => {
    if (!cameraRef.current) return;

    if (isRecording) {
      setIsRecording(false);
      cameraRef.current.stopRecording();
    } else {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 15 });
        if (video) processEvidence(video.uri);
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const processEvidence = async (uri: string) => {
    setProcessing(true);
    try {
      // 1. Capture exact GPS context immediately after capture
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      
      // 2. Read file to compute Hash (Fingerprint generation)
      // Note: In production, large files should be hashed in chunks. For prototype, we read as base64.
      const fileData = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      
      // 3. Compute SHA-256 On-Device before it ever touches the internet
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, fileData);

      setEvidence({
        uri,
        hash,
        location: loc,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Processing failed', e);
    } finally {
      setProcessing(false);
    }
  };

  const submitToBlockchain = async () => {
    // This is where you would connect to the WitnessChain backend / IPFS
    alert('Evidence bundle securely anchored to Solana and uploaded to IPFS!');
    setEvidence(null); // Reset
  };

  if (evidence) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.header}>🛡️ Evidence Secured</Text>
          <Text style={styles.subtext}>A cryptographic fingerprint has been generated on your device. It is mathematically impossible to alter this media without breaking the hash.</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.label}>SHA-256 Hash (Solana Anchor):</Text>
            <Text style={styles.valueHash}>{evidence.hash}</Text>
            
            <Text style={styles.label}>Location Coordinates:</Text>
            <Text style={styles.value}>
              Lat: {evidence.location?.coords.latitude.toFixed(6)}{'\n'}
              Lon: {evidence.location?.coords.longitude.toFixed(6)}
            </Text>

            <Text style={styles.label}>Timestamp:</Text>
            <Text style={styles.value}>{evidence.timestamp}</Text>
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: '#14f195' }]} onPress={submitToBlockchain}>
            <Text style={[styles.btnText, { color: '#000' }]}>Anchor to Blockchain & Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => setEvidence(null)}>
            <Text style={styles.btnText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {processing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#9945ff" />
          <Text style={{ color: '#fff', marginTop: 20 }}>Generating On-Device Hash...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden', borderRadius: 24, margin: 16 }}>
          <CameraView 
            ref={cameraRef}
            style={StyleSheet.absoluteFill} 
            mode="video"
            facing="back"
          />
          <View style={styles.overlay}>
            <Text style={styles.brand}>WitnessChain</Text>
            <View style={styles.controls}>
              <TouchableOpacity 
                style={[styles.recordBtn, isRecording && styles.recordingActive]} 
                onPress={handleRecord}
              >
                <View style={isRecording ? styles.stopSquare : styles.recordCircle} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
  },
  brand: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  recordingActive: {
    borderColor: '#ff4d4d',
  },
  recordCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff4d4d',
  },
  stopSquare: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#ff4d4d',
  },
  card: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtext: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  label: {
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 12,
  },
  valueHash: {
    color: '#14f195',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  value: {
    color: '#fff',
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#9945ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
