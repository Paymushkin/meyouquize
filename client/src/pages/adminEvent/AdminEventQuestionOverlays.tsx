import {
  AdminEventConfirmDialogs,
  type AdminEventConfirmDialogsProps,
} from "./AdminEventConfirmDialogs";
import {
  AdminEventQuestionDialog,
  type AdminEventQuestionDialogProps,
} from "./AdminEventQuestionDialog";
import {
  AdminEventTagCloudDialogs,
  type AdminEventTagCloudDialogsProps,
} from "./AdminEventTagCloudDialogs";

export type AdminEventQuestionOverlaysProps = {
  questionDialog: AdminEventQuestionDialogProps;
  tagCloudDialogs: AdminEventTagCloudDialogsProps;
  confirmDialogs: AdminEventConfirmDialogsProps;
};

export function AdminEventQuestionOverlays({
  questionDialog,
  tagCloudDialogs,
  confirmDialogs,
}: AdminEventQuestionOverlaysProps) {
  return (
    <>
      <AdminEventQuestionDialog {...questionDialog} />
      <AdminEventTagCloudDialogs {...tagCloudDialogs} />
      <AdminEventConfirmDialogs {...confirmDialogs} />
    </>
  );
}
