import { useEffect, useRef } from "react";

type Params = {
  eventName: string;
  isAuth: boolean;
  checkSession: () => Promise<boolean>;
  loadRoom: () => Promise<void>;
};

/** Первичная проверка сессии и загрузка комнаты после авторизации. */
export function useAdminEventBootstrap({ eventName, isAuth, checkSession, loadRoom }: Params) {
  const checkSessionRef = useRef(checkSession);
  const loadRoomRef = useRef(loadRoom);
  checkSessionRef.current = checkSession;
  loadRoomRef.current = loadRoom;

  useEffect(() => {
    if (!eventName) return;
    void checkSessionRef.current();
  }, [eventName]);

  useEffect(() => {
    if (!eventName || !isAuth) return;

    let active = true;
    void (async () => {
      await loadRoomRef.current();
      if (!active) return;
    })();

    return () => {
      active = false;
    };
  }, [eventName, isAuth]);
}
