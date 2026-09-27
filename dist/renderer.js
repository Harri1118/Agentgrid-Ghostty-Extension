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

  // ../agent-grid/.agent-grid/worktrees/sdk/packages/sdk/dist/index.js
  var MISSING_SLOT_API = "@agentgrid/sdk: __agentgrid_slot_api not found \u2014 is this running inside an AgentGrid slot renderer?";
  var MISSING_EXTENSION_ID = "@agentgrid/sdk: __agentgrid_extension_id not found";
  var MISSING_PLUGINS_API = "@agentgrid/sdk: window.electronAPI.plugins not found";
  function createSlot() {
    const globals = globalThis;
    const slotApi = globals.__agentgrid_slot_api;
    if (!slotApi) {
      throw new Error(MISSING_SLOT_API);
    }
    const extensionId = globals.__agentgrid_extension_id;
    if (!extensionId) {
      throw new Error(MISSING_EXTENSION_ID);
    }
    const pluginsApi = globals.electronAPI?.plugins;
    if (!pluginsApi) {
      throw new Error(MISSING_PLUGINS_API);
    }
    return {
      extensionId,
      commands: {
        execute(commandId, payload) {
          return pluginsApi.executeCommand({ commandId, payload });
        }
      },
      register(slotName, component) {
        return slotApi.registerSlotComponent(slotName, extensionId, component);
      }
    };
  }

  // src/renderer/index.tsx
  var slot = createSlot();
  function GhosttySettingsSection(_props) {
    const [presets, setPresets] = useState([]);
    const [activePreset, setActivePreset] = useState(null);
    const [importStatus, setImportStatus] = useState("idle");
    useEffect(() => {
      void slot.commands.execute("ghostty.listPresets").then(setPresets).catch(() => {
      });
      void slot.commands.execute("ghostty.getActivePreset").then(setActivePreset).catch(() => {
      });
    }, []);
    const handleApplyPreset = useCallback(async (presetId) => {
      const result = await slot.commands.execute("ghostty.applyTerminalTheme", presetId);
      if (result.ok) {
        setActivePreset(presetId);
      }
    }, []);
    const handleImport = useCallback(async () => {
      const result = await slot.commands.execute("ghostty.importConfig");
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
      void slot.commands.execute("ghostty.getActivePreset").then(setActivePreset).catch(() => {
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
  slot.register("settings-section", GhosttySettingsSection);
  slot.register("status-bar-right", GhosttyStatusBarIndicator);
})();
