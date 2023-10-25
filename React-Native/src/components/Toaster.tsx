import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Toaster = ({ backgroundColor, message }) => (
  <View style={ [ styles.container, { backgroundColor } ] }>
    <Text style={ styles.text }>{ message }</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 5
  },
  text: {
    color: 'white',
    fontSize: 20
  }
});


























