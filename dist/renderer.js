"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/renderer/react-shim.ts
  var React = __toESM(__require("react"));
  var injectedReact = globalThis.__agentgrid_react;
  if (injectedReact) {
    Object.assign(React, injectedReact);
  }

  // src/renderer/index.tsx
  var import_react = __require("react");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var api = globalThis.__agentgrid_slot_api;
  var extId = globalThis.__agentgrid_extension_id;
  function getPluginsApi() {
    return window.electronAPI.plugins;
  }
  async function invokeCommand(commandId, payload) {
    return getPluginsApi().executeCommand({ commandId, payload });
  }
  function GhosttySettingsSection(_props) {
    const [presets, setPresets] = (0, import_react.useState)([]);
    const [activePreset, setActivePreset] = (0, import_react.useState)(null);
    const [importStatus, setImportStatus] = (0, import_react.useState)("idle");
    (0, import_react.useEffect)(() => {
      void invokeCommand("ghostty.listPresets").then(setPresets).catch(() => {
      });
      void invokeCommand("ghostty.getActivePreset").then(setActivePreset).catch(() => {
      });
    }, []);
    const handleApplyPreset = (0, import_react.useCallback)(async (presetId) => {
      const result = await invokeCommand("ghostty.applyTerminalTheme", presetId);
      if (result.ok) {
        setActivePreset(presetId);
      }
    }, []);
    const handleImport = (0, import_react.useCallback)(async () => {
      const result = await invokeCommand("ghostty.importConfig");
      if (result.ok) {
        setImportStatus("success");
        setActivePreset("imported");
        setTimeout(() => setImportStatus("idle"), 3e3);
      } else {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 3e3);
      }
    }, []);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ghostty-settings-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }, children: "Ghostty Terminal" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { marginBottom: 16 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => void handleImport(),
          style: {
            padding: "6px 12px",
            fontSize: 12,
            borderRadius: 6,
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer"
          },
          children: importStatus === "success" ? "Imported" : importStatus === "error" ? "Not found" : "Import from ~/.config/ghostty/config"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }, children: presets.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => void handleApplyPreset(preset.id),
          style: {
            padding: "10px 12px",
            borderRadius: 8,
            border: activePreset === preset.id ? "2px solid var(--accent-blue)" : "1px solid var(--border-default)",
            background: activePreset === preset.id ? "var(--bg-hover)" : "var(--bg-surface)",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: 12,
            textAlign: "left",
            transition: "border-color 0.15s"
          },
          children: preset.label
        },
        preset.id
      )) })
    ] });
  }
  function GhosttyStatusBarIndicator(_props) {
    const [activePreset, setActivePreset] = (0, import_react.useState)(null);
    (0, import_react.useEffect)(() => {
      void invokeCommand("ghostty.getActivePreset").then(setActivePreset).catch(() => {
      });
    }, []);
    if (!activePreset) {
      return null;
    }
    const label = activePreset === "imported" ? "Ghostty (imported)" : activePreset.replace("ghostty-", "");
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        style: {
          fontSize: 11,
          color: "var(--text-secondary)",
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--bg-surface)",
          whiteSpace: "nowrap"
        },
        title: "Active Ghostty terminal theme",
        children: label
      }
    );
  }
  if (api && extId) {
    api.registerSlotComponent("settings-section", extId, GhosttySettingsSection);
    api.registerSlotComponent("status-bar-right", extId, GhosttyStatusBarIndicator);
  }
})();
