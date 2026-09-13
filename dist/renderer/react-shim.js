import * as React from 'react';
const injectedReact = globalThis.__agentgrid_react;
if (injectedReact) {
    Object.assign(React, injectedReact);
}
export { React };
