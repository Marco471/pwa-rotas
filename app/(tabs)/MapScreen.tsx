import polyline from "@mapbox/polyline";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const TOKEN = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type Coord = {
  latitude: number;
  longitude: number;
};

type Campo = "origem" | "destino" | "parada";

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [location, setLocation] = useState<Coord | null>(null);

  const [origem, setOrigem] = useState<Coord | null>(null);
  const [destino, setDestino] = useState<Coord | null>(null);

  const [origemText, setOrigemText] = useState("");
  const [destinoText, setDestinoText] = useState("");
  const [paradaText, setParadaText] = useState("");

  const [paradas, setParadas] = useState<{ coord: Coord; nome: string }[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<Campo>("destino");

  const [rota, setRota] = useState<Coord[]>([]);
  const [preco, setPreco] = useState<number | null>(null);

  // 📍 localização
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({});

      const user = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      setLocation(user);
      setOrigem(user);
    })();
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.web}>
        <Text style={styles.webText}>🚫 Mapa não disponível na web</Text>
      </View>
    );
  }

  // 🔎 busca endereço
  const buscar = async (texto: string, campo: Campo) => {
    if (!texto || texto.length < 2) {
      setSugestoes([]);
      return;
    }

    setCampoAtivo(campo);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${texto}&key=${TOKEN}&language=pt-BR&components=country:br`;

      const res = await fetch(url);
      const data = await res.json();

      setSugestoes(data.status === "OK" ? data.predictions : []);
    } catch {
      Alert.alert("Erro", "Falha ao buscar endereço");
    }
  };

  // 📍 coords
  const pegarCoords = async (placeId: string): Promise<Coord> => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${TOKEN}`,
    );

    const data = await res.json();

    return {
      latitude: data.result.geometry.location.lat,
      longitude: data.result.geometry.location.lng,
    };
  };

  // 🛣️ rota
  const calcularRota = async () => {
    if (!origem || !destino) {
      Alert.alert("Erro", "Selecione origem e destino");
      return;
    }

    try {
      const waypoints =
        paradas.length > 0
          ? `&waypoints=${paradas
              .map((p) => `${p.coord.latitude},${p.coord.longitude}`)
              .join("|")}`
          : "";

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origem.latitude},${origem.longitude}&destination=${destino.latitude},${destino.longitude}${waypoints}&key=${TOKEN}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") {
        Alert.alert("Erro rota", data.status);
        return;
      }

      const pontos = polyline
        .decode(data.routes[0].overview_polyline.points)
        .map((p: number[]) => ({
          latitude: p[0],
          longitude: p[1],
        }))
        .filter((p) => p.latitude && p.longitude);

      setRota([...pontos]);

      const km =
        data.routes[0].legs.reduce((acc: number, leg: any) => {
          return acc + leg.distance.value;
        }, 0) / 1000;

      setPreco(km * 2.5);

      mapRef.current?.fitToCoordinates(pontos, {
        edgePadding: { top: 120, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    } catch {
      Alert.alert("Erro", "Falha ao calcular rota");
    }
  };

  if (!location) return <ActivityIndicator size="large" />;

  // ❌ LIMPAR TOTAL (CORRIGIDO)
  function limparInput(tipo: Campo) {
    if (tipo === "origem") {
      setOrigemText("");
      setOrigem(null);
    }

    if (tipo === "destino") {
      setDestinoText("");
      setDestino(null);
    }

    if (tipo === "parada") {
      setParadaText("");
      setParadas([]);
    }

    // 🔥 ESSA É A CORREÇÃO PRINCIPAL
    setRota([]);
    setPreco(null);
    setSugestoes([]);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {origem && <Marker coordinate={origem} pinColor="green" />}
        {destino && <Marker coordinate={destino} pinColor="red" />}

        {paradas.map((p, i) => (
          <Marker key={i} coordinate={p.coord} pinColor="orange" />
        ))}

        {/* 🔥 LINHA FIXA */}
        {rota.length > 1 && (
          <Polyline coordinates={rota} strokeWidth={5} strokeColor="#1e90ff" />
        )}
      </MapView>

      <View style={styles.card}>
        <TextInput
          placeholder="Origem"
          value={origemText}
          onFocus={() => setCampoAtivo("origem")}
          onChangeText={(t) => {
            setOrigemText(t);
            buscar(t, "origem");
          }}
          style={styles.input}
        />
        {origemText.length > 0 && (
          <TouchableOpacity onPress={() => limparInput("origem")}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}

        <TextInput
          placeholder="Destino"
          value={destinoText}
          onFocus={() => setCampoAtivo("destino")}
          onChangeText={(t) => {
            setDestinoText(t);
            buscar(t, "destino");
          }}
          style={styles.input}
        />
        {destinoText.length > 0 && (
          <TouchableOpacity onPress={() => limparInput("destino")}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}

        <TextInput
          placeholder="Parada"
          value={paradaText}
          onFocus={() => setCampoAtivo("parada")}
          onChangeText={(t) => {
            setParadaText(t);
            buscar(t, "parada");
          }}
          style={styles.input}
        />
        {paradaText.length > 0 && (
          <TouchableOpacity onPress={() => limparInput("parada")}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.botao} onPress={calcularRota}>
          <Text style={styles.botaoTexto}>Calcular Rota</Text>
        </TouchableOpacity>

        {preco && <Text style={styles.preco}>R$ {preco.toFixed(2)}</Text>}
      </View>

      <FlatList
        keyboardShouldPersistTaps="handled"
        style={styles.lista}
        data={sugestoes}
        keyExtractor={(item) => item.place_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={async () => {
              const coords = await pegarCoords(item.place_id);

              if (campoAtivo === "origem") {
                setOrigem(coords);
                setOrigemText(item.description);
              }

              if (campoAtivo === "destino") {
                setDestino(coords);
                setDestinoText(item.description);
              }

              if (campoAtivo === "parada") {
                setParadas((prev) => [
                  ...prev,
                  { coord: coords, nome: item.description },
                ]);
                setParadaText(item.description);
              }

              setSugestoes([]);
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.item}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  card: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },

  input: {
    backgroundColor: "#f1f1f1",
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },

  clear: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },

  lista: {
    position: "absolute",
    bottom: 200,
    width: "100%",
    backgroundColor: "#fff",
    maxHeight: 200,
  },

  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  botao: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
  },

  preco: {
    textAlign: "center",
    marginTop: 10,
    fontWeight: "bold",
  },

  web: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  webText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
