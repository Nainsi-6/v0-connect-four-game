-- Create tables for 4-in-a-Row game

-- Players table to track player statistics
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table to store completed games
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) UNIQUE NOT NULL,
  winner VARCHAR(255),
  loser VARCHAR(255),
  duration INTEGER NOT NULL, -- in seconds
  is_draw BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events table (optional - for Kafka consumer to write to)
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  game_id VARCHAR(255),
  player VARCHAR(255),
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON games(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_game_id ON analytics_events(game_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
