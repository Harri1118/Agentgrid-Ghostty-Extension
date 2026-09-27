import React, { useState, useEffect, useCallback } from 'react'
import { createSlot } from '@agentgrid/sdk'

type GhosttyPresetInfo = { id: string; label: string }

const slot = createSlot()

function GhosttySettingsSection(_props: Record<string, unknown>) {
  const [presets, setPresets] = useState<GhosttyPresetInfo[]>([])
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    void slot.commands.execute<GhosttyPresetInfo[]>('ghostty.listPresets').then(setPresets).catch(() => {})
    void slot.commands.execute<string | null>('ghostty.getActivePreset').then(setActivePreset).catch(() => {})
  }, [])

  const handleApplyPreset = useCallback(async (presetId: string) => {
    const result = await slot.commands.execute<{ ok: boolean }>('ghostty.applyTerminalTheme', presetId)

    if (result.ok) {
      setActivePreset(presetId)
    }
  }, [])

  const handleImport = useCallback(async () => {
    const result = await slot.commands.execute<{ ok: boolean; error?: string }>('ghostty.importConfig')

    if (result.ok) {
      setImportStatus('success')
      setActivePreset('imported')
      setTimeout(() => setImportStatus('idle'), 3000)
    } else {
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 3000)
    }
  }, [])

  return (
    <div className="ghostty-settings-section">
      <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        Ghostty Terminal
      </h3>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => void handleImport()}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            borderRadius: 6,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          {importStatus === 'success' ? 'Imported' : importStatus === 'error' ? 'Not found' : 'Import from ~/.config/ghostty/config'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => void handleApplyPreset(preset.id)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: activePreset === preset.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-default)',
              background: activePreset === preset.id ? 'var(--bg-hover)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
              textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function GhosttyStatusBarIndicator(_props: Record<string, unknown>) {
  const [activePreset, setActivePreset] = useState<string | null>(null)

  useEffect(() => {
    void slot.commands.execute<string | null>('ghostty.getActivePreset').then(setActivePreset).catch(() => {})
  }, [])

  if (!activePreset) { return null }

  const label = activePreset === 'imported' ? 'Ghostty (imported)' : activePreset.replace('ghostty-', '')

  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--text-secondary)',
        padding: '2px 6px',
        borderRadius: 4,
        background: 'var(--bg-surface)',
        whiteSpace: 'nowrap',
      }}
      title="Active Ghostty terminal theme"
    >
      {label}
    </span>
  )
}

slot.register('settings-section', GhosttySettingsSection)
slot.register('status-bar-right', GhosttyStatusBarIndicator)
