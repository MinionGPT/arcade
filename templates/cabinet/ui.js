(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  $("play-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const result = CabinetCore.play($("input").value);
      $("error").textContent = "";
      // Never interpolate raw user input into innerHTML. Prefer textContent.
      $("output-title").textContent = result.title;
      $("output-line").textContent = result.line;
      $("output-roast").textContent = result.roast;
    } catch (error) { $("error").textContent = error.message; }
  });
})();
