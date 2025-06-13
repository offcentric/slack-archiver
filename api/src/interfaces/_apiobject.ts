export default interface ApiObject{
    uid?: string,
    name?: string,
    code?: string,
    slug?: string,
    title?: string,
    subheader?: string|null,
    description?: string|null,
    [key: string]: any
}