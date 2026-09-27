"use strict";
(() => {
  // src/renderer/react-shim.ts
  var injected = globalThis.__agentgrid_react;
  if (!injected) {
    throw new Error("__agentgrid_react not available \u2014 renderer must run inside AgentGrid host");
  }
  var react_shim_default = injected;
  var {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    useContext,
    useReducer,
    createElement,
    Fragment,
    createContext
  } = injected;

  // src/renderer/index.tsx
  var api = globalThis.__agentgrid_slot_api;
  var extId = globalThis.__agentgrid_extension_id;
  function getPluginsApi() {
    return window.electronAPI.plugins;
  }
  async function invokeCommand(commandId, payload) {
    return getPluginsApi().executeCommand({ commandId, payload });
  }
  function GhosttySettingsSection(_props) {
    const [presets, setPresets] = useState([]);
    const [activePreset, setActivePreset] = useState(null);
    const [importStatus, setImportStatus] = useState("idle");
    useEffect(() => {
      void invokeCommand("ghostty.listPresets").then(setPresets).catch(() => {
      });
      void invokeCommand("ghostty.getActivePreset").then(setActivePreset).catch(() => {
      });
    }, []);
    const handleApplyPreset = useCallback(async (presetId) => {
      const result = await invokeCommand("ghostty.applyTerminalTheme", presetId);
      if (result.ok) {
        setActivePreset(presetId);
      }
    }, []);
    const handleImport = useCallback(async () => {
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
    return /* @__PURE__ */ react_shim_default.createElement("div", { className: "ghostty-settings-section" }, /* @__PURE__ */ react_shim_default.createElement("h3", { style: { margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" } }, "Ghostty Terminal"), /* @__PURE__ */ react_shim_default.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ react_shim_default.createElement(
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
        }
      },
      importStatus === "success" ? "Imported" : importStatus === "error" ? "Not found" : "Import from ~/.config/ghostty/config"
    )), /* @__PURE__ */ react_shim_default.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 } }, presets.map((preset) => /* @__PURE__ */ react_shim_default.createElement(
      "button",
      {
        key: preset.id,
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
        }
      },
      preset.label
    ))));
  }
  function GhosttyStatusBarIndicator(_props) {
    const [activePreset, setActivePreset] = useState(null);
    useEffect(() => {
      void invokeCommand("ghostty.getActivePreset").then(setActivePreset).catch(() => {
      });
    }, []);
    if (!activePreset) {
      return null;
    }
    const label = activePreset === "imported" ? "Ghostty (imported)" : activePreset.replace("ghostty-", "");
    return /* @__PURE__ */ react_shim_default.createElement(
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
        title: "Active Ghostty terminal theme"
      },
      label
    );
  }
  if (api && extId) {
    api.registerSlotComponent("settings-section", extId, GhosttySettingsSection);
    api.registerSlotComponent("status-bar-right", extId, GhosttyStatusBarIndicator);
  }
})();
