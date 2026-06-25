import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { useGetThoughtOfDayQuery } from '../../store/apiSlice';

const ThoughtScreen = ({ navigation }) => {
  const { data: response, isLoading, isError } = useGetThoughtOfDayQuery();
  const [thought, setThought] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (response?.success && response?.data) {
      setThought(response.data);
    } else if (isError || (response && !response.success)) {
      setThought({ thought: "Learn as if you will live forever, live like you will die tomorrow.", author: "Mahatma Gandhi" });
    }
  }, [response, isError]);

  useEffect(() => {

    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Navigate to Main after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Thought of the Day</Text>
        <Text style={styles.quote}>"{thought?.thought || '...'}"</Text>
        {thought?.author && <Text style={styles.author}>- {thought.author}</Text>}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 30,
    borderRadius: 20,
    width: '100%',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.8,
  },
  quote: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  author: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.9,
  }
});

export default ThoughtScreen;
