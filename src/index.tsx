import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import PluginManager from './components/plugin-manager/component';

const uuid = document.currentScript?.getAttribute('uuid') || 'root';

const root = ReactDOM.createRoot(document.getElementById(uuid));
root.render(<PluginManager pluginUuid={uuid} />);
