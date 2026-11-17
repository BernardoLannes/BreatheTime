import React, { useEffect, useRef, useState } from 'react';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { BitrixActionResult } from '../bitrix/BitrixContext';

interface BitrixLogButtonProps {
  onLog: () => Promise<BitrixActionResult>;
  /** Quando preenchido, o botão fica desabilitado e mostra este motivo */
  disabledReason?: string;
  label?: string;
  className?: string;
  iconSize?: number;
}

type Phase = 'idle' | 'sending' | 'ok' | 'error';

export const BitrixLogButton: React.FC<BitrixLogButtonProps> = ({
  onLog,
  disabledReason,
  label = 'Lançar',
  className = '',
  iconSize = 13,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const handleClick = async () => {
    if (phase === 'sending') return;
    setPhase('sending');
    const result = await onLog();
    setMessage(result.message || '');
    setPhase(result.ok ? 'ok' : 'error');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase('idle'), result.ok ? 2200 : 4500);
  };

  const icon =
    phase === 'sending' ? (
      <Loader2 size={iconSize} className="spin" />
    ) : phase === 'ok' ? (
      <Check size={iconSize} />
    ) : phase === 'error' ? (
      <AlertCircle size={iconSize} />
    ) : (
      <Upload size={iconSize} />
    );

  const text =
    phase === 'sending'
      ? 'Enviando...'
      : phase === 'ok'
        ? 'Lançado!'
        : phase === 'error'
          ? 'Falhou'
          : label;

  const title =
    disabledReason ||
    (phase === 'error' || phase === 'ok'
      ? message
      : 'Lançar o tempo ainda não enviado na tarefa vinculada do Bitrix24');

  return (
    <button
      type="button"
      className={`bitrix-log-btn ${phase} ${className}`}
      onClick={handleClick}
      disabled={Boolean(disabledReason) || phase === 'sending'}
      title={title}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
};
