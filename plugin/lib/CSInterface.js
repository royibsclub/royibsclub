/**
 * CSInterface.js — Adobe CEP v11 (local copy, no CDN)
 * Minimal complete implementation for evalScript + event bridge.
 */
var CSInterface = (function () {

  function CSInterface() {
    if (window.__adobe_cep__) {
      try {
        this.hostEnvironment = JSON.parse(window.__adobe_cep__.getHostEnvironment());
      } catch (e) {
        this.hostEnvironment = null;
      }
    } else {
      this.hostEnvironment = null;
    }
  }

  CSInterface.prototype.evalScript = function (script, callback) {
    if (!callback) callback = function () {};
    if (window.__adobe_cep__) {
      window.__adobe_cep__.evalScript(script, callback);
    } else {
      callback('EvalScript Error: __adobe_cep__ not available');
    }
  };

  CSInterface.prototype.getExtensionID = function () {
    return window.__adobe_cep__ ? window.__adobe_cep__.getExtensionID() : '';
  };

  CSInterface.prototype.getSystemPath = function (pathType) {
    return window.__adobe_cep__ ? window.__adobe_cep__.getSystemPath(pathType) : '';
  };

  CSInterface.prototype.addEventListener = function (type, listener, obj) {
    if (window.__adobe_cep__) window.__adobe_cep__.addEventListener(type, listener, obj);
  };

  CSInterface.prototype.removeEventListener = function (type, listener, obj) {
    if (window.__adobe_cep__) window.__adobe_cep__.removeEventListener(type, listener, obj);
  };

  CSInterface.prototype.dispatchEvent = function (event) {
    if (!window.__adobe_cep__) return;
    var copy = { type: event.type, scope: event.scope, appId: event.appId, extensionId: event.extensionId };
    copy.data = (typeof event.data === 'object') ? JSON.stringify(event.data) : event.data;
    window.__adobe_cep__.dispatchEvent(copy);
  };

  CSInterface.prototype.closeExtension = function () {
    if (window.__adobe_cep__) window.__adobe_cep__.closeExtension();
  };

  CSInterface.SystemPath = {
    USER_DATA: 'userData',
    COMMON_FILES: 'commonFiles',
    MY_DOCUMENTS: 'myDocuments',
    APPLICATION: 'application',
    EXTENSION: 'extension',
    EXTENSION_DATA: 'extensionData',
    HOST_APPLICATION: 'hostApplication'
  };

  return CSInterface;
})();
