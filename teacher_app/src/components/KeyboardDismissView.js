import React from 'react';
import { Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

const KeyboardDismissView = ({ children, style, behavior = Platform.OS === 'ios' ? 'padding' : 'height' }) => {
  return (
    <KeyboardAvoidingView style={[styles.container, style]} behavior={behavior}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default KeyboardDismissView;
