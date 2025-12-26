// Kafka producer for analytics events
// This is a placeholder that can be connected to a real Kafka cluster

import { Kafka, Producer } from "kafkajs"

interface AnalyticsEvent {
  type: string
  [key: string]: any
}

let producer: Producer | null = null
let isKafkaEnabled = false

async function initProducer() {
  if (producer) return producer

  try {
    // Only initialize if Kafka is enabled
    if (process.env.KAFKA_ENABLED !== "true") {
      console.log("[v0] Kafka disabled - events will be logged only")
      return null
    }

    const kafka = new Kafka({
      clientId: "connect-four-producer",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    })

    producer = kafka.producer()
    await producer.connect()
    isKafkaEnabled = true
    console.log("[v0] Kafka producer connected successfully")
    return producer
  } catch (error) {
    console.error("[v0] Failed to initialize Kafka producer:", error)
    isKafkaEnabled = false
    return null
  }
}

export async function sendAnalyticsEvent(event: AnalyticsEvent) {
  try {
    // Always log for debugging
    console.log("[v0] Analytics Event:", JSON.stringify(event, null, 2))

    // Initialize producer if needed
    if (!producer && process.env.KAFKA_ENABLED === "true") {
      await initProducer()
    }

    // Send to Kafka if enabled and connected
    if (isKafkaEnabled && producer) {
      await producer.send({
        topic: process.env.KAFKA_TOPIC || "game-analytics",
        messages: [
          {
            key: event.gameId || event.type,
            value: JSON.stringify(event),
            timestamp: Date.now().toString(),
          },
        ],
      })
      console.log("[v0] Event sent to Kafka successfully")
    }
  } catch (error) {
    console.error("[v0] Failed to send analytics event:", error)
    // Don't throw - analytics failures shouldn't break the game
  }
}

// Cleanup on shutdown
export async function closeProducer() {
  if (producer) {
    await producer.disconnect()
    console.log("[v0] Kafka producer disconnected")
  }
}
