import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import MetricsFilterBar from '../../components/MetricsFilterBar';
import { useGetComplaintsQuery } from '../../store/apiSlice';

const StudentNotesScreen = ({ route }) => {
  const { student } = route.params;
  const { data, isLoading, refetch, isFetching } = useGetComplaintsQuery(student.id);
  
  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);
  const complaints = data?.complaint || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Newest first
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      result = result.filter(c => {
        if (!c.created_at) return false;
        const d = new Date(c.created_at);
        return d >= s && d <= e;
      });
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.description && c.description.toLowerCase().includes(q)) || 
        (c.type && c.type.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [complaints, searchQuery, sortOrder, startDate, endDate]);

  return (
    <View style={styles.container}>
      <CustomHeader title="Disciplinary Notes" showBack />
      
      <MetricsFilterBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Search notes..."
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Recorded Incidents</Text>
              
              {filteredComplaints.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No disciplinary records found.</Text>
                </View>
              ) : (
                filteredComplaints.map((c, idx) => (
                  <View key={idx} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{c.type || 'Remark'}</Text>
                      </View>
                      <Text style={styles.dateText}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.description}>{c.description}</Text>
                    {c.status && (
                      <Text style={styles.statusText}>Status: {String(c.status).toUpperCase()}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 60 },
  listSection: { marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.success, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  noteCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    ...shadows.sm
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { backgroundColor: colors.warning + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: colors.warning, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  dateText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  description: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 12 },
  statusText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' }
});

export default StudentNotesScreen;
