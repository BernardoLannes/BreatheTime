import React, { useEffect, useState } from 'react';
import { Cloud, X, LogOut, LogIn, KeyRound } from 'lucide-react';
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
  const [webhookInput, setWebhookInput] = useState('');

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

  const handleWebhookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => api!.connectWebhook(webhookInput));
  };

  return (
    <div className="modal-backdrop no-drag" onClick={onClose}>
      <div
        className="exit-multi-modal bitrix-modal"
        onClick={(e) => e.stopPropagation()}
      >
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
              Conectado via{' '}
              <strong>{status.mode === 'webhook' ? 'Webhook' : 'OAuth'}</strong>{' '}
              como <strong>{status.user?.name}</strong> em{' '}
              <strong>{status.portal}</strong>.
            </p>
            {status.insecureStorage && (
              <p className="bitrix-error">
                Atenção: este sistema não tem chaveiro, então a credencial foi
                salva sem criptografia (arquivo legível só pelo seu usuário).
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
                <span>Desconectar</span>
              </button>
              <button type="button" className="btn-cancel-multi" onClick={onClose}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <div className="bitrix-form">
            <form onSubmit={handleWebhookSubmit} className="bitrix-webhook-box">
              <p className="exit-multi-desc">
                <strong>Conectar via Webhook (Recomendado):</strong> Cole a URL
                do seu Webhook de entrada do Bitrix24 (com permissões{' '}
                <code>task</code> e <code>user</code>). Fica salvo criptografado
                no seu Windows.
              </p>
              <input
                type="url"
                className="bitrix-picker-search"
                placeholder="https://seuportal.bitrix24.com.br/rest/123/seu_token/"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                disabled={busy}
                autoFocus
              />
              <button
                type="submit"
                className="btn-confirm-project"
                style={{ width: '100%', justifyContent: 'center', height: '32px' }}
                disabled={busy || !webhookInput.trim()}
              >
                <KeyRound size={14} />
                <span>{busy ? 'Validando Webhook...' : 'Conectar via Webhook'}</span>
              </button>
            </form>

            {status.oauthAvailable && (
              <>
                <div className="popover-divider" />
                <p className="exit-multi-desc">
                  Ou entre com sua conta do Bitrix24 via navegador:
                </p>

                {busy && authUrl && (
                  <div className="bitrix-auth-link">
                    <p className="exit-multi-desc">
                      Se o navegador não abriu sozinho, copie este link e abra-o
                      no seu navegador (você tem 2 minutos):
                    </p>
                    <input
                      type="text"
                      readOnly
                      value={authUrl}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      className="btn-cancel-multi"
                      onClick={async () => {
                        await navigator.clipboard
                          .writeText(authUrl)
                          .catch(() => undefined);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 1800);
                      }}
                    >
                      {linkCopied ? 'Copiado!' : 'Copiar link'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-cancel-multi"
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  disabled={busy}
                  onClick={() => run(() => api!.login())}
                >
                  <LogIn size={14} />
                  <span>
                    {busy
                      ? 'Aguardando autorização...'
                      : 'Entrar com Bitrix24 (OAuth)'}
                  </span>
                </button>
              </>
            )}

            {error && <p className="bitrix-error">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
