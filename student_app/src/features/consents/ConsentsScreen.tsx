import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useGetConsentsQuery, useUpdateConsentStatusMutation } from '../../store/apiSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ConsentsScreen = () => {
  const { data: response, isLoading, refetch } = useGetConsentsQuery(undefined);
  const [updateConsentStatus, { isLoading: isUpdating }] = useUpdateConsentStatusMutation();

  const consents = response?.data || [];

  const handleUpdateStatus = async (id: string, status: 'accepted' | 'declined') => {
    try {
      await updateConsentStatus({ id, status }).unwrap();
      Alert.alert('Success', `Consent ${status} successfully!`);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update consent status.');
    }
  };

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
      {isLoading && consents.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={consents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, consents.length === 0 && { flex: 1 }]}
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
