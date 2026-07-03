import { useCallback, useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type Status = 'idle' | 'downloading' | 'error';

/** 앱 시작 시 새 버전을 확인하고, 사용자가 원하면 설치·재시작한다. */
export function useUpdater() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    check()
      .then((u) => {
        if (u) setUpdate(u);
      })
      .catch(() => {
        /* dev/웹 환경 등에서는 조용히 무시 */
      });
  }, []);

  const install = useCallback(async () => {
    if (!update) return;
    try {
      setStatus('downloading');
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      setStatus('error');
    }
  }, [update]);

  const dismiss = useCallback(() => setUpdate(null), []);

  return { update, status, install, dismiss };
}
