import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameRoom } from '@/types/game';

const TOTAL_PITS = 12;
const INITIAL_SEEDS = 4;

// Logique métier pure (même pour local et online)
const simulateMoveLogic = (board: number[], pitIndex: number, isPlayer1: boolean) => {
  let newBoard = [...board];
  let seeds = newBoard[pitIndex];
  newBoard[pitIndex] = 0;
  
  let curr = pitIndex;
  
  // Semis
  while (seeds > 0) {
    curr = (curr + 1) % TOTAL_PITS;
    if (curr === pitIndex) continue;
    newBoard[curr]++;
    seeds--;
  }

  let capturedSeeds = 0;
  let checkIdx = curr;

  // Vérification capture
  const isOpponentSide = (idx: number) => isPlayer1 ? (idx >= 6 && idx <= 11) : (idx >= 0 && idx <= 5);
  
  if (isOpponentSide(checkIdx)) {
    const oppStart = isPlayer1 ? 6 : 0;
    const oppEnd = isPlayer1 ? 11 : 5;
    let totalOpponentSeeds = 0;
    for (let i = oppStart; i <= oppEnd; i++) totalOpponentSeeds += newBoard[i];

    let tempBoard = [...newBoard];
    let tempCaptured = 0;

    while (isOpponentSide(checkIdx) && (tempBoard[checkIdx] === 2 || tempBoard[checkIdx] === 3)) {
      tempCaptured += tempBoard[checkIdx];
      tempBoard[checkIdx] = 0;
      checkIdx--;
      if (checkIdx < 0 || checkIdx >= TOTAL_PITS) break;
      if (isPlayer1 && checkIdx < 6) break;
      if (!isPlayer1 && checkIdx > 5) break;
    }

    if (tempCaptured < totalOpponentSeeds) {
      newBoard = tempBoard;
      capturedSeeds = tempCaptured;
    }
  }

  return { newBoard, capturedSeeds, lastIndex: curr };
};

const checkEndGameCondition = (board: number[]) => {
  const topEmpty = board.slice(0, 6).every(s => s === 0);
  const bottomEmpty = board.slice(6, 12).every(s => s === 0);
  return topEmpty || bottomEmpty;
};

export function useGameRoom(gameId: string, userId: string) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [myRole, setMyRole] = useState<'PLAYER_1' | 'PLAYER_2' | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const loadRoom = async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (data) {
        setRoom(data);
        if (data.player1_id === userId) setMyRole('PLAYER_1');
        else if (data.player2_id === userId) setMyRole('PLAYER_2');
      }
    };
    loadRoom();

    const channel = supabase.channel(`game_room:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        const newRoom = payload.new as GameRoom;
        setRoom(newRoom);
        if (newRoom.player1_id === userId) setMyRole('PLAYER_1');
        else if (newRoom.player2_id === userId) setMyRole('PLAYER_2');
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId, userId]);

  const makeMove = useCallback(async (pitIndex: number) => {
    if (!room || !myRole) return;
    
    if ((room.current_turn === 'PLAYER_1' && myRole !== 'PLAYER_1') ||
        (room.current_turn === 'PLAYER_2' && myRole !== 'PLAYER_2')) {
      return;
    }

    const isPlayer1 = myRole === 'PLAYER_1';
    const { newBoard, capturedSeeds } = simulateMoveLogic(room.board, pitIndex, isPlayer1);
    
    const updates: any = {
      board: newBoard,
      last_move_at: new Date().toISOString(),
      current_turn: isPlayer1 ? 'PLAYER_2' : 'PLAYER_1'
    };

    if (isPlayer1) updates.player1_score = room.player1_score + capturedSeeds;
    else updates.player2_score = room.player2_score + capturedSeeds;

    if (checkEndGameCondition(newBoard)) {
      updates.status = 'FINISHED';
      const p1Final = updates.player1_score || room.player1_score;
      const p2Final = updates.player2_score || room.player2_score;
      const p1Remaining = newBoard.slice(0,6).reduce((a,b) => a+b, 0);
      const p2Remaining = newBoard.slice(6,12).reduce((a,b) => a+b, 0);
      const finalP1 = p1Final + p1Remaining;
      const finalP2 = p2Final + p2Remaining;
      
      if (finalP1 > finalP2) updates.winner = room.player1_id;
      else if (finalP2 > finalP1) updates.winner = room.player2_id;
      else updates.winner = 'DRAW';
    }

    await supabase.from('game_rooms').update(updates).eq('id', gameId);
    
    // Envoyer message système dans le chat
    await supabase.from('game_messages').insert({
      game_id: gameId,
      user_id: userId,
      content: `${isPlayer1 ? 'Joueur 1' : 'Joueur 2'} a capturé ${capturedSeeds} graines`,
      type: 'system'
    });

  }, [room, myRole, gameId, userId]);

  return { room, myRole, makeMove };
}