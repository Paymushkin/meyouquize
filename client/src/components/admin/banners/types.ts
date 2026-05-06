import type { PublicBanner } from "../../../publicViewContract";

export type BannerSize = PublicBanner["size"];

export type OrderedTile =
  | {
      id: string;
      kind: "speaker";
      label: string;
      previewText: string;
      backgroundColor: string;
      textColor: string;
    }
  | {
      id: string;
      kind: "program";
      label: string;
      previewText: string;
      backgroundColor: string;
      textColor: string;
      linkUrl: string;
    }
  | {
      id: string;
      kind: "banner";
      label: string;
      previewUrl: string;
      size: BannerSize;
      banner: PublicBanner;
    };

export type BannerEditorState = {
  editingId: string | null;
  editLinkUrl: string;
  editBackgroundUrl: string;
  editSize: BannerSize;
};
