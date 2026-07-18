"use client";

import CanvasGame from "./CanvasGame";
import PortraitGame from "./PortraitGame";
import ChemicalGame from "./ChemicalGame";
import BallisticsGame from "./BallisticsGame";
import RadioGame from "./RadioGame";
import PuzzleGame from "./PuzzleGame";
import MapGame from "./MapGame";
import CryptexGame from "./CryptexGame";
import CipherGame from "./CipherGame";
import TeletypeGame from "./TeletypeGame";
import TranslationGame from "./TranslationGame";
import RedactedGame from "./RedactedGame";


export {
  CanvasGame,
  PortraitGame,
  ChemicalGame,
  BallisticsGame,
  RadioGame,
  PuzzleGame,
  MapGame,
  CryptexGame,
  CipherGame,
  TeletypeGame,
  TranslationGame,
  RedactedGame,
};

export interface MiniGameProps {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  onProgressUpdate?: (budgetCauris: number, caurisLost: number) => void; // ✅ NOUVEAU
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
  userId: string;
}

export function MiniGameRenderer(props: MiniGameProps) {
  const { miniGame, ...rest } = props;
  const type = miniGame?.type;

  switch (type) {
    case "canvas":
      return <CanvasGame miniGame={miniGame} {...rest} />;
    case "portrait":
      return <PortraitGame miniGame={miniGame} {...rest} />;
    case "chemical":
      return <ChemicalGame miniGame={miniGame} {...rest} />;
    case "ballistics":
      return <BallisticsGame miniGame={miniGame} {...rest} />;
    case "radio":
      return <RadioGame miniGame={miniGame} {...rest} />;
    case "puzzle":
      return <PuzzleGame miniGame={miniGame} {...rest} />;

    case "cryptex":
      return <CryptexGame miniGame={miniGame} {...rest} />;
    case "cipher":
      return <CipherGame miniGame={miniGame} {...rest} />;
    case "map":
      return <MapGame miniGame={miniGame} {...rest} />;

    case "teletype":
      return <TeletypeGame miniGame={miniGame} {...rest} />;

    case "translation":
      return <TranslationGame miniGame={miniGame} {...rest} />;

    case "redacted":
      return <RedactedGame miniGame={miniGame} {...rest} />;


    default:
      return (
        <div className="p-6 text-center text-gray-400 font-mono text-sm border border-dashed border-gray-700 rounded-lg">
          <p>
            ⚠️ Type de mini-jeu inconnu ou en développement :{" "}
            <span className="text-white font-bold">{type}</span>
          </p>
        </div>
      );
  }
}
