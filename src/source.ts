import {
  IRequestResult, request,
} from "./request";

export
class TemplateSourcer {
  info : any = {};
  sources : Array<Source>;
  constructor(sources : Array<Source>) {
    this.info = {};
    this.sources = sources;
  }

  public fetchFile(id : string): Promise<string> {
    // Get information about the file from it's unique id
    let info = this.info[id];
    // Use the path and source of the file to get its contents
    return info.source.get(info.path) // return notebook contents
  }

  public async fetchIndex(): Promise<any> {
    let gotInfo : Array<Promise<any>>= [];
    for(const source of this.sources) {
      if (source.selected) {
        const p = source.getInfo().then(t => {
          console.log(t);
          for(const k in t) {
            this.info[k] = t[k];
          }
        }).catch( (err) => {
          source.status = new Status(false, 'error fetching info', err);
        }) //err+' in '+source) })
        source.status = new Status(true, 'success');
        gotInfo.push(p);
      }
    }
    return Promise.all(gotInfo).then(() => {
      console.log(gotInfo);
      console.log(this.info);
      return this.info;
    })
  }
}

export abstract class Source {
  abstract get(url : string): Promise<any>;
  abstract status : Status;
  abstract selected : boolean;
  abstract url : string;
  abstract name : string;
  abstract filetype: string;

  public async getInfo() : Promise<any> {
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
  status : Status;
  selected : boolean;

  constructor(name : string, url : string, filetype : string) {
    super()
    this.url = url + '/'; 
    this.name = name;
    this.filetype = filetype;
    this.status = new Status(false, 'starting');
    this.status.active = false;
    this.selected = true;
  }

  public async get(path : string) : Promise<any> {
    console.log(this.url+path);
    return request("get", this.url + path)
    .then((res: IRequestResult) => {
      if (res.ok) {
        this.status = new Status(true, 'get request succeeded', res);
        return res.data
      } else {
        this.status = new Status(false, 'get request failed', res);
        return {}
      }
    });
  }
}

class Status {
  active : boolean;
  message : string;
  error : any;
  constructor(active : boolean, message :string, error : any = undefined) {
    this.active = active;
    this.message = message;
    this.error = error;
  }
}

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
