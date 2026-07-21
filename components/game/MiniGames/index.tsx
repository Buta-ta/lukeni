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

// ✅ NOUVEAUX IMPORTS
import CounterfeitGame from "./CounterfeitGame";
import ExchangeRateGame from "./ExchangeRateGame";
import BankingFlowGame from "./BankingFlowGame";
import TreasuryCalculGame from "./TreasuryCalculGame";
import AnomalyDetectorGame from "./AnomalyDetectorGame";

import CustomsContrabandGame from "./CustomsContrabandGame";
import SignatureAnalysisGame from "./SignatureAnalysisGame";
import ContractClausesGame from "./ContractClausesGame";
import StockManipulationGame from "./StockManipulationGame";

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
  // ✅ NOUVEAUX EXPORTS
  CounterfeitGame,
  ExchangeRateGame,
  BankingFlowGame,
  TreasuryCalculGame,
  AnomalyDetectorGame,
  CustomsContrabandGame,
  SignatureAnalysisGame,
  ContractClausesGame,
  StockManipulationGame,
};

export interface MiniGameProps {
  miniGame: any;
  onComplete: (score: number, caurisEarned: number) => void;
  onFail: (caurisLost: number) => void;
  onClose: () => void;
  onProgressUpdate?: (budgetCauris: number, caurisLost: number) => void;
  budgetCauris: number;
  lang: "fr" | "en";
  sessionId: string;
  userId: string;
  onStateChange?: (state: any) => void;
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

    // ✅ NOUVEAUX CAS
    case "counterfeit":
      return <CounterfeitGame miniGame={miniGame} {...rest} />;
    case "exchange_rate":
      return <ExchangeRateGame miniGame={miniGame} {...rest} />;
    case "banking_flow":
      return <BankingFlowGame miniGame={miniGame} {...rest} />;
    case "treasury_calcul":
      return <TreasuryCalculGame miniGame={miniGame} {...rest} />;
    case "anomaly_detector":
      return <AnomalyDetectorGame miniGame={miniGame} {...rest} />;


          case "customs_contraband":
      return <CustomsContrabandGame miniGame={miniGame} {...rest} />;
    case "signature_analysis":
      return <SignatureAnalysisGame miniGame={miniGame} {...rest} />;
    case "contract_clauses":
      return <ContractClausesGame miniGame={miniGame} {...rest} />;
    case "stock_manipulation":
      return <StockManipulationGame miniGame={miniGame} {...rest} />;

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