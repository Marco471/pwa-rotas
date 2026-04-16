import axios from "axios";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, TextInput, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type Coord = {
  latitude: number;
  longitude: number;
};

export default function MapScreen() {
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [destination, setDestination] = useState("");
  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);

  const API_KEY =
    "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEyMTRiNjQxOWFmNzQ3NWNhOTg0YjIxZTZhZTJlY2VmIiwiaCI6Im11cm11cjY0In0="; //

  // 📍 Localização
  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permissão negada");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    };

    getLocation();
  }, []);

  // 🚗 Buscar rota (PROFISSIONAL + PROTEGIDO)
  const getRoute = useCallback(async () => {
    if (!destination || !location) return;

    try {
      // 🔎 GEOCODE
      const geoResponse = await axios.get(
        "https://api.openrouteservice.org/geocode/search",
        {
          params: {
            api_key: API_KEY,
            text: destination,
            size: 1,
          },
        },
      );

      const features = geoResponse.data?.features;

      if (!features || features.length === 0) {
        console.log("GEOCODE:", geoResponse.data);
        Alert.alert("Destino não encontrado");
        return;
      }

      const coordsDestino = features[0]?.geometry?.coordinates;

      if (!coordsDestino) {
        Alert.alert("Erro nas coordenadas do destino");
        return;
      }

      // 🚗 DIRECTIONS (GEOJSON)
      const routeResponse = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        {
          coordinates: [
            [location.longitude, location.latitude],
            [coordsDestino[0], coordsDestino[1]],
          ],
          format: "geojson",
        },
        {
          headers: {
            Authorization: API_KEY,
            "Content-Type": "application/json",
          },
        },
      );

      const routeData = routeResponse.data;

      if (
        !routeData ||
        !routeData.features ||
        routeData.features.length === 0
      ) {
        console.log("ROTA RESPONSE:", routeData);
        Alert.alert("Erro na rota");
        return;
      }

      const coords = routeData.features[0]?.geometry?.coordinates;

      if (!coords) {
        console.log("SEM COORDENADAS:", routeData);
        Alert.alert("Erro ao processar rota");
        return;
      }

      const formatted: Coord[] = coords.map((c: number[]) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      setRouteCoords(formatted);
    } catch (error: any) {
      console.log("ERRO COMPLETO:", error?.response?.data || error.message);
      Alert.alert("Erro ao buscar rota");
    }
  }, [destination, location]);

  // 🔥 Busca automática
  useEffect(() => {
    if (destination.length > 5 && location) {
      const timeout = setTimeout(() => {
        getRoute();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [destination, location, getRoute]);

  if (!location) return null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={location} title="Você" />

        {routeCoords.length > 0 && (
          <>
            <Polyline coordinates={routeCoords} strokeWidth={4} />
            <Marker
              coordinate={routeCoords[routeCoords.length - 1]}
              title="Destino"
            />
          </>
        )}
      </MapView>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Digite o destino"
          value={destination}
          onChangeText={setDestination}
          style={styles.input}
        />

        {/* botão opcional */}
        <Button title="Buscar rota" onPress={getRoute} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  inputContainer: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 5,
  },
});
