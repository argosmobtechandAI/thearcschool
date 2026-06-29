import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { pick, isCancel } from '@react-native-documents/picker';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';
import CustomModal from '../../components/CustomModal';
import {
  useGetNewslettersQuery,
  useAddNewsletterMutation,
  useDeleteNewsletterMutation
} from '../../store/apiSlice';
import axios from 'axios';
import { API_URL } from '@env';

const NewslettersScreen = () => {
  const { data: newslettersData, isLoading, refetch, isFetching } = useGetNewslettersQuery();
  const [addNewsletter] = useAddNewsletterMutation();
  const [deleteNewsletter] = useDeleteNewsletterMutation();

  const [uploading, setUploading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'default',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: null
  });

  const showAlert = (type, title, message, onConfirm = null, confirmText = 'OK', onCancel = null, cancelText = null) => {
    setAlertConfig({ visible: true, type, title, message, onConfirm, onCancel, confirmText, cancelText });
  };
  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleUpload = async () => {
    try {
      const res = await pick({
        type: Platform.OS === 'ios' ? 'public.data' : '*/*',
        copyTo: 'cachesDirectory'
      });
      if (res && res[0]) {
        uploadFile(res[0]);
      }
    } catch (err) {
      if (!isCancel(err)) {
        showAlert('error', 'Error', 'Failed to pick document: ' + err.message);
      }
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', {
        uri: file.fileCopyUri || file.uri,
        type: file.type || 'application/pdf',
        name: file.name
      });
      
      const uploadRes = await axios.post(`${API_URL}/upload/file?category=school_info`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (uploadRes.data?.success) {
        const fileUrl = uploadRes.data.url;
        await addNewsletter({ document_url: fileUrl }).unwrap();
        showAlert('success', 'Success', 'Newsletter uploaded successfully!', hideAlert);
        refetch();
      } else {
        throw new Error(uploadRes.data?.message || 'Upload failed');
      }
    } catch (err) {
      showAlert('error', 'Upload Failed', 'Failed to upload newsletter: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    showAlert(
      'warning',
      'Delete Newsletter',
      'Are you sure you want to delete this newsletter?',
      async () => {
        hideAlert();
        try {
          await deleteNewsletter(id).unwrap();
          refetch();
        } catch (err) {
          showAlert('error', 'Error', 'Failed to delete newsletter.');
        }
      },
      'Delete',
      hideAlert,
      'Cancel'
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(item.document_url).catch(() => showAlert('error', 'Error', 'Could not open link.'))}>
          <View style={styles.iconContainer}>
            <Icon name="file-text" size={18} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.filename} numberOfLines={1}>{item.document_url.split('/').pop()}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Icon name="trash-2" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Newsletters" showBack={true} />
      
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={newslettersData?.data || []}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-text" size={48} color={colors.borderDark} />
              <Text style={styles.emptyText}>No newsletters available</Text>
            </View>
          }
        />
      )}

      {/* FAB for Adding Newsletter */}
      <TouchableOpacity style={styles.fab} onPress={handleUpload} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Icon name="upload" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      <CustomModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryButtonText={alertConfig.confirmText}
        secondaryButtonText={alertConfig.cancelText}
        onPrimaryPress={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          hideAlert();
        }}
        onSecondaryPress={() => {
          if (alertConfig.onCancel) alertConfig.onCancel();
          hideAlert();
        }}
        onClose={hideAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadows.card,
  },
  cardInfo: { flex: 1 },
  linkButton: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  filename: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  date: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  deleteBtn: { padding: 8, marginLeft: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
  },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: colors.textMuted },
});

export default NewslettersScreen;
