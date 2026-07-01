import {Download, Share, X} from 'lucide-react';
import {useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

const DISMISS_KEY = 'axisfin-install-prompt-dismissed';

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as Navigator & {standalone?: boolean}).standalone));
    if (standalone || sessionStorage.getItem(DISMISS_KEY)) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setShowIosHelp(true);
      setVisible(true);
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  }

  if (!visible) return null;

  return (
    <aside className="pwa-install-prompt" aria-label="Instalar Axis Fin">
      <button type="button" onClick={dismiss} className="pwa-install-close" aria-label="Fechar">
        <X size={16} />
      </button>
      <div className="flex min-w-0 items-center gap-3">
        <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Instale o Axis Fin</p>
          <p className="mt-0.5 text-xs leading-4 text-slate-400">
            {showIosHelp ? (
              <>
                Toque em <Share className="mx-0.5 inline" size={13} /> e depois em “Adicionar à Tela de Início”.
              </>
            ) : (
              'Acesse mais rápido, em tela cheia e com suporte offline.'
            )}
          </p>
        </div>
      </div>
      {installEvent ? (
        <button type="button" onClick={() => void install()} className="pwa-install-button">
          <Download size={15} />
          Instalar
        </button>
      ) : null}
    </aside>
  );
}
