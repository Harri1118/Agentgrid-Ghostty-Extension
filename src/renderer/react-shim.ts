const injected = (globalThis as Record<string, unknown>).__agentgrid_react as typeof import('react') | undefined

if (!injected) {
  throw new Error('__agentgrid_react not available — renderer must run inside AgentGrid host')
}

export default injected
export const {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  useReducer,
  createElement,
  Fragment,
  createContext,
} = injected
