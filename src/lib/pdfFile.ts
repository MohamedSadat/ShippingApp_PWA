// Browser side of the API's PDF endpoints, mirroring CashGear.App's
// fileDownloader.openPdfInTab / downloadWithAuth. Those endpoints need the
// X-Api-Key header, so a plain link can't reach them: the PDF is fetched as a
// blob and handed to the browser through an object URL.

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Opens the tab before the fetch, while the click still counts as a user
// gesture — a window.open after an await is blocked as a popup (always on iOS
// Safari). If the browser blocks it anyway, the PDF is downloaded instead.
export async function openPdfInNewTab(load: () => Promise<Blob>, fallbackFileName: string) {
  const tab = window.open("", "_blank");
  try {
    const blob = await load();
    if (!tab) {
      saveBlob(blob, fallbackFileName);
      return;
    }
    // Not revoked: the tab's PDF viewer reads this URL again for its own
    // save/print, and there's no signal for when the tab closes.
    tab.location.href = URL.createObjectURL(blob);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
