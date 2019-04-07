import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin,
} from "@jupyterlab/application";

import {
  Dialog, ICommandPalette, showDialog,
} from "@jupyterlab/apputils";

import {
  IDocumentManager,
} from "@jupyterlab/docmanager";

import {
  IFileBrowserFactory,
} from "@jupyterlab/filebrowser";

/*import {
  ILauncher,
} from "@jupyterlab/launcher";*/

import {
  IMainMenu,
} from "@jupyterlab/mainmenu";

import {
  MustacheEngine
} from './mustache'

import {
  Menu,
  Widget,
} from "@phosphor/widgets";

import {
  TemplateSourcer,
  StaticWebSource,
  Source
} from './source';

import "../style/index.css";

const Mustache = new MustacheEngine();

/**
 * Initialization data for the jupyterlab_templates2 extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_templates2',
  autoStart: true,
  activate,
  requires: [IDocumentManager, ICommandPalette, ILayoutRestorer, IMainMenu, IFileBrowserFactory],
};

export
class OpenTemplate {
  view : any;
  contents : string;
  source : TemplateSourcer;
  widget : OpenTemplateWidget;
  paramsNode : HTMLMenuElement;
  constructor(templateSource : TemplateSourcer) {
    this.widget = new OpenTemplateWidget();
    this.source = templateSource;
  }
  public init() {
    return this.source.fetchIndex()
      .then(
        templates => {
          for (let k in templates) {
            const t = templates[k];
            const val = document.createElement("option");
            val.label = t.pretty_name;
            val.text  = t.pretty_name;
            val.value = k;
            this.widget.inputNode.appendChild(val);
          }
        }
      )
      .then( () => {
        this.widget.inputNode.onchange = this.populateParameters(this);
      });
  }

  public populateParameters(context : OpenTemplate) {
    return function () {
      console.log(context.inputNode.value);
      context.source.fetchFile(context.inputNode.value).then((contents) => {
        context.contents = contents;
        context.showParameters(Mustache.parse(contents, Mustache.tags));
      });
    }
  }

  public showParameters(tokens : Array<Array<any>>) {
    this.view = {}
    if (!(this.paramsNode)) {
      this.paramsNode = document.createElement("menu");
      this.widget.node.lastElementChild.after(this.paramsNode);
      this.paramsNode.appendChild(document.createElement("div"))
    } else {
      this.paramsNode.innerHTML = '<div></div>';
    }
    for(const t of tokens) {
      if(t[0] == "name") {
        const param : string = t[1];
        if(!(param in this.view)) {
          const label = document.createElement("label");
          label.textContent = param + ':';
          this.paramsNode.lastElementChild.after(label);
          const input = document.createElement("input");
          input.onkeyup = () => {
            this.view[param] = input.value;
          }
          this.view[param] = input.value;
          this.paramsNode.lastElementChild.after(input);
        }
      }
    }
  }

  public getValue(): string {
    return this.widget.inputNode.value;
  }

  get inputNode(): HTMLSelectElement {
    return this.widget.node.getElementsByTagName("select")[0] as HTMLSelectElement;
  }
}

export
class OpenTemplateWidget extends Widget {
  constructor() {
    const body = document.createElement("menu");
    const label = document.createElement("label");
    label.textContent = "Choose a template:";

    const input = document.createElement("select");
    body.appendChild(label);
    body.appendChild(input);
    super({ node: body });
  }

  public getValue(): string {
    return this.inputNode.value;
  }

  get inputNode(): HTMLSelectElement {
    return this.node.getElementsByTagName("select")[0] as HTMLSelectElement;
  }
}

function activate(app: JupyterLab,
  docManager: IDocumentManager,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  menu: IMainMenu,
  browser: IFileBrowserFactory) {

  // Add an application command
  const open_notebook_command = "template:open-notebook";
  const nb_source : Source = new StaticWebSource('jl-t-nb',
    'https://jupyterlab-templates.netlify.com',
    'notebook');
  app.commands.addCommand(open_notebook_command, {
    caption: "Initialize a notebook from a template notebook",
    execute: openCommand(nb_source),
    iconClass: "jp-NotebookIcon",
    isEnabled: () => true,
    label: "Notebook"
  });

  const open_text_command = "template:open-text";
  const text_source : Source = new StaticWebSource('jl-t-md',
    'https://jupyterlab-templates.netlify.com/',
    'markdown');
  app.commands.addCommand(open_text_command, {
    caption: "Initialize a markdown file from a template markdown file",
    execute: openCommand(text_source),
    iconClass: "jp-TextEditorIcon",
    isEnabled: () => true,
    label: "Text"
  });

  if (menu) {
    // Add the editing commands to the settings menu.
    const templateMenu = new Menu({commands:app.commands});
    templateMenu.title.label = 'From Templates';
    templateMenu.addItem({ command: open_notebook_command, args: {
      type: 'notebook', widgetFactory: 'notebook'}
    });
    templateMenu.addItem({ command: open_text_command, args: {
      type: 'file', widgetFactory: 'editor', ext: '.md'}
    });
    menu.fileMenu.newMenu.addGroup(
      [
        { type: 'submenu', submenu: templateMenu },
      ],
      40
    );
  }

  function openCommand(source : Source) {
    return ((args : any) => {
      const type = (args['type'] as string) || '';
      const ext = (args['ext'] as string) || '';

      const templateSource = new TemplateSourcer(source);
      const openTemplate = new OpenTemplate(templateSource);
      openTemplate.init()
        .then( () => {
          openTemplate.populateParameters(openTemplate)();
          return showDialog({
            body: openTemplate.widget,
            buttons: [Dialog.cancelButton(), Dialog.okButton()],
            focusNodeSelector: "input",
            title: "New From Template",
          })
        })
        .then((result) => {
          if (result.button.label === "CANCEL") {
            return;
          }
          const path = browser.defaultBrowser.model.path;
          return new Promise((resolve) => {
            app.commands.execute(
              "docmanager:new-untitled", {path, type, ext},
            )
              .then((model) => {
                return app.commands.execute("docmanager:open", {
                  factory: args['widgetFactory'], path: model.path,
                })})
              .then((widget) => {
                return widget.context.ready.then(() => { return widget })
              })
              .then((widget) => {
                const contents : string = Mustache.render(openTemplate.contents, openTemplate.view);
                widget.content.model.fromString(contents);
                resolve(widget);
              });
          });
        });
    })
  }
}

export default extension;
