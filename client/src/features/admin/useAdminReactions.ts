import type { PublicViewPayload } from "@meyouquize/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactionWidget } from "../../components/admin/AdminReactionsSection";
import type { PublicViewMode, PublicViewSetPatch } from "../../publicViewContract";
import type { ReactionSession } from "../../pages/quiz-play/types";
import { socket } from "../../socket";
import { randomUuid } from "../../utils/randomUuid";
import { applyAdminReactionsFromPublicView } from "./applyAdminReactionsFromPublicView";
import {
  findReactionWidgetMatch,
  getReactionWidgetsOrNull,
  parseReactionLines,
  readReactionWidgetsFromStorage,
  readReactionsOverlayTextFromStorage,
} from "./adminReactionWidgets";
import type { AdminSetPublicResultsView } from "./useAdminRandomizer";

type EmitPatch = (patch: PublicViewSetPatch) => void;

type Params = {
  eventName: string;
  quizId: string;
  roomPublicView: unknown;
  publicViewMode: PublicViewMode;
  emitPublicViewPatch: EmitPatch;
  setPublicResultsView: AdminSetPublicResultsView;
  setMessage: (message: string) => void;
};

export function useAdminReactions({
  eventName,
  quizId,
  roomPublicView,
  publicViewMode,
  emitPublicViewPatch,
  setPublicResultsView,
  setMessage,
}: Params) {
  const reactionWidgetsStorageKey = `mq_reaction_widgets_${eventName}`;
  const reactionsOverlayTextStorageKey = `mq_reaction_overlay_text_${eventName}`;

  const [reactionSession, setReactionSession] = useState<ReactionSession | null>(null);
  const [overlayText, setOverlayTextState] = useState(
    () =>
      readReactionsOverlayTextFromStorage(reactionsOverlayTextStorageKey) ?? "Реакции аудитории",
  );
  const [widgets, setWidgets] = useState<ReactionWidget[]>(() =>
    readReactionWidgetsFromStorage(reactionWidgetsStorageKey),
  );
  const [widgetStats, setWidgetStats] = useState<
    Array<{ widgetId: string; counts: Record<string, number> }>
  >([]);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [projectorWidgetId, setProjectorWidgetId] = useState<string | null>(null);

  const widgetsResyncDoneRef = useRef<string | null>(null);
  /** Один раз за период активности — не перезаписывать после явного Stop/toggle. */
  const hydratedActiveWidgetRef = useRef(false);
  const hydratedProjectorWidgetRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(reactionWidgetsStorageKey, JSON.stringify(widgets));
    } catch {
      /* ignore */
    }
  }, [widgets, reactionWidgetsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(reactionsOverlayTextStorageKey, overlayText);
    } catch {
      /* ignore */
    }
  }, [overlayText, reactionsOverlayTextStorageKey]);

  useEffect(() => {
    if (!quizId || !roomPublicView || typeof roomPublicView !== "object") return;
    if (widgetsResyncDoneRef.current === quizId) return;
    const serverWidgets = getReactionWidgetsOrNull(
      (roomPublicView as { reactionsWidgets?: unknown }).reactionsWidgets,
    );
    if ((serverWidgets?.length ?? 0) > 0) {
      widgetsResyncDoneRef.current = quizId;
      return;
    }
    if (widgets.length === 0) return;
    emitPublicViewPatch({ reactionsWidgets: widgets });
    widgetsResyncDoneRef.current = quizId;
    setMessage("Виджеты реакций восстановлены после перезапуска");
  }, [emitPublicViewPatch, quizId, widgets, roomPublicView, setMessage]);

  // После reload activeWidgetId/projectorWidgetId живут только в React state —
  // восстанавливаем из reactionSession и publicViewMode + overlay.
  useEffect(() => {
    if (!reactionSession?.isActive) {
      hydratedActiveWidgetRef.current = false;
      setActiveWidgetId(null);
      return;
    }
    setActiveWidgetId((current) => {
      if (current && widgets.some((widget) => widget.id === current)) {
        hydratedActiveWidgetRef.current = true;
        return current;
      }
      if (hydratedActiveWidgetRef.current) return current;
      const matched =
        findReactionWidgetMatch(widgets, {
          overlayText,
          sessionReactions: reactionSession.reactions,
        })?.id ?? null;
      if (matched) hydratedActiveWidgetRef.current = true;
      return matched;
    });
  }, [overlayText, reactionSession?.isActive, reactionSession?.reactions, widgets]);

  useEffect(() => {
    if (publicViewMode !== "reactions") {
      hydratedProjectorWidgetRef.current = false;
      setProjectorWidgetId(null);
      return;
    }
    setProjectorWidgetId((current) => {
      if (current && widgets.some((widget) => widget.id === current)) {
        hydratedProjectorWidgetRef.current = true;
        return current;
      }
      if (hydratedProjectorWidgetRef.current) return current;
      const matched = findReactionWidgetMatch(widgets, { overlayText })?.id ?? null;
      if (matched) hydratedProjectorWidgetRef.current = true;
      return matched;
    });
  }, [overlayText, publicViewMode, widgets]);

  const applyFromPublicView = useCallback((payload: PublicViewPayload) => {
    applyAdminReactionsFromPublicView(payload, {
      setOverlayText: setOverlayTextState,
      setWidgets,
      setWidgetStats,
    });
  }, []);

  const widgetStatsById = useMemo(
    () =>
      widgetStats.reduce<Record<string, Record<string, number>>>((acc, row) => {
        acc[row.widgetId] = row.counts;
        return acc;
      }, {}),
    [widgetStats],
  );

  const setOverlayText = useCallback(
    (next: string) => {
      setOverlayTextState(next);
      emitPublicViewPatch({ reactionsOverlayText: next });
    },
    [emitPublicViewPatch],
  );

  const createWidget = useCallback(
    (title: string, reactionsText: string) => {
      const reactions = parseReactionLines(reactionsText);
      if (reactions.length === 0) {
        setMessage("Добавьте хотя бы одну реакцию для виджета");
        return;
      }
      setWidgets((prev) => {
        const nextWidgets = [
          ...prev,
          {
            id: `reaction_widget_${randomUuid()}`,
            title: title.trim() || `Виджет ${prev.length + 1}`,
            reactions,
          },
        ];
        emitPublicViewPatch({ reactionsWidgets: nextWidgets });
        return nextWidgets;
      });
      setMessage("Виджет реакций создан");
    },
    [emitPublicViewPatch, setMessage],
  );

  const updateWidget = useCallback(
    (widgetId: string, title: string, reactionsText: string) => {
      const reactions = parseReactionLines(reactionsText);
      if (reactions.length === 0) {
        setMessage("Добавьте хотя бы одну реакцию для виджета");
        return;
      }
      setWidgets((prev) => {
        const target = prev.find((item) => item.id === widgetId);
        if (!target) return prev;
        const nextWidgets = prev.map((item) =>
          item.id === widgetId
            ? {
                ...item,
                title: title.trim() || target.title,
                reactions,
              }
            : item,
        );
        if (activeWidgetId === widgetId && reactionSession?.isActive) {
          const updated = nextWidgets.find((item) => item.id === widgetId);
          if (updated && quizId) {
            socket.emit("reactions:start", {
              quizId,
              durationSec: 3600,
              reactions: updated.reactions,
            });
          }
        }
        emitPublicViewPatch({ reactionsWidgets: nextWidgets });
        return nextWidgets;
      });
      setMessage("Виджет реакций обновлен");
    },
    [activeWidgetId, emitPublicViewPatch, quizId, reactionSession?.isActive, setMessage],
  );

  const deleteWidget = useCallback(
    (widgetId: string) => {
      setWidgets((prev) => {
        const nextWidgets = prev.filter((item) => item.id !== widgetId);
        emitPublicViewPatch({ reactionsWidgets: nextWidgets });
        return nextWidgets;
      });
      if (activeWidgetId === widgetId) {
        setActiveWidgetId(null);
      }
      if (projectorWidgetId === widgetId) {
        setProjectorWidgetId(null);
        if (publicViewMode === "reactions") {
          setPublicResultsView("title");
        }
      }
      setMessage("Виджет реакций удален");
    },
    [
      activeWidgetId,
      emitPublicViewPatch,
      projectorWidgetId,
      publicViewMode,
      setMessage,
      setPublicResultsView,
    ],
  );

  const startWidget = useCallback(
    (widget: ReactionWidget) => {
      if (!quizId) return;
      socket.emit("reactions:start", {
        quizId,
        durationSec: 3600,
        reactions: widget.reactions,
      });
      const nextOverlayText = widget.title.trim() || "Реакции аудитории";
      setOverlayTextState(nextOverlayText);
      emitPublicViewPatch({ reactionsOverlayText: nextOverlayText });
      setActiveWidgetId(widget.id);
      setMessage("Реакции запущены");
    },
    [emitPublicViewPatch, quizId, setMessage],
  );

  const stopWidget = useCallback(() => {
    if (!quizId) return;
    socket.emit("reactions:stop", { quizId });
    setActiveWidgetId(null);
    setMessage("Реакции остановлены");
  }, [quizId, setMessage]);

  const resetWidget = useCallback(
    (widget: ReactionWidget) => {
      if (!quizId) return;
      socket.emit("reactions:widget-reset", { quizId, widgetId: widget.id });
      setWidgetStats((prev) => {
        const zeroCounts = widget.reactions.reduce<Record<string, number>>((acc, reaction) => {
          acc[reaction] = 0;
          return acc;
        }, {});
        return [
          ...prev.filter((row) => row.widgetId !== widget.id),
          { widgetId: widget.id, counts: zeroCounts },
        ];
      });
      setMessage("Итоги виджета сброшены");
    },
    [quizId, setMessage],
  );

  const toggleProjector = useCallback(
    (widget: ReactionWidget) => {
      const isSameWidgetOnProjector =
        publicViewMode === "reactions" && projectorWidgetId === widget.id;
      if (isSameWidgetOnProjector) {
        setProjectorWidgetId(null);
        setPublicResultsView("title");
        return;
      }
      setProjectorWidgetId(widget.id);
      const nextOverlayText = widget.title.trim() || "Реакции аудитории";
      setOverlayTextState(nextOverlayText);
      if (quizId) {
        setPublicResultsView("reactions", undefined, {
          reactionsOverlayText: nextOverlayText,
        });
        return;
      }
      setPublicResultsView("reactions");
    },
    [projectorWidgetId, publicViewMode, quizId, setPublicResultsView],
  );

  return {
    reactionSession,
    setReactionSession,
    overlayText,
    setOverlayText,
    setReactionsOverlayText: setOverlayTextState,
    widgets,
    setReactionWidgets: setWidgets,
    widgetStatsById,
    activeWidgetId,
    projectorWidgetId,
    applyFromPublicView,
    createWidget,
    updateWidget,
    deleteWidget,
    startWidget,
    stopWidget,
    resetWidget,
    toggleProjector,
  };
}
