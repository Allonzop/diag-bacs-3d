import { useEffect } from 'react';
import { useApp } from '../etat/store';
import { Accueil } from './Accueil';
import { EcranProjet } from './EcranProjet';

export function App() {
  const projet = useApp((s) => s.projet);
  const message = useApp((s) => s.message);
  const setEnLigne = useApp((s) => s.setEnLigne);

  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, [setEnLigne]);

  return (
    <>
      {projet ? <EcranProjet /> : <Accueil />}
      {message && (
        <div className={`message ${message.genre}`} role="status">
          {message.texte}
        </div>
      )}
    </>
  );
}
