import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

// The 'navigation' prop is passed by React Navigation
const AssessmentScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assessment</Text>
      <Text style={styles.subtitle}>More Text</Text>
      {/* This button will navigate to the LevelMap after onboarding is complete */}
      <Button
        title="Test Time!"
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

export default AssessmentScreen;
