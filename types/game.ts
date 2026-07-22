export type Player = 'PLAYER' | 'AI' | 'PLAYER_1' | 'PLAYER_2';
export type GameMode = 'MENU' | 'LOCAL' | 'ONLINE_CREATE' | 'ONLINE_JOIN' | 'ONLINE_PLAY';
export type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

export interface GameRoom {
  id: string;
  code: string;
  status: GameStatus;
  player1_id: string;
  player2_id: string | null;
  current_turn: 'PLAYER_1' | 'PLAYER_2';
  board: number[];
  player1_score: number;
  player2_score: number;
  winner: string | null;
  created_at: string;
  last_move_at: string;
}

export interface GameMessage {
  id: string;
  game_id: string;
  user_id: string;
  content: string;
  created_at: string;
  type: 'text' | 'system';
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    username?: string;
  };
}

export interface GamePresence {
  user_id: string;
  online_at: string;
  role?: 'PLAYER_1' | 'PLAYER_2' | 'SPECTATOR';
  full_name?: string;
  avatar_url?: string;
}

export interface PresenceUser {
  user_id: string;
  online_at: string;
  full_name?: string;
  avatar_url?: string;
  username?: string;
}