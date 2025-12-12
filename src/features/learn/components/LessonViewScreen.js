import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

// The 'navigation' prop is passed by React Navigation
const LessonViewScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lessons</Text>
      <Text style={styles.subtitle}>Some text</Text>
      {/* This button will navigate to the LevelMap after onboarding is complete */}
      <Button
        title="Start Learning"
        onPress={() => navigation.navigate('LevelMap')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, color: 'gray', marginBottom: 20 },
});

export default LessonViewScreen;
