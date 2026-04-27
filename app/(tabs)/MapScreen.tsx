import polyline from "@mapbox/polyline";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";

// ⚠️ COLOQUE SUA CHAVE COMPLETA AQUI
const TOKEN = "AIzaSyAK6k7lAFnl4NS4WVgRJ6Fl4Gnzx5ZLUKM";

type Coord = {
  latitude: number;
  longitude: number;
};

type Campo = "origem" | "destino" | "parada";

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Coord | null>(null);

  const [origem, setOrigem] = useState<Coord | null>(null);
  const [destino, setDestino] = useState<Coord | null>(null);

  const [origemText, setOrigemText] = useState("");
  const [destinoText, setDestinoText] = useState("");
  const [paradaText, setParadaText] = useState("");

  const [paradas, setParadas] = useState<Coord[]>([]);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<Campo>("destino");

  const [rota, setRota] = useState<Coord[]>([]);
  const [preco, setPreco] = useState<number | null>(null);

  // ================= GPS =================
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

  // ================= AUTOCOMPLETE =================
  const buscar = async (texto: string, campo: Campo) => {
    if (!texto || texto.length < 2) return setSugestoes([]);

    setCampoAtivo(campo);

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${texto}&key=${TOKEN}&language=pt-BR`,
      );

      const data = await res.json();

      if (data.status !== "OK") {
        setSugestoes([]);
        return;
      }

      setSugestoes(data.predictions || []);
    } catch (err) {
      console.log(err);
    }
  };

  // ================= COORDENADAS =================
  const pegarCoords = async (placeId: string) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${TOKEN}`,
    );

    const data = await res.json();
    const loc = data.result.geometry.location;

    return {
      latitude: loc.lat,
      longitude: loc.lng,
    };
  };

  // ================= PREÇO =================
  const calcularPreco = (data: any) => {
    const km =
      data.routes[0].legs.reduce((acc: number, leg: any) => {
        return acc + leg.distance.value;
      }, 0) / 1000;

    setPreco(km * 2.5);
  };

  // ================= ROTA =================
  const calcularRota = async () => {
    if (!origem || !destino) return;

    const waypoints =
      paradas.length > 0
        ? `&waypoints=${paradas
            .map((p) => `${p.latitude},${p.longitude}`)
            .join("|")}`
        : "";

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origem.latitude},${origem.longitude}&destination=${destino.latitude},${destino.longitude}${waypoints}&key=${TOKEN}`,
    );

    const data = await res.json();

    if (data.status !== "OK") return;

    const pontos = polyline
      .decode(data.routes[0].overview_polyline.points)
      .map((p: number[]) => ({
        latitude: p[0],
        longitude: p[1],
      }));

    setRota(pontos);
    calcularPreco(data);
  };

  // ================= LIMPAR TUDO =================
  const limparTudo = () => {
    setOrigem(null);
    setDestino(null);
    setParadas([]);

    setOrigemText("");
    setDestinoText("");
    setParadaText("");

    setRota([]); // 🔥 remove linha do mapa
    setPreco(null);

    setSugestoes([]);
  };

  if (!location) return <ActivityIndicator size="large" />;

  return (
    <View style={{ flex: 1 }}>
      {/* MAPA */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
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
          <Marker key={i} coordinate={p} pinColor="orange" />
        ))}

        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeWidth={4} strokeColor="blue" />
        )}
      </MapView>

      {/* INPUTS */}
      <View style={styles.top}>
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

        <TextInput
          placeholder="Adicionar parada"
          value={paradaText}
          onFocus={() => setCampoAtivo("parada")}
          onChangeText={(t) => {
            setParadaText(t);
            buscar(t, "parada");
          }}
          style={styles.input}
        />

        {/* PARADAS */}
        {paradas.map((p, index) => (
          <View key={index} style={styles.paradaItem}>
            <Text style={{ flex: 1 }}>Parada {index + 1}</Text>

            <Pressable
              onPress={() => {
                setParadas(paradas.filter((_, i) => i !== index));
              }}
            >
              <Text style={{ color: "red", fontWeight: "bold" }}>X</Text>
            </Pressable>
          </View>
        ))}

        <TouchableOpacity style={styles.botao} onPress={calcularRota}>
          <Text style={{ color: "#fff" }}>Calcular Rota</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={limparTudo}>
          <Text style={{ color: "#fff" }}>Limpar Tudo</Text>
        </TouchableOpacity>

        {preco !== null && (
          <Text style={styles.preco}>Preço: R$ {preco.toFixed(2)}</Text>
        )}
      </View>

      {/* SUGESTÕES */}
      <FlatList
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
                setParadas((prev) => [...prev, coords]);
                setParadaText("");
              }

              setSugestoes([]);
            }}
          >
            <Text style={styles.item}>{item.description}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 40,
    width: "100%",
  },

  input: {
    backgroundColor: "#fff",
    margin: 5,
    padding: 10,
    borderRadius: 8,
  },

  lista: {
    position: "absolute",
    top: 180,
    width: "100%",
    backgroundColor: "#fff",
    maxHeight: 200,
  },

  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  botao: {
    backgroundColor: "#000",
    margin: 10,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  preco: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 5,
    color: "#000",
  },

  paradaItem: {
    flexDirection: "row",
    backgroundColor: "#eee",
    marginHorizontal: 10,
    marginTop: 5,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
});
