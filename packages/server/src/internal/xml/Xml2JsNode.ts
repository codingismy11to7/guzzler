export type Xml2JsNode = Readonly<{
  name: string;
  attrs: Record<string, string>;
  text?: string | undefined;
  children: readonly Xml2JsNode[];
}>;
export const emptyXml2JsNode = (
  name: string,
  attrs: Record<string, string>,
): Xml2JsNode => ({
  name,
  attrs,
  children: [],
});
