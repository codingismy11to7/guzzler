import { Data, Effect, flow, HashSet } from "effect";
import { kebabToSnake, snakeToCamel } from "effect/String";
import { XMLParser } from "fast-xml-parser";

const kebabToCamel = flow(kebabToSnake, snakeToCamel);

export class XmlParsingError extends Data.TaggedError("XmlParsingError")<{
  cause: unknown;
}> {}

const arrayTags = HashSet.make(
  "eventSubtype",
  "fuelType",
  "tripType",
  "vehicle",
  "fillupRecord",
  "eventRecord",
  "vehiclePart",
  "reminder",
  "tripRecord",
);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "_text",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  transformTagName: kebabToCamel,
  transformAttributeName: kebabToCamel,
  isArray: (_name, jpath) => {
    const last = jpath.split(".").pop() ?? "";
    return HashSet.has(arrayTags, last);
  },
});

const parse = (
  xml: string | Buffer,
): Effect.Effect<Record<string, unknown>, XmlParsingError> =>
  Effect.try({
    try: () => xmlParser.parse(xml) as Record<string, unknown>,
    catch: cause => new XmlParsingError({ cause }),
  });

export class XmlParser extends Effect.Service<XmlParser>()("XmlParser", {
  accessors: true,
  succeed: { parse },
}) {}
