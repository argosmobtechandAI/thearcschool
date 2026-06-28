import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Dimensions, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useGetGalleryItemsQuery } from '../../store/apiSlice';
import { colors, shadows } from '../../theme/colors';
import CustomHeader from '../../components/CustomHeader';

const { width } = Dimensions.get('window');

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const GalleryScreen = ({ navigation }) => {
  const { data: galleryRes, isFetching, refetch } = useGetGalleryItemsQuery();
  const galleryItems = galleryRes?.data || [];

  const [selectedType, setSelectedType] = useState('all'); // 'all', 'image', 'video'
  const [selectedImage, setSelectedImage] = useState(null);

  const borderRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(borderRotation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, [borderRotation]);

  const rotationInterpolate = borderRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const filteredItems = galleryItems.filter(item => {
    if (selectedType === 'all') return true;
    return item.media_type === selectedType;
  });

  const handleMediaPress = (item) => {
    if (item.media_type === 'video') {
      Linking.openURL(item.media_url).catch(err => console.error("Failed to open video URL:", err));
    } else {
      setSelectedImage(item);
    }
  };

  const renderFeaturedItem = (item) => {
    if (!item) return null;
    const ytId = getYoutubeId(item.media_url);
    const coverUri = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : item.media_url;

    return (
      <View style={styles.featuredContainer}>
        {/* Animated Border Beam */}
        <Animated.View style={[styles.borderBeam, { transform: [{ rotate: rotationInterpolate }] }]}>
          <View style={styles.borderBeamGlow} />
        </Animated.View>

        {/* Content Mask */}
        <View style={styles.featuredInner}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => handleMediaPress(item)} style={{ flex: 1 }}>
            <View style={styles.featuredImageWrapper}>
              <Image source={{ uri: coverUri }} style={styles.featuredImage} />
              <View style={styles.mediaBadge}>
                <Icon name={item.media_type === 'video' ? 'video' : 'image'} size={12} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.mediaBadgeText}>{ytId ? 'YouTube' : 'Featured'}</Text>
              </View>
              {item.media_type === 'video' && (
                <View style={styles.playButtonOverlay}>
                  <Icon name="play" size={32} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.featuredDetails}>
              <Text style={styles.featuredTitle}>{item.title}</Text>
              <Text style={styles.featuredDesc}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGalleryGridItem = ({ item, index }) => {
    const ytId = getYoutubeId(item.media_url);
    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={() => handleMediaPress(item)}
        style={styles.gridItem}
      >
        <View style={styles.gridImageWrapper}>
          {item.media_type === 'video' ? (
            ytId ? (
              <View style={{ width: "100%", height: "100%" }}>
                <Image source={{ uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }} style={styles.gridImage} />
                <View style={styles.playButtonOverlay}>
                  <Icon name="play" size={24} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Icon name="video" size={32} color="rgba(255,255,255,0.7)" />
              </View>
            )
          ) : (
            <Image source={{ uri: item.media_url }} style={styles.gridImage} />
          )}
          <View style={[styles.gridBadge, { backgroundColor: ytId ? '#f59e0b' : item.media_type === 'video' ? '#ef4444' : '#3b82f6' }]}>
            <Icon name={item.media_type === 'video' ? 'video' : 'image'} size={10} color={ytId ? '#000' : '#fff'} />
          </View>
        </View>
        <View style={styles.gridDetails}>
          <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.gridDesc} numberOfLines={2}>{item.description || 'No description'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Media Gallery" showBack={true} />
      
      {/* Filters Bar */}
      <View style={styles.filterBar}>
        {['all', 'image', 'video'].map(type => (
          <TouchableOpacity
            key={type}
            onPress={() => setSelectedType(type)}
            style={[styles.filterTab, selectedType === type && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, selectedType === type && styles.filterTabActiveText]}>
              {type === 'all' ? 'All' : type === 'image' ? 'Photos' : 'Videos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems.slice(1)} // Slice out first item as it is featured
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.scrollList}
        refreshing={isFetching}
        onRefresh={refetch}
        ListHeaderComponent={() => (
          <>
            {filteredItems.length > 0 && selectedType === 'all' ? (
              <>
                <Text style={styles.sectionHeader}>Featured Highlight</Text>
                {renderFeaturedItem(filteredItems[0])}
                <Text style={styles.sectionHeader}>More Highlights</Text>
              </>
            ) : filteredItems.length > 0 ? (
              // If filtered view is active, render the first item normally inside grid
              renderGalleryGridItem({ item: filteredItems[0], index: 0 })
            ) : null}
          </>
        )}
        renderItem={renderGalleryGridItem}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="image" size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>No media items found in this section.</Text>
          </View>
        )}
      />

      {/* Image Preview Modal */}
      {selectedImage && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedImage(null)}>
              <Icon name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: selectedImage.media_url }} style={styles.modalImage} resizeMode="contain" />
            <View style={styles.modalDetails}>
              <Text style={styles.modalTitle}>{selectedImage.title}</Text>
              <Text style={styles.modalDesc}>{selectedImage.description}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 13, color: '#475569', fontWeight: 'bold' },
  filterTabActiveText: { color: '#fff' },

  scrollList: { padding: 16 },
  row: { justifyContent: 'space-between' },
  sectionHeader: { fontSize: 15, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 12 },

  // Featured Item Styling
  featuredContainer: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 2.5,
    backgroundColor: '#e2e8f0',
    position: 'relative'
  },
  borderBeam: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    top: '-50%',
    left: '-50%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  borderBeamGlow: {
    width: 150,
    height: '100%',
    backgroundColor: '#F59E0B',
    opacity: 0.8
  },
  featuredInner: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden'
  },
  featuredImageWrapper: {
    height: 180,
    backgroundColor: '#0f172a',
    position: 'relative'
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  mediaBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  mediaBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  featuredDetails: { padding: 16 },
  featuredTitle: { fontSize: 18, color: '#0F172A', fontWeight: 'bold' },
  featuredDesc: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },

  // Grid Items Styling
  gridItem: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8
  },
  gridImageWrapper: {
    height: 110,
    backgroundColor: '#0f172a',
    position: 'relative'
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  gridBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 4,
    borderRadius: 6
  },
  gridDetails: { padding: 10 },
  gridTitle: { fontSize: 13, color: '#1e293b', fontWeight: 'bold' },
  gridDesc: { fontSize: 11, color: '#64748b', marginTop: 2 },

  emptyContainer: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#64748b', marginTop: 8 },

  // Modal Preview Styling
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center' },
  modalCloseBtn: { position: 'absolute', top: 48, right: 24, padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  modalImage: { width: width - 32, height: width * 1.2 },
  modalDetails: { position: 'absolute', bottom: 48, left: 24, right: 24 },
  modalTitle: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  modalDesc: { fontSize: 14, color: '#cbd5e1', marginTop: 6, lineHeight: 20 }
});

export default GalleryScreen;
