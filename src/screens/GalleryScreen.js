import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { shareImage } from '../utils/imageUtils';
import { Ionicons } from '@expo/vector-icons';
import LoadingIndicator from '../components/LoadingIndicator';

const ALBUM_NAME = 'AI Generated Images';

const GalleryScreen = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { width } = useWindowDimensions();

  // Calculate image thumbnail size based on screen width
  const imageSize = (width - 36) / 3; // 3 columns with 12px spacing

  // Request media library permissions and load images
  useEffect(() => {
    loadGalleryImages();
  }, []);

  // Load saved images from gallery
  const loadGalleryImages = async () => {
    try {
      setLoading(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your media library',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      // Find the album
      const album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
      
      if (!album) {
        setImages([]);
        setLoading(false);
        return;
      }
      
      // Get all assets in the album
      const assets = await MediaLibrary.getAssetsAsync({
        album: album,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: MediaLibrary.MediaType.photo,
      });
      
      setImages(assets.assets);
    } catch (error) {
      console.error('Error loading gallery images:', error);
      Alert.alert('Error', 'Failed to load gallery images');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadGalleryImages();
  };

  // Handle image selection
  const handleImagePress = (image) => {
    setSelectedImage(image);
  };

  // Handle image sharing
  const handleShareImage = async (image) => {
    try {
      // Share the image
      await shareImage(image.uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to share image');
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (image) => {
    try {
      Alert.alert(
        'Delete Image',
        'Are you sure you want to delete this image?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await MediaLibrary.deleteAssetsAsync([image]);
              
              // Close detail view if the deleted image was selected
              if (selectedImage && selectedImage.id === image.id) {
                setSelectedImage(null);
              }
              
              // Refresh the gallery
              loadGalleryImages();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete image');
    }
  };

  // Close selected image detail view
  const closeImageDetail = () => {
    setSelectedImage(null);
  };

  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No images found</Text>
        <Text style={styles.emptySubtext}>
          Generate and save images to see them here
        </Text>
      </View>
    );
  };

  // Render image thumbnail
  const renderImageItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.imageItem, { width: imageSize, height: imageSize }]}
        onPress={() => handleImagePress(item)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.thumbnail}
        />
      </TouchableOpacity>
    );
  };

  // Render selected image detail view
  const renderImageDetail = () => {
    if (!selectedImage) return null;

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closeImageDetail}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.detailTitle}>Image Detail</Text>
          
          <View style={{ width: 32 }} />
        </View>
        
        <View style={styles.detailImageContainer}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.detailImage}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.detailActions}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => handleShareImage(selectedImage)}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
            <Text style={styles.detailButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.detailButton, styles.deleteButton]}
            onPress={() => handleDeleteImage(selectedImage)}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.detailButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <LoadingIndicator message="Loading gallery..." />
      ) : (
        <>
          {images.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={images}
              renderItem={renderImageItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.galleryContainer}
              columnWrapperStyle={styles.columnWrapper}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
            />
          )}
          
          {selectedImage && renderImageDetail()}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  galleryContainer: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  imageItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  detailContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 100,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  detailImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  detailButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default GalleryScreen; 