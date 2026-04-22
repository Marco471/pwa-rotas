import polyline from "@mapbox/polyline";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const TOKEN = "AIzaSyCZY7og4lQFabtwv14BmU-b1WXbOPhT_Kw";

type Coord = {
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Coord | null>(null);
  const [origemCoords, setOrigemCoords] = useState<Coord | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<Coord | null>(null);

  const [origemText, setOrigemText] = useState("");
  const [destinoText, setDestinoText] = useState("");

  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [rota, setRota] = useState<Coord[]>([]);
  const [tempo, setTempo] = useState<number | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);

  const [campoAtivo, setCampoAtivo] = useState<"origem" | "destino">("destino");

  // 📍 GPS
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
      setOrigemCoords(user);
      setOrigemText("Minha localização");
    })();
  }, []);

  // 🔍 AUTOCOMPLETE
  const buscarSugestoes = async (texto: string) => {
    if (!texto) return setSugestoes([]);

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        texto,
      )}&key=${TOKEN}&language=pt-BR&components=country:br`,
    );

    const data = await res.json();
    setSugestoes(data.predictions || []);
  };

  // 📍 PLACE → COORD
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

  // 🌍 TEXTO → COORD
  const geocoding = async (endereco: string) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        endereco,
      )}&key=${TOKEN}`,
    );

    const data = await res.json();

    if (data.status !== "OK") return null;

    const loc = data.results[0].geometry.location;

    return {
      latitude: loc.lat,
      longitude: loc.lng,
    };
  };

  // 🚗 ROTA
  const calcularRota = async (origem: Coord, destino: Coord) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origem.latitude},${origem.longitude}&destination=${destino.latitude},${destino.longitude}&key=${TOKEN}`,
    );

    const data = await res.json();

    if (data.status !== "OK") {
      Alert.alert("Erro", "Não foi possível calcular rota");
      return;
    }

    const route = data.routes[0];

    setTempo(route.legs[0].duration.value);
    setDistancia(route.legs[0].distance.value);

    const pontos = polyline
      .decode(route.overview_polyline.points)
      .map((p: number[]) => ({
        latitude: p[0],
        longitude: p[1],
      }));

    setRota(pontos);

    mapRef.current?.fitToCoordinates(pontos, {
      edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
      animated: true,
    });
  };

  // 🔥 AUTO ATUALIZA ROTA (tipo Uber)
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (origemText && destinoText) {
        const origem = await geocoding(origemText);
        const destino = await geocoding(destinoText);

        if (origem && destino) {
          setOrigemCoords(origem);
          setDestinoCoords(destino);
          calcularRota(origem, destino);
        }
      }
    }, 800); // debounce (espera parar de digitar)

    return () => clearTimeout(delay);
  }, [origemText, destinoText]);

  if (!location) return <ActivityIndicator size="large" />;

  return (
    <View style={{ flex: 1 }}>
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
        <Marker coordinate={location} title="Você" />
        {origemCoords && <Marker coordinate={origemCoords} />}
        {destinoCoords && <Marker coordinate={destinoCoords} />}

        {rota.length > 0 && (
          <Polyline coordinates={rota} strokeWidth={4} strokeColor="blue" />
        )}
      </MapView>

      <View style={{ position: "absolute", top: 40, width: "100%" }}>
        <TextInput
          placeholder="Origem"
          value={origemText}
          onFocus={() => setCampoAtivo("origem")}
          onChangeText={(t) => {
            setOrigemText(t);
            setOrigemCoords(null);

            // limpa rota
            setRota([]);
            setTempo(null);
            setDistancia(null);

            buscarSugestoes(t);
          }}
          style={styles.input}
        />

        <TextInput
          placeholder="Destino"
          value={destinoText}
          onFocus={() => setCampoAtivo("destino")}
          onChangeText={(t) => {
            setDestinoText(t);
            setDestinoCoords(null);

            // limpa rota
            setRota([]);
            setTempo(null);
            setDistancia(null);

            buscarSugestoes(t);
          }}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={async () => {
            const origem = await geocoding(origemText);
            const destino = await geocoding(destinoText);

            if (!origem || !destino) {
              Alert.alert("Erro", "Digite endereço válido");
              return;
            }

            setOrigemCoords(origem);
            setDestinoCoords(destino);

            calcularRota(origem, destino);
          }}
        >
          <Text style={styles.botaoTexto}>Calcular Rota</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ position: "absolute", top: 180, width: "100%" }}>
        {sugestoes.map((item) => (
          <TouchableOpacity
            key={item.place_id}
            onPress={async () => {
              const coords = await pegarCoords(item.place_id);

              if (campoAtivo === "origem") {
                setOrigemCoords(coords);
                setOrigemText(item.description);
              } else {
                setDestinoCoords(coords);
                setDestinoText(item.description);
              }

              setSugestoes([]);
            }}
          >
            <Text style={styles.sugestao}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tempo && distancia && (
        <View style={styles.info}>
          <Text>⏱ {Math.round(tempo / 60)} min</Text>
          <Text>📏 {(distancia / 1000).toFixed(2)} km</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    padding: 10,
    margin: 5,
    borderRadius: 8,
  },
  sugestao: {
    padding: 10,
    backgroundColor: "#eee",
  },
  info: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
  },
  botao: {
    backgroundColor: "#000",
    padding: 12,
    margin: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
  },
});
