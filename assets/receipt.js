/* Shared receipt helpers. Rendering escapes strings; clipboard failure stays local. */
(function (root) {
  "use strict";
  function escape(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }
  async function copy(text) {
    const status = document.getElementById("copy-status");
    const manual = document.getElementById("manual-copy");
    try {
      if (!navigator.clipboard) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(text);
      manual.hidden = true;
      status.textContent = "Copied. Nothing sent anywhere.";
      return true;
    } catch {
      manual.hidden = false;
      const field = document.getElementById("copy-text");
      field.value = text;
      field.focus();
      field.select();
      status.textContent = "Clipboard blocked. Your text is selected below; copy it manually.";
      return false;
    }
  }
  const api = { escape, copy };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Receipt = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : this);
