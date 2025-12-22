-- Seed some initial data for testing

-- Insert sample players
INSERT INTO players (username, total_games, wins, losses, draws)
VALUES 
  ('GameMaster', 50, 35, 12, 3),
  ('ProPlayer', 45, 28, 15, 2),
  ('CasualGamer', 30, 15, 14, 1),
  ('BotSlayer', 40, 32, 7, 1),
  ('Strategist', 38, 25, 10, 3)
ON CONFLICT (username) DO NOTHING;
