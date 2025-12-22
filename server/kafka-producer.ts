import { Kafka, type Producer } from "kafkajs"

let producer: Producer | null = null
let kafka: Kafka | null = null

export async function initKafka() {
  if (!process.env.KAFKA_BROKER) {
    console.log("[v0] Kafka not configured, skipping analytics")
    return
  }

  try {
    kafka = new Kafka({
      clientId: "connect-four-game",
      brokers: [process.env.KAFKA_BROKER],
    })

    producer = kafka.producer()
    await producer.connect()
    console.log("[v0] Kafka producer connected")
  } catch (error) {
    console.error("[v0] Kafka connection error:", error)
    producer = null
  }
}

export async function sendGameEvent(event: {
  type: "GAME_START" | "GAME_END" | "PLAYER_MOVE"
  gameId: string
  player1: string
  player2: string
  isBot?: boolean
  winner?: string
  isDraw?: boolean
  movesCount?: number
  durationSeconds?: number
  timestamp: Date
}) {
  if (!producer) return

  try {
    await producer.send({
      topic: "game-analytics",
      messages: [
        {
          key: event.gameId,
          value: JSON.stringify(event),
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error sending Kafka event:", error)
  }
}

export async function disconnectKafka() {
  if (producer) {
    await producer.disconnect()
  }
}
