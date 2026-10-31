import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

// Componentes reutilizables del proyecto
import AppInput from '../../../../src/components/AppInput';
import AppButton from '../../../../src/components/AppButton';
import AppHeader from '../../../../src/components/AppHeader';
import {
  addDevice,
  requestLinkingPin,
} from '../../../../src/services/deviceService';

export default function AddDeviceScreen() {
  const router = useRouter();
  const [deviceName, setDeviceName] = useState('');
  
  // Estados para la fecha y el calendario nativo
  const [date, setDate] = useState(new Date(2012, 0, 1));
  const [showPicker, setShowPicker] = useState(false);
  const [birthDateString, setBirthDateString] = useState('');
  const [birthDateError, setBirthDateError] = useState('');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    setBirthDateString(`${day}/${month}/${year}`);
    setBirthDateError('');
  };

  const handleBirthDateTextChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formattedValue = digits
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
    setBirthDateString(formattedValue);
    setBirthDateError('');

    const parsedDate = parseBirthDate(formattedValue);
    if (parsedDate) {
      setDate(parsedDate);
    }
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        display: 'calendar',
        maximumDate: new Date(),
        onValueChange: (_event, selectedDate) => handleDateChange(selectedDate),
        onError: (error) => {
          Alert.alert(
            'No se pudo abrir el calendario',
            error.message || 'Ingresá la fecha manualmente.',
          );
        },
      });
      return;
    }

    if (Platform.OS === 'web') {
      return;
    }

    setShowPicker(true);
  };

  // --- SECCIÓN DE FOTO DE PERFIL / AVATAR (MOCK & TODO BACKEND) ---
  const handlePickImage = () => {
    // MOCK: Interacción visual para el usuario actual
    Alert.alert(
      "Próximamente",
      "Pronto podrás subir o cambiar la foto de perfil del dispositivo.",
      [{ text: "Entendido" }]
    );

    /* 
      TODO BACKEND / NATIVO: 
      Estructura lista para implementar expo-image-picker y envío al servidor cuando se habilite el módulo:
      
      async function pickImageFromDevice() {
        let result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled) {
          setProfileImage(result.assets[0].uri);
          // TODO BACKEND: Adjuntar la imagen en el FormData de registro del dispositivo
        }
      }
      pickImageFromDevice();
    */
  };

  const handleAgregar = async () => {
    if (!deviceName.trim()) return;

    const parsedBirthDate = birthDateString
      ? parseBirthDate(birthDateString)
      : null;
    if (birthDateString && !parsedBirthDate) {
      setBirthDateError('Ingresá una fecha válida en formato dd/mm/aaaa.');
      return;
    }

    setLoading(true);
    try {
      /*
        TODO BACKEND: Enviar datos completos del perfil (incluyendo imagen/avatar si aplica)
        const formData = new FormData();
        formData.append('deviceName', deviceName);
        formData.append('birthDate', birthDateString);
        if (profileImage) {
          formData.append('profileImage', { uri: profileImage, name: 'avatar.jpg', type: 'image/jpeg' } as any);
        }
      */

      const trimmedName = deviceName.trim();
      const res = await requestLinkingPin(trimmedName, 'Android');
      const savedBirthDate = parsedBirthDate
        ? `${parsedBirthDate.getFullYear()}-${String(parsedBirthDate.getMonth() + 1).padStart(2, '0')}-${String(parsedBirthDate.getDate()).padStart(2, '0')}`
        : undefined;
      addDevice(trimmedName, savedBirthDate);
      
      router.push({
        pathname: '/(main)/(tabs)/(dispositivos)/device-success',
        params: { pin: res.pin, name: trimmedName },
      });
    } catch (error) {
      Alert.alert(
        'No se pudo agregar el dispositivo',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera reutilizable */}
        <AppHeader title="Agregar dispositivo" onBackPress={() => router.back()} />

        <Text style={styles.subtitle}>
          Creá el perfil del dispositivo protegido para gestionar su información y configuraciones desde tu app.
        </Text>

        {/* Foto de perfil / Avatar */}
        <Pressable style={styles.imagePickerContainer} onPress={handlePickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarIcon}>👤+</Text>
            </View>
          )}
          <Text style={styles.imagePickerText}>Añadir foto de perfil</Text>
        </Pressable>

        {/* Input Nombre del dispositivo */}
        <AppInput
          label="Nombre"
          placeholder="¿Quién usa el dispositivo protegido?"
          value={deviceName}
          onChangeText={setDeviceName}
        />

        {/* Campo de fecha */}
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>Fecha de nacimiento</Text>
          <View style={[styles.dateInput, birthDateError && styles.dateInputError]}>
            <TextInput
              accessibilityLabel="Fecha de nacimiento"
              placeholder="dd/mm/aaaa"
              value={birthDateString}
              onChangeText={handleBirthDateTextChange}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.dateText}
            />
            {Platform.OS !== 'web' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir calendario"
                onPress={handleOpenDatePicker}
                hitSlop={8}
                style={styles.calendarButton}
              >
                <Text style={styles.calendarButtonText}>Calendario</Text>
              </Pressable>
            )}
          </View>
          {birthDateError ? (
            <Text style={styles.dateError}>{birthDateError}</Text>
          ) : null}
        </View>

        {/* Selector Nativo de Fecha */}
        {Platform.OS === 'ios' && showPicker && (
          <View style={styles.iosPickerContainer}>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onValueChange={(_event, selectedDate) =>
                handleDateChange(selectedDate)
              }
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPicker(false)}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Listo</Text>
            </Pressable>
          </View>
        )}

        {/* Botón principal */}
        <View style={styles.buttonContainer}>
          <AppButton
            title={loading ? "Generando PIN..." : "Agregar"}
            onPress={handleAgregar}
            disabled={loading || !deviceName.trim()}
          />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 30,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  dateField: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  dateInputError: {
    borderColor: '#DC2626',
  },
  dateText: {
    flex: 1,
    color: '#1F2937',
    fontSize: 16,
    paddingVertical: 12,
  },
  calendarButton: {
    paddingVertical: 10,
    paddingLeft: 12,
  },
  calendarButtonText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '700',
  },
  dateError: {
    color: '#DC2626',
    fontSize: 13,
  },
  iosPickerContainer: {
    marginBottom: 16,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  doneButtonText: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: '700',
  },
  imagePickerContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
    marginBottom: 8,
  },
  avatarIcon: {
    fontSize: 32,
  },
  imagePickerText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 12,
  },
});

function parseBirthDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day ||
    parsedDate > new Date()
  ) {
    return null;
  }

  return parsedDate;
}