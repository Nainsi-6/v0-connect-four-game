-- Create games table to store all game results
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  player1 VARCHAR(255) NOT NULL,
  player2 VARCHAR(255) NOT NULL,
  winner VARCHAR(255),
  is_draw BOOLEAN DEFAULT FALSE,
  is_bot_game BOOLEAN DEFAULT FALSE,
  moves_count INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create players table to track player statistics
CREATE TABLE IF NOT EXISTS players (
  username VARCHAR(255) PRIMARY KEY,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);

-- Insert some sample data for testing
INSERT INTO players (username, wins, losses, draws, total_games) 
VALUES 
  ('Alice', 15, 5, 2, 22),
  ('Bob', 12, 8, 1, 21),
  ('Charlie', 10, 7, 3, 20),
  ('Diana', 8, 10, 2, 20),
  ('Eve', 5, 12, 1, 18)
ON CONFLICT (username) DO NOTHING;
