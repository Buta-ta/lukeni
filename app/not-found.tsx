import AwaleGame from '@/components/AwaleGame';

export default function NotFound() {
  return (
    <AwaleGame 
      isError={true} 
      message="La page que vous cherchez s'est perdue dans le temps... Prenez le temps d'une partie d'Awalé." 
    />
  );
}