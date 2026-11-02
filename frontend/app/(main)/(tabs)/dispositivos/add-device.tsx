import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';

import AppInput from '../../../../src/components/AppInput';
import AppButton from '../../../../src/components/AppButton';
import AppHeader from '../../../../src/components/AppHeader';
import AppAlert from '../../../../src/components/AppAlert';
import { addDevice } from '../../../../src/services/deviceService';
import { errorMessage } from '../../../../src/services/api';
import { formatDate } from '../../../../src/utils/date';
import { colors, radius, spacing, typography } from '../../../../src/theme';

const MIN_BIRTH_DATE = new Date(1900, 0, 1);

export default function AddDeviceScreen() {
  const router = useRouter();
  const [deviceName, setDeviceName] = useState('');
  const [nameError, setNameError] = useState('');

  const [pickerDate, setPickerDate] = useState(new Date(2012, 0, 1));
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [birthDateText, setBirthDateText] = useState('');
  const [birthDateError, setBirthDateError] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initial = deviceName.trim().charAt(0).toUpperCase();

  const handleNameChange = (value: string) => {
    setDeviceName(value);
    if (nameError) setNameError('');
  };

  const applyPickedDate = (selectedDate: Date) => {
    setPickerDate(selectedDate);
    setBirthDateText(formatDate(selectedDate));
    setBirthDateError('');
  };

  const handleBirthDateTextChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
    setBirthDateText(formatted);
    setBirthDateError('');

    const parsed = parseBirthDate(formatted);
    if (parsed) setPickerDate(parsed);
  };

  const handleOpenDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: pickerDate,
        mode: 'date',
        display: 'calendar',
        minimumDate: MIN_BIRTH_DATE,
        maximumDate: new Date(),
        onValueChange: (_event, selectedDate) => applyPickedDate(selectedDate),
        onError: () => {
          setBirthDateError('No pudimos abrir el calendario. Escribí la fecha a mano.');
        },
      });
      return;
    }
    setShowIosPicker((visible) => !visible);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const trimmedName = deviceName.trim();
    const parsedBirthDate = parseBirthDate(birthDateText);

    let valid = true;
    if (!trimmedName) {
      setNameError('Ingresá el nombre de quien usa el celular.');
      valid = false;
    }
    if (!birthDateText) {
      setBirthDateError('Ingresá la fecha de nacimiento.');
      valid = false;
    } else if (!parsedBirthDate) {
      setBirthDateError('Ingresá una fecha válida en formato dd/mm/aaaa.');
      valid = false;
    }
    if (!valid || !parsedBirthDate) return;

    setLoading(true);
    try {
      const { device, linkCode } = await addDevice(trimmedName, toIsoDate(parsedBirthDate));
      router.replace({
        pathname: '/(main)/(tabs)/dispositivos/device-success',
        params: { name: device.name || trimmedName, linkCode, deviceId: device.id },
      });
    } catch (error) {
      setSubmitError(
        errorMessage(error, 'No pudimos crear el perfil. Revisá tu conexión e intentá de nuevo.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeader title="Agregar dispositivo" onBackPress={() => router.back()} />

          <Text style={styles.subtitle}>
            Creá el perfil de quien va a usar el celular protegido. Después lo vinculás desde ese
            teléfono.
          </Text>

          <View style={styles.avatarContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.avatar}>
              {initial ? (
                <Text style={styles.avatarText}>{initial}</Text>
              ) : (
                <Ionicons name="person" size={36} color={colors.textSubtle} />
              )}
            </View>
          </View>

          <AppInput
            label="Nombre"
            placeholder="¿Quién usa el celular protegido?"
            value={deviceName}
            onChangeText={handleNameChange}
            autoCapitalize="words"
            error={nameError || undefined}
            editable={!loading}
          />

          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Fecha de nacimiento</Text>
            <View style={[styles.dateInput, birthDateError ? styles.dateInputError : null]}>
              <TextInput
                accessibilityLabel="Fecha de nacimiento, en formato día, mes y año"
                placeholder="dd/mm/aaaa"
                placeholderTextColor={colors.textSubtle}
                value={birthDateText}
                onChangeText={handleBirthDateTextChange}
                keyboardType="number-pad"
                maxLength={10}
                editable={!loading}
                style={styles.dateText}
              />
              {Platform.OS !== 'web' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Elegir la fecha en el calendario"
                  onPress={handleOpenDatePicker}
                  disabled={loading}
                  hitSlop={8}
                  style={styles.calendarButton}
                >
                  <Ionicons name="calendar-outline" size={22} color={colors.text} />
                </Pressable>
              ) : null}
            </View>
            {birthDateError ? (
              <Text style={styles.dateError}>{birthDateError}</Text>
            ) : (
              <Text style={styles.dateHint}>
                La usamos para adaptar la protección a su edad.
              </Text>
            )}
          </View>

          {Platform.OS === 'ios' && showIosPicker ? (
            <View style={styles.iosPickerContainer}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                minimumDate={MIN_BIRTH_DATE}
                maximumDate={new Date()}
                onValueChange={(_event, selectedDate) => applyPickedDate(selectedDate)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Listo, cerrar el calendario"
                onPress={() => setShowIosPicker(false)}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Listo</Text>
              </Pressable>
            </View>
          ) : null}

          {submitError ? <AppAlert message={submitError} variant="error" /> : null}

          <View style={styles.buttonContainer}>
            <AppButton
              title="Agregar"
              onPress={handleSubmit}
              loading={loading}
              accessibilityLabel="Agregar dispositivo"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** dd/mm/aaaa -> Date, o null si no es una fecha real entre 1900 y hoy. */
function parseBirthDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed < MIN_BIRTH_DATE ||
    parsed > new Date()
  ) {
    return null;
  }
  return parsed;
}

/** Date -> AAAA-MM-DD, el formato que espera el backend. */
function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
  },
  dateField: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingLeft: 14,
    paddingRight: spacing.sm,
  },
  dateInputError: {
    borderColor: colors.danger,
  },
  dateText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  calendarButton: {
    padding: spacing.sm,
  },
  dateError: {
    color: colors.danger,
    fontSize: 13,
  },
  dateHint: {
    ...typography.caption,
  },
  iosPickerContainer: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  doneButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});
