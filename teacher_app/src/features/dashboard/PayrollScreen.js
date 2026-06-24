import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';

const PayrollScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <CustomHeader title="Payroll" showBack={true} />
      
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="dollar-sign" size={48} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Payroll</Text>
        <Text style={styles.subtitle}>
          Payroll management and payslips are currently under development. Please check back later.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color={colors.surface} style={{marginRight: 8}} />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  subtitle: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 20 },
  button: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});

export default PayrollScreen;
