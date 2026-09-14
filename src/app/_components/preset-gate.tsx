'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import PresetModal from './preset-modal';

export default function PresetGate() {
  const { data: session } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch('/api/preset')
      .then((r) => r.json())
      .then((data: { presetSet?: boolean }) => {
        if (data && !data.presetSet) setShow(true);
      })
      .catch(() => {
        setShow(false);
      });
  }, [session]);

  const dismiss = useCallback(() => {
    setShow(false);
  }, []);

  if (!show) return null;
  return (
    <PresetModal
      onSelect={() => {
        setShow(false);
      }}
      onSkip={dismiss}
    />
  );
}
