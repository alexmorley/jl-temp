import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab_templates2 extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_templates2',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab_templates2 is activated!');
  }
};

export default extension;
