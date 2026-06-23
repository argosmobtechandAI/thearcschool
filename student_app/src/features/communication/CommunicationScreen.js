import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CommunicationScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Communication</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default CommunicationScreen;
