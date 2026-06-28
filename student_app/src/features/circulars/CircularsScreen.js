import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import CustomHeader from '../../components/CustomHeader';
import { useGetCircularsQuery } from '../../store/apiSlice';
import { theme } from '../../theme/theme';

const CircularsScreen = ({ navigation }) => {
  const { data, isLoading, refetch, isFetching } = useGetCircularsQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  });

  const [expandedCircularId, setExpandedCircularId] = useState(null);

  const circulars = data?.data || [];

  const toggleExpand = (id) => {
    setExpandedCircularId(expandedCircularId === id ? null : id);
  };

  const handleOpenAttachment = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const renderItem = ({ item }) => {
    const isExpanded = expandedCircularId === item.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(item.id)} 
          activeOpacity={0.8}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Icon name="file-text" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={isExpanded ? 0 : 1}>
                {item.title}
              </Text>
              <Text style={styles.dateText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <Text style={styles.bodyText}>
              {item.content}
            </Text>

            {item.attachment_url && (
              <TouchableOpacity 
                style={styles.attachmentButton}
                onPress={() => handleOpenAttachment(item.attachment_url)}
                activeOpacity={0.7}
              >
                <Icon name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.attachmentButtonText}>View Attachment (PDF)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader title="Circulars" showBack onPressBack={() => navigation.goBack()} />
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={circulars}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContainer, circulars.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={refetch} colors={[theme.colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Icon name="info" size={48} color={theme.colors.primary + '80'} />
              </View>
              <Text style={styles.emptyTitle}>No Circulars</Text>
              <Text style={styles.emptyText}>There are no administrative circulars or notice board items for you at this moment.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  listContainer: { padding: theme.spacing.md, paddingBottom: 40, gap: 12 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.layout.borderRadius.xl,
    padding: 16,
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
  },
  
  cardContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bodyText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  
  attachmentButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.bold,
  },
  
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.heading,
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default CircularsScreen;
