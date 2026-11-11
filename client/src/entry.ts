import { isUnsupportedBrowser, renderUnsupportedBrowserMessage } from "./unsupportedBrowserGate";

if (isUnsupportedBrowser()) {
  renderUnsupportedBrowserMessage();
} else {
  void import("./main");
}
