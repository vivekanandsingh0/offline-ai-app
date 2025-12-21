import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Model, useModelStore } from '../../store/useModelStore';

export default function ModelsScreen() {
  const { catalog, localModels, initialize, startDownload, deleteModel, loadModel, unloadModel, activeModelId } = useModelStore();

  useEffect(() => {
    initialize();
  }, []);

  const renderItem = ({ item }: { item: Model }) => {
    const localModel = localModels[item.id];
    const isDownloaded = !!localModel && localModel.downloadStatus === 'completed';
    const isDownloading = !!localModel && localModel.downloadStatus === 'downloading';
    const isActive = activeModelId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.modelName}>{item.name}</Text>
          <Text style={styles.modelSize}>{item.size}</Text>
        </View>
        <Text style={styles.modelDesc}>{item.description}</Text>

        <View style={styles.actionRow}>
          {isDownloaded ? (
            <>
              {isActive ? (
                <TouchableOpacity style={[styles.button, styles.activeButton]} onPress={() => unloadModel()}>
                  <Text style={styles.buttonText}>Unload</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={() => loadModel(item.id)}>
                  <Text style={styles.buttonText}>Load</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => {
                Alert.alert("Delete Model", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteModel(item.id) }
                ]);
              }}>
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </>
          ) : isDownloading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Downloading... {Math.round((localModel?.progress || 0) * 100)}%</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.downloadButton} onPress={() => startDownload(item)}>
              <Ionicons name="download" size={18} color="white" />
              <Text style={styles.buttonText}> Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Models' }} />
      <FlatList
        data={catalog}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modelSize: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modelDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  downloadButton: {
    backgroundColor: '#5856D6',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  progressContainer: {
    padding: 8,
  },
  progressText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
