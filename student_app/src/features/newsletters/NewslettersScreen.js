import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../theme/theme';
import CustomHeader from '../../components/CustomHeader';
import { useGetNewslettersQuery } from '../../store/apiSlice';

const NewslettersScreen = () => {
  const { data: newslettersData, isLoading, refetch, isFetching } = useGetNewslettersQuery();

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(() => {
      // Handle error gracefully if needed
      console.error('Could not open link:', url);
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleOpenLink(item.document_url)}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Icon name="file-text" size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.filename} numberOfLines={1}>{item.document_url.split('/').pop()}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Icon name="download" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Newsletters" showBack={true} />
      
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={newslettersData?.data || []}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-text" size={48} color={theme.colors.borderDark} />
              <Text style={styles.emptyText}>No newsletters available</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: theme.spacing.md, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.layout.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  filename: { fontSize: 16, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text, marginBottom: 4 },
  date: { fontSize: 13, fontFamily: theme.typography.fontFamily.medium, color: theme.colors.textMuted },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 16, fontFamily: theme.typography.fontFamily.medium, color: theme.colors.textMuted },
});

export default NewslettersScreen;
