import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_NETWORKING_JOIN_FORM_FIELDS,
  DEFAULT_PROJECTOR_TIMELINE_STATE,
  normalizeNetworkingJoinFormFields,
  normalizeNetworkingJoinFormMode,
  normalizeProjectorTimelineState,
  type NetworkingJoinFormFields,
  type NetworkingJoinFormMode,
  type ProjectorTimelineState,
  type ProjectorTimelineStep,
} from "@meyouquize/shared";
import type { PublicViewPayload } from "../../publicViewContract";
import { socket } from "../../socket";

function newStepId(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useAdminProjectorTimeline(quizId: string | undefined) {
  const [timeline, setTimeline] = useState<ProjectorTimelineState>({
    ...DEFAULT_PROJECTOR_TIMELINE_STATE,
    steps: DEFAULT_PROJECTOR_TIMELINE_STATE.steps.map((s) => ({ ...s })),
  });
  const [networkingEnabled, setNetworkingEnabled] = useState(false);
  const [networkingJoinFormMode, setNetworkingJoinFormMode] =
    useState<NetworkingJoinFormMode>("interactive");
  const [networkingJoinFormFields, setNetworkingJoinFormFields] =
    useState<NetworkingJoinFormFields>({ ...DEFAULT_NETWORKING_JOIN_FORM_FIELDS });

  const applyFromPublicView = useCallback(
    (payload: PublicViewPayload | Record<string, unknown>) => {
      const next = normalizeProjectorTimelineState(
        (payload as { projectorTimeline?: unknown }).projectorTimeline,
      );
      setTimeline(next);
      const enabled = (payload as { networkingEnabled?: unknown }).networkingEnabled;
      if (typeof enabled === "boolean") setNetworkingEnabled(enabled);
      // Не сбрасывать в interactive, если в echo нет поля (частичный/старый payload).
      if ("networkingJoinFormMode" in payload) {
        setNetworkingJoinFormMode(
          normalizeNetworkingJoinFormMode(
            (payload as { networkingJoinFormMode?: unknown }).networkingJoinFormMode,
          ),
        );
      }
      if ("networkingJoinFormFields" in payload) {
        setNetworkingJoinFormFields(
          normalizeNetworkingJoinFormFields(
            (payload as { networkingJoinFormFields?: unknown }).networkingJoinFormFields,
          ),
        );
      }
    },
    [],
  );

  useEffect(() => {
    const onTimelineUpdated = (payload: { quizId?: string; projectorTimeline?: unknown }) => {
      if (!quizId || payload.quizId !== quizId) return;
      setTimeline(normalizeProjectorTimelineState(payload.projectorTimeline));
    };
    const onNetworkingUpdated = (payload: {
      quizId?: string;
      networkingEnabled?: boolean;
      networkingJoinFormMode?: NetworkingJoinFormMode;
      networkingJoinFormFields?: NetworkingJoinFormFields;
    }) => {
      if (!quizId || payload.quizId !== quizId) return;
      if (typeof payload.networkingEnabled === "boolean") {
        setNetworkingEnabled(payload.networkingEnabled);
      }
      if (payload.networkingJoinFormMode !== undefined) {
        setNetworkingJoinFormMode(normalizeNetworkingJoinFormMode(payload.networkingJoinFormMode));
      }
      if (payload.networkingJoinFormFields !== undefined) {
        setNetworkingJoinFormFields(
          normalizeNetworkingJoinFormFields(payload.networkingJoinFormFields),
        );
      }
    };
    socket.on("admin:projector-timeline:updated", onTimelineUpdated);
    socket.on("admin:networking:updated", onNetworkingUpdated);
    return () => {
      socket.off("admin:projector-timeline:updated", onTimelineUpdated);
      socket.off("admin:networking:updated", onNetworkingUpdated);
    };
  }, [quizId]);

  const saveSteps = useCallback(
    (steps: ProjectorTimelineStep[], enabled?: boolean) => {
      if (!quizId) return;
      socket.emit("admin:projector-timeline:set-steps", {
        quizId,
        steps,
        enabled: enabled ?? steps.length > 0,
      });
    },
    [quizId],
  );

  const freezeStep = useCallback(
    (stepIndex: number) => {
      if (!quizId) return;
      socket.emit("admin:projector-timeline:freeze", { quizId, stepIndex });
    },
    [quizId],
  );

  const unfreeze = useCallback(() => {
    if (!quizId) return;
    socket.emit("admin:projector-timeline:unfreeze", { quizId });
  }, [quizId]);

  const addStep = useCallback(
    (partial?: Partial<ProjectorTimelineStep>) => {
      const step: ProjectorTimelineStep = {
        id: newStepId(),
        mode: partial?.mode ?? "networking_profiles",
        durationSec: partial?.durationSec ?? 16,
      };
      const steps = [...timeline.steps, step];
      setTimeline((prev) => ({ ...prev, steps, enabled: true }));
      saveSteps(steps, true);
    },
    [saveSteps, timeline.steps],
  );

  const updateStep = useCallback(
    (stepId: string, patch: Partial<ProjectorTimelineStep>) => {
      const steps = timeline.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
      setTimeline((prev) => ({ ...prev, steps }));
      saveSteps(steps);
    },
    [saveSteps, timeline.steps],
  );

  const removeStep = useCallback(
    (stepId: string) => {
      const steps = timeline.steps.filter((s) => s.id !== stepId);
      setTimeline((prev) => ({ ...prev, steps, enabled: steps.length > 0 }));
      saveSteps(steps, steps.length > 0);
    },
    [saveSteps, timeline.steps],
  );

  const moveStep = useCallback(
    (stepId: string, dir: -1 | 1) => {
      const idx = timeline.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= timeline.steps.length) return;
      const steps = [...timeline.steps];
      const [item] = steps.splice(idx, 1);
      steps.splice(nextIdx, 0, item);
      setTimeline((prev) => ({ ...prev, steps }));
      saveSteps(steps);
    },
    [saveSteps, timeline.steps],
  );

  const setNetworkingEnabledRemote = useCallback(
    (enabled: boolean) => {
      if (!quizId) return;
      setNetworkingEnabled(enabled);
      socket.emit("admin:networking:set-enabled", { quizId, enabled });
    },
    [quizId],
  );

  return {
    timeline,
    networkingEnabled,
    networkingJoinFormMode,
    setNetworkingJoinFormMode,
    networkingJoinFormFields,
    setNetworkingJoinFormFields,
    applyFromPublicView,
    freezeStep,
    unfreeze,
    addStep,
    updateStep,
    removeStep,
    moveStep,
    setNetworkingEnabledRemote,
  };
}
