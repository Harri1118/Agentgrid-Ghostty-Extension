import * as React from 'react'

const injectedReact = (globalThis as Record<string, unknown>).__agentgrid_react as typeof React | undefined

if (injectedReact) {
  Object.assign(React, injectedReact)
}

export { React }
