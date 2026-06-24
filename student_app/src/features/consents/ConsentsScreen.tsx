import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useGetConsentsQuery, useUpdateConsentStatusMutation } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppModal from '../../components/AppModal';
import MetricsFilterBar from '../../components/MetricsFilterBar';

const ConsentsScreen = () => {
  const { data: response, isLoading, refetch } = useGetConsentsQuery(undefined);
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
    const statusColor = 
      item.status === 'accepted' ? '#10B981' : 
      item.status === 'declined' ? '#EF4444' : '#F59E0B';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{consentDetails.title || 'Untitled Consent'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status ? item.status.toUpperCase() : 'PENDING'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{consentDetails.description}</Text>
        
        {consentDetails.event_date && (
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color="#6B7280" />
            <Text style={styles.dateText}>
              Event Date: {new Date(consentDetails.event_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleUpdateStatus(item.id, 'accepted')}
              disabled={isUpdating}
            >
              <Icon name="check" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={() => handleUpdateStatus(item.id, 'declined')}
              disabled={isUpdating}
            >
              <Icon name="close" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={filteredConsents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, filteredConsents.length === 0 && { flex: 1 }]}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="file-document-outline" size={48} color="#D1D5DB" />
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
        iconColor={modalConfig.type === 'success' ? '#10B981' : '#EF4444'}
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
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
});

export default ConsentsScreen;
