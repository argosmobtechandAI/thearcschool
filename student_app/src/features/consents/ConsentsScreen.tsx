import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useGetConsentsQuery, useUpdateConsentStatusMutation } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/Feather';
import AppModal from '../../components/AppModal';
import MetricsFilterBar from '../../components/MetricsFilterBar';
import { theme } from '../../theme/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Chip from '../../components/Chip';

const ConsentsScreen = () => {
  const { data: response, isLoading, isFetching, refetch } = useGetConsentsQuery(undefined);
  const [updateConsentStatus, { isLoading: isUpdating }] = useUpdateConsentStatusMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [modalConfig, setModalConfig] = useState({ visible: false, title: '', message: '', type: 'success' });

  const rawConsents = response?.data || [];

  const handleUpdateStatus = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await updateConsentStatus({ id, status }).unwrap();
      setModalConfig({ visible: true, title: 'Success', message: `Consent ${status} successfully!`, type: 'success' });
    } catch (error) {
      console.error(error);
      setModalConfig({ visible: true, title: 'Error', message: 'Failed to update consent status.', type: 'error' });
    }
  };

  const filteredConsents = rawConsents.filter((item: any) => {
    const consent = item.consent || {};
    if (searchQuery && !consent.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !consent.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (startDate && consent.event_date) {
      const eventDate = new Date(consent.event_date).getTime();
      const sDate = new Date(startDate).getTime();
      const eDate = endDate ? new Date(endDate).getTime() : sDate;
      const eDateEnd = eDate + 24 * 60 * 60 * 1000 - 1;
      if (eventDate < sDate || eventDate > eDateEnd) {
        return false;
      }
    }
    return true;
  }).sort((a: any, b: any) => {
    const dateA = new Date(a.consent?.event_date || 0).getTime();
    const dateB = new Date(b.consent?.event_date || 0).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });



  const renderItem = ({ item }: { item: any }) => {
    const consentDetails = item.consent || {};

    return (
      <Card variant="elevated">
        <View style={styles.headerRow}>
          <Text style={styles.title}>{consentDetails.title || 'Untitled Consent'}</Text>
          <Chip 
            label={item.status ? item.status : 'PENDING'} 
            type={item.status === 'accepted' ? 'success' : item.status === 'declined' ? 'danger' : 'default'} // map as needed or use default
          />
        </View>

        <Text style={styles.description}>{consentDetails.description}</Text>
        
        {consentDetails.event_date && (
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color={theme.colors.textMuted} />
            <Text style={styles.dateText}>
              Event Date: {new Date(consentDetails.event_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <Button
              label="Approve"
              icon="check"
              variant="primary"
              onPress={() => handleUpdateStatus(item.id, 'accepted')}
              loading={isUpdating}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              label="Decline"
              icon="x"
              variant="danger"
              onPress={() => handleUpdateStatus(item.id, 'declined')}
              loading={isUpdating}
              style={{ flex: 1, marginLeft: theme.spacing.sm }}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <MetricsFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        searchPlaceholder="Search consents..."
      />

      {isLoading && rawConsents.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConsents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, filteredConsents.length === 0 && { flex: 1 }]}
          refreshing={isFetching || false}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="file-text" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>No consents found.</Text>
            </View>
          }
        />
      )}

      <AppModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        icon={modalConfig.type === 'success' ? 'check-circle' : 'x-circle'}
        iconColor={modalConfig.type === 'success' ? theme.colors.success : theme.colors.danger}
        actions={[
          { label: 'OK', onPress: () => setModalConfig({ ...modalConfig, visible: false }), style: modalConfig.type === 'success' ? 'success' : 'danger' }
        ]}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.medium,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dateText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
  },
});

export default ConsentsScreen;
