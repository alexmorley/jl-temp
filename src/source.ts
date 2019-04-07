import {
  IRequestResult, request,
} from "./request";

export
class TemplateSourcer {
  info : any = {};
  sources : Array<Source>;
  constructor(source : Source) {
    this.info = {};
    this.sources = [source];
  }
  public fetchFile(id : string): Promise<string> {
    // Get information about the notebook from it's unique id
    let nb_info = this.info[id];
    // Use the path and source of the notebook to get its contents
    return nb_info.source.get(nb_info.path) // return notebook contents
  }

  public fetchIndex(): Promise<any> {
    let templates : Array<string> = [];
    let source = this.sources[0];
    return source.getInfo()
    .then( t => {
      templates.push(t);
      this.info = t;
      return t
    });
  }
}

export abstract class Source {
  abstract get(url : string): Promise<any>;
  abstract url : string;
  abstract name : string;
  abstract filetype: string;

  public getInfo() : Promise<any> {
    return this.get('/info/' + this.filetype + '.json').then(input_info_string => {
      const input_info = JSON.parse(input_info_string) as {[key: string] : {[key: string] : any}};
      const info : {[key: string] : {[key: string] : string}} = {};
      for(let k in input_info) {
        input_info[k].key = k
        input_info[k].source = this;
        const id : string = hash(input_info[k].path + this.name + this.url).toString();
        info[id] = input_info[k]
      }
      return info
    });
  }
}

export class StaticWebSource extends Source {
  url : string = '';
  name : string;
  filetype : string;
  constructor(name : string, url : string, filetype : string) {
    super()
    this.url = url + '/'; 
    this.name = name;
    this.filetype = filetype;
  }
  public get(path : string) : Promise<any> {
    console.log(this.url+path);
    return request("get", this.url + path)
    .then((res: IRequestResult) => {
      if (res.ok) {
        return res.data
      } else {
        return {}
      }
    });
  }
}
/*
class TemplateInfo {
  id: string
  pretty_name: string
  parameters: object
  constructor(obj : object) {
    this.id = obj['id'];
    this.pretty_name = obj.pretty_name;
    this.parameters = obj.parameters;
  }
}
 */
function hash(str : string) : number{
  let hash : number = 0;
  if (str.length == 0) {
    return hash;
  }
  for (var i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash;
  }
  return hash;
}

