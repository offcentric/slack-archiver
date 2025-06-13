export interface PayloadInterface {
    [key: string]: PayloadPathInterface
}

export interface PayloadPathInterface {
    [key: string]: PayloadItemInterface
}

export interface PayloadItemInterface {
    key?: string;
    type: 'string' | 'number' | 'integer' | 'float' | 'json' | 'array' | 'object' | 'boolean' | 'richtext' | 'url' | 'email' | 'password' | 'relation' | 'datetime' | 'timestamp' | 'file' | 'path' | 'custom';
    inpath?: boolean;
    required?: boolean|string;
    table?:string;
    relationType?:'many';
    value?: string | number | boolean;
    isVirtual?: boolean;
    regexp?: string;
    parser?: Function
}