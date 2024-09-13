import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Inicio() {
  const router = useRouter();

  // Aquí puedes agregar lógica para redirigir si es necesario
  // Por ejemplo, si el usuario debería estar autenticado, puedes redirigir si no lo está.

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bienvenido</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C2833',
  },
  text: {
    fontSize: 24,
    color: 'white',
  },
});
