import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PWA Rotas 🚀</Text>
      <Text style={styles.subtitle}>Seu app de rotas está começando!</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Buscar Rota</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
  },
  subtitle: {
    marginVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});
