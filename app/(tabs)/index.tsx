import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PWA Rotas 🚀</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite a origem"
        value={origem}
        onChangeText={setOrigem}
      />

      <TextInput
        style={styles.input}
        placeholder="Digite o destino"
        value={destino}
        onChangeText={setDestino}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Calcular Rota</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
  },
});
