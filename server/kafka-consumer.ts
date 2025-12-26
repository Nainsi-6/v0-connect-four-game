import { Kafka } from "kafkajs"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

async function startConsumer() {
  if (!process.env.KAFKA_BROKER || process.env.KAFKA_ENABLED !== "true") {
    console.log("[v0] Kafka consumer disabled or not configured")
    return
  }

  const kafka = new Kafka({
    clientId: "connect-four-analytics-consumer",
    brokers: [process.env.KAFKA_BROKER],
  })

  const consumer = kafka.consumer({ groupId: "analytics-group" })

  await consumer.connect()
  console.log("[v0] Kafka consumer connected successfully")

  await consumer.subscribe({
    topic: process.env.KAFKA_TOPIC || "game-analytics",
    fromBeginning: false,
  })

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const eventData = JSON.parse(message.value?.toString() || "{}")

        await sql(
          `INSERT INTO analytics_events (event_type, game_id, player, metadata, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            eventData.type,
            eventData.gameId || null,
            eventData.player || eventData.winner || null,
            JSON.stringify(eventData),
            eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
          ],
        )

        console.log(`[v0] Kafka Consumer: Persisted ${eventData.type} event to DB`)
      } catch (error) {
        console.error("[v0] Kafka Consumer Error:", error)
      }
    },
  })
}

startConsumer().catch(console.error)
