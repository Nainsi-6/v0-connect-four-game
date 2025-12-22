import { Kafka } from "kafkajs"

async function startConsumer() {
  if (!process.env.KAFKA_BROKER) {
    console.log("[v0] Kafka not configured, exiting consumer")
    return
  }

  const kafka = new Kafka({
    clientId: "connect-four-analytics",
    brokers: [process.env.KAFKA_BROKER],
  })

  const consumer = kafka.consumer({ groupId: "analytics-group" })

  await consumer.connect()
  console.log("[v0] Kafka consumer connected")

  await consumer.subscribe({ topic: "game-analytics", fromBeginning: true })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value?.toString() || "{}")

      console.log("[v0] Analytics Event:", {
        type: event.type,
        gameId: event.gameId,
        timestamp: event.timestamp,
      })

      // Here you would typically:
      // 1. Store analytics in a separate analytics database
      // 2. Update real-time dashboards
      // 3. Calculate metrics like average game duration, win rates, etc.

      switch (event.type) {
        case "GAME_START":
          console.log(`[v0] Game started: ${event.player1} vs ${event.player2}`)
          break
        case "GAME_END":
          console.log(`[v0] Game ended: Winner ${event.winner || "Draw"} in ${event.movesCount} moves`)
          break
        case "PLAYER_MOVE":
          console.log(`[v0] Player move recorded`)
          break
      }
    },
  })
}

startConsumer().catch(console.error)
