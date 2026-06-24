// lib/wordSearchGenerator.ts

type Direction = 'right' | 'down' | 'diagonal-right' | 'diagonal-left' | 'left' | 'up';

interface WordPlacement {
    word: string;
    startRow: number;
    startCol: number;
    direction: Direction;
    cells: { row: number; col: number }[];
}

interface WordSearchResult {
    grid: string[][];
    placements: WordPlacement[];
}

const DIRECTIONS_EASY: Direction[] = ['right', 'down', 'diagonal-right'];
const DIRECTIONS_HARD: Direction[] = ['right', 'down', 'diagonal-right', 'left', 'up', 'diagonal-left'];

function getDirectionDelta(direction: Direction): { dr: number; dc: number } {
  switch (direction) {
    case 'right': return { dr: 0, dc: 1 };
    case 'left': return { dr: 0, dc: -1 };
    case 'down': return { dr: 1, dc: 0 };
    case 'up': return { dr: -1, dc: 0 };
    case 'diagonal-right': return { dr: 1, dc: 1 };
    case 'diagonal-left': return { dr: 1, dc: -1 };
    default: return { dr: 0, dc: 1 };
  }
}

function canPlaceWord(
    grid: string[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
    size: number
): boolean {
    const { dr, dc } = getDirectionDelta(direction);
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
    }
    return true;
}

export function generateWordSearch(words: string[], size: number = 12, isHard: boolean = false): WordSearchResult {
    // Trier les mots du plus long au plus court
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    const placements: WordPlacement[] = [];

    for (const word of sortedWords) {
        const upperWord = word.toUpperCase().replace(/[^A-ZÀ-ÿ]/g, '');
        if (!upperWord) continue;

        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 200) {
            const directions = isHard ? DIRECTIONS_HARD : DIRECTIONS_EASY;
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);

            if (canPlaceWord(grid, upperWord, row, col, direction, size)) {
                const { dr, dc } = getDirectionDelta(direction);
                const cells: { row: number; col: number }[] = [];

                for (let i = 0; i < upperWord.length; i++) {
                    const r = row + i * dr;
                    const c = col + i * dc;
                    grid[r][c] = upperWord[i];
                    cells.push({ row: r, col: c });
                }

                placements.push({ word: upperWord, startRow: row, startCol: col, direction, cells });
                placed = true;
            }
            attempts++;
        }

        // Si impossible de placer, on l'ignore (ne devrait pas arriver avec une grille assez grande)
    }

    // Remplir les cases vides avec des lettres aléatoires
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }

    return { grid, placements };
}