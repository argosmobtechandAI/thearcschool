import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { useGetExamsQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';

const ResultsHomeScreen = ({ navigation }) => {
  const { activeClassId, activeClassName } = useSelector((state) => state.app);
  const { data: examsResponse, isLoading: loading, refetch, isFetching } = useGetExamsQuery(activeClassId);
  const [dateSheets, setDateSheets] = useState([]);

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (examsResponse?.exams) {
      // Extract unique date sheet titles
      const uniqueTitles = [...new Set(examsResponse.exams.map(e => e.title))];
      setDateSheets(uniqueTitles);
    }
  }, [examsResponse]);

  const handleSelectDateSheet = (title) => {
    if (!activeClassId) return;
    navigation.navigate('ClassResultsScreen', { title, classId: activeClassId, className: activeClassName });
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Class Results" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Text style={styles.sectionTitle}>Available Result Sheets</Text>
        
        {!activeClassId ? (
          <View style={styles.emptyState}>
            <Icon name="info" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Please select a class to view results.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : dateSheets.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No exams or results found for this class yet.</Text>
          </View>
        ) : (
          dateSheets.map((title, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.dateSheetCard} 
              onPress={() => handleSelectDateSheet(title)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <Icon name="award" size={24} color={colors.danger} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardSub}>View class-wide performance</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.border} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  emptyState: { alignItems: 'center', padding: 32, marginTop: 40 },
  emptyText: { color: colors.textMuted, marginTop: 12, textAlign: 'center' },
  
  dateSheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default ResultsHomeScreen;
