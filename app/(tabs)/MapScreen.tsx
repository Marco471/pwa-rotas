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

type Parada = {
  id: string;
  coord: Coord;
  nome: string;
};

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [location, setLocation] = useState<Coord | null>(null);

  const [origem, setOrigem] = useState<Coord | null>(null);
  const [destino, setDestino] = useState<Coord | null>(null);

  const [origemText, setOrigemText] = useState("");
  const [destinoText, setDestinoText] = useState("");
  const [paradaText, setParadaText] = useState("");

  const [paradas, setParadas] = useState<Parada[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<Campo>("destino");

  const [rota, setRota] = useState<Coord[]>([]);
  const [preco, setPreco] = useState<number | null>(null);

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

  // 🌐 BLOQUEIO WEB
  if (Platform.OS === "web") {
    return (
      <View style={styles.web}>
        <Text style={{ textAlign: "center" }}>
          🚫 Mapa não disponível na web. Use o celular.
        </Text>
      </View>
    );
  }

  const buscar = async (texto: string, campo: Campo) => {
    if (!texto || texto.length < 2) {
      setSugestoes([]);
      return;
    }

    setCampoAtivo(campo);

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${texto}&key=${TOKEN}&language=pt-BR&components=country:br`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OK") {
      setSugestoes(data.predictions);
    } else {
      setSugestoes([]);
    }
  };

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

  const calcularRota = async () => {
    if (!origem || !destino) {
      Alert.alert("Erro", "Selecione origem e destino");
      return;
    }

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
      }));

    setRota(pontos);

    const km =
      data.routes[0].legs.reduce((acc: number, leg: any) => {
        return acc + leg.distance.value;
      }, 0) / 1000;

    setPreco(km * 2.5);

    mapRef.current?.fitToCoordinates(pontos, {
      edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
      animated: true,
    });
  };

  const removerParada = (id: string) => {
    setParadas((prev) => prev.filter((p) => p.id !== id));
  };

  const limparInput = (tipo: Campo) => {
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

    setSugestoes([]);
    setRota([]);
    setPreco(null);
  };

  if (!location) return <ActivityIndicator size="large" />;

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

        {paradas.map((p) => (
          <Marker key={p.id} coordinate={p.coord} pinColor="orange" />
        ))}

        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeWidth={4} strokeColor="blue" />
        )}
      </MapView>

      <View style={styles.card}>
        {/* ORIGEM */}
        <View style={styles.inputBox}>
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
        </View>

        {/* DESTINO */}
        <View style={styles.inputBox}>
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
        </View>

        {/* PARADA */}
        <View style={styles.inputBox}>
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
        </View>

        {/* PARADAS LISTA */}
        {paradas.map((p) => (
          <View key={p.id} style={styles.paradaItem}>
            <Text>{p.nome}</Text>
            <TouchableOpacity onPress={() => removerParada(p.id)}>
              <Text style={{ color: "red", fontWeight: "bold" }}>X</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.btn} onPress={calcularRota}>
          <Text style={{ color: "#fff" }}>Calcular Rota</Text>
        </TouchableOpacity>

        {preco && (
          <Text style={{ textAlign: "center", marginTop: 10 }}>
            R$ {preco.toFixed(2)}
          </Text>
        )}
      </View>

      <FlatList
        data={sugestoes}
        keyExtractor={(item) => item.place_id}
        style={styles.list}
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
                const nova: Parada = {
                  id: String(Date.now()),
                  coord: coords,
                  nome: item.description,
                };

                setParadas((prev) => [...prev, nova]);
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

  web: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    padding: 10,
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    marginBottom: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
  },

  input: {
    flex: 1,
    padding: 10,
  },

  clear: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },

  paradaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f1f1",
    padding: 8,
    marginBottom: 5,
  },

  btn: {
    backgroundColor: "black",
    padding: 12,
    alignItems: "center",
    borderRadius: 6,
  },

  list: {
    position: "absolute",
    bottom: 220,
    width: "100%",
    backgroundColor: "#fff",
  },

  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
});
