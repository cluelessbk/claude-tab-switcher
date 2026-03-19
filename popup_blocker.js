// Runs at document_start in the MAIN world — before any page JS executes.
// Silently blocks notification prompts and Google One-Tap sign-in.

// 1. Block Notification permission requests — the browser popup never appears
if ('Notification' in window) {
  Notification.requestPermission = () => Promise.resolve('denied');
}

// 2. Kill Google One-Tap / GSI sign-in prompt before it initializes
(function () {
  let _google;
  Object.defineProperty(window, 'google', {
    get() { return _google; },
    set(val) {
      _google = val;
      if (_google && _google.accounts && _google.accounts.id) {
        _google.accounts.id.prompt = () => {};  // no-op the prompt
      }
    },
    configurable: true
  });
})();
