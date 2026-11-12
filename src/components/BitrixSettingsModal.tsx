import React, { useEffect, useState } from 'react';
import { Cloud, X, LogOut, LogIn } from 'lucide-react';
import { BitrixStatus } from '../types/timer';

interface BitrixSettingsModalProps {
  status: BitrixStatus;
  onStatusChange: (status: BitrixStatus) => void;
  onClose: () => void;
}

export const BitrixSettingsModal: React.FC<BitrixSettingsModalProps> = ({
  status,
  onStatusChange,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const api = window.electronAPI?.bitrix;

  useEffect(() => {
    return api?.onOAuthUrl((url) => setAuthUrl(url));
  }, [api]);

  const run = async (fn: () => Promise<{ ok: boolean } & Record<string, any>>) => {
    if (!api) {
      setError('Disponível apenas no aplicativo desktop.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await fn();
    setBusy(false);
    setAuthUrl('');
    if (res.ok) {
      onStatusChange(res.data as BitrixStatus);
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="modal-backdrop no-drag">
      <div className="exit-multi-modal bitrix-modal">
        <div className="exit-multi-header">
          <div className="exit-multi-title">
            <Cloud size={15} className="zap-icon" />
            <span>Conexão com o Bitrix24</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {status.connected ? (
          <>
            <p className="exit-multi-desc">
              Conectado como <strong>{status.user?.name}</strong> em{' '}
              <strong>{status.portal}</strong>.
            </p>
            {status.insecureStorage && (
              <p className="bitrix-error">
                Atenção: este sistema não tem chaveiro, então a credencial foi salva sem
                criptografia (arquivo legível só pelo seu usuário).
              </p>
            )}
            {error && <p className="bitrix-error">{error}</p>}
            <div className="exit-multi-footer">
              <button
                type="button"
                className="btn-pause-all-multi"
                disabled={busy}
                onClick={() => run(() => api!.disconnect())}
              >
                <LogOut size={14} />
                <span>Sair</span>
              </button>
              <button type="button" className="btn-cancel-multi" onClick={onClose}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <div className="bitrix-form">
            <p className="exit-multi-desc">
              Entre com sua conta do Bitrix24 para vincular tarefas e lançar tempo. O
              navegador será aberto para você autorizar o acesso.
            </p>

            {busy && authUrl && (
              <div className="bitrix-auth-link">
                <p className="exit-multi-desc">
                  Se o navegador não abriu sozinho, copie este link e abra-o no seu
                  navegador (você tem 2 minutos):
                </p>
                <input type="text" readOnly value={authUrl} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  className="btn-cancel-multi"
                  onClick={async () => {
                    await navigator.clipboard.writeText(authUrl).catch(() => undefined);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 1800);
                  }}
                >
                  {linkCopied ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            )}

            {error && <p className="bitrix-error">{error}</p>}

            <button
              type="button"
              className="btn-confirm-project"
              disabled={busy}
              onClick={() => run(() => api!.login())}
            >
              <LogIn size={14} />
              <span>{busy ? 'Aguardando autorização no navegador...' : 'Entrar com Bitrix24'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
