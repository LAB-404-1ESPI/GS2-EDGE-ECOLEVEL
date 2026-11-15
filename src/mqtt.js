
import mqtt from "mqtt";

const MQTT_URL = import.meta.env.VITE_MQTT_URL;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;

export function conectarMQTT(onStatus, onMessage) {
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
  });

  client.on("connect", () => {
    console.log("Conectado à EMQX Cloud!");

    onStatus("Conectado");

    client.subscribe(MQTT_TOPIC, (error) => {
      if (error) {
        console.error("Erro ao assinar tópico:", error);
      } else {
        console.log("Inscrito no tópico:", MQTT_TOPIC);
      }
    });
  });

  client.on("message", (topic, message) => {
    try {
      const dados = JSON.parse(message.toString());

      console.log("Pesagem recebida:", dados);

      onMessage(dados);
    } catch (error) {
      console.error("Erro ao interpretar mensagem:", error);
    }
  });

  client.on("error", (error) => {
    console.error("Erro MQTT:", error);
    onStatus("Erro");
  });

  client.on("close", () => {
    onStatus("Desconectado");
  });

  return client;
}
