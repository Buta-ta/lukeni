"use client";

import AwaleGame from '@/components/AwaleGame';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Tu peux envoyer l'erreur à Sentry / ton backend ici
    console.error("Erreur critique capturée :", error);
  }, [error]);

  return (
    <AwaleGame 
      isError={true} 
      message="Une tempête de sable a perturbé le réseau. Pendant que nous réparons ça, jouez donc à l'Awalé !" 
    />
  );
}