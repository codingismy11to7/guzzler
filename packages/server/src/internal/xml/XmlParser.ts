import { FileSystem } from "@effect/platform";
import { PlatformError } from "@effect/platform/Error";
import { Array, Data, Effect, flow, Match, pipe, Stream } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import { isUndefined } from "effect/Predicate";
import { kebabToSnake, snakeToCamel } from "effect/String";
import { Parser } from "node-expat";
import { emptyXml2JsNode, Xml2JsNode } from "./Xml2JsNode.js";

type NodeStackEntry = Readonly<{
  currNode: Xml2JsNode;
  currNodeTexts: readonly string[];
  currNodeChildren: readonly Xml2JsNode[];
}>;

const kebabToCamel = flow(kebabToSnake, snakeToCamel);

class StartElement extends Data.TaggedClass("StartElement")<{
  name: string;
  attrs: Record<string, string>;
}> {}
class Text extends Data.TaggedClass("Text")<{ text: string }> {}
class EndElement extends Data.TaggedClass("EndElement")<{ name: string }> {}
export type ParseEvent = StartElement | Text | EndElement;

// this is the error from the expat lib, or an error from us if
// a) we have a bug or b) the xml is malformed (dunno if libexpat throws errors
// on those, will need to add test coverage one day)
export class XmlParsingError extends Data.TaggedError("XmlParsingError")<{
  cause: unknown;
}> {}

const createEventStream = (
  parser: Parser,
): Stream.Stream<ParseEvent, XmlParsingError> =>
  Stream.async(emit => {
    parser.on("error", cause => void emit.fail(new XmlParsingError({ cause })));

    const handle = (e: ParseEvent) => void emit.single(e);

    parser.on("startElement", (name: string, attrs) =>
      handle(new StartElement({ name: kebabToCamel(name), attrs })),
    );
    parser.on("text", text => handle(new Text({ text })));
    parser.on(
      "endElement",
      flow(kebabToCamel, name => handle(new EndElement({ name }))),
    );
    parser.on("close", () => void emit.end());
  });

type Controller = Readonly<{
  withPausedStream: <A, E>(e: Effect.Effect<A, E>) => Effect.Effect<A, E>;
}>;

const xmlStream = <E>(
  data: Stream.Stream<Uint8Array, E>,
  encoding = "UTF-8",
): Effect.Effect<
  [Controller, Stream.Stream<ParseEvent, XmlParsingError | E>]
> =>
  Effect.gen(function* () {
    const latch = yield* Effect.makeLatch(true);

    const controller: Controller = {
      withPausedStream: e =>
        Effect.acquireUseRelease(
          latch.close,
          () => e,
          () => latch.open,
        ),
    };

    const evtStream: Stream.Stream<ParseEvent, XmlParsingError> = pipe(
      Stream.acquireRelease(Effect.succeed(new Parser(encoding)), p =>
        Effect.sync(() => p.destroy()),
      ),
      Stream.flatMap(parser => {
        const feedFromDataIntoParserFiber = pipe(
          data,
          Stream.map(a => Buffer.from(a)),
          Stream.runForEach(b =>
            pipe(
              Effect.sync(() => parser.write(b)),
              latch.whenOpen,
            ),
          ),
          Effect.tap(() => void parser.end()),
          Effect.fork,
        );

        return Stream.flatMap(feedFromDataIntoParserFiber, () =>
          createEventStream(parser),
        );
      }),
    );

    return [controller, evtStream];
  });

const xmlStreamFromfile =
  ({ stream }: FileSystem.FileSystem) =>
  (
    filePath: string,
    encoding = "UTF-8",
  ): Effect.Effect<
    [Controller, Stream.Stream<ParseEvent, XmlParsingError | PlatformError>]
  > =>
    xmlStream(stream(filePath), encoding);

const transformToJson = <E>(
  evtStream: Stream.Stream<ParseEvent, E>,
): Effect.Effect<Xml2JsNode, E | XmlParsingError> => {
  const z = (
    stack: readonly NodeStackEntry[] = [],
    currNode?: Xml2JsNode,
    currNodeTexts: readonly string[] = [],
    currNodeChildren: readonly Xml2JsNode[] = [],
  ) => ({ stack, currNode, currNodeTexts, currNodeChildren });
  type Z = ReturnType<typeof z>;

  const handleStart =
    ({ stack, currNode, currNodeTexts, currNodeChildren }: Z) =>
    (e: StartElement): Effect.Effect<Z> =>
      Effect.succeed({
        stack: isUndefined(currNode)
          ? stack
          : Array.append(stack, { currNode, currNodeTexts, currNodeChildren }),
        currNode: emptyXml2JsNode(kebabToCamel(e.name), e.attrs),
        currNodeTexts: [],
        currNodeChildren: [],
      });

  const handleText =
    (acc: Z) =>
    (e: Text): Effect.Effect<Z> =>
      Effect.succeed({
        ...acc,
        currNodeTexts: Array.append(acc.currNodeTexts, e.text),
      });

  const handleEnd =
    ({ stack, currNode, currNodeTexts, currNodeChildren }: Z) =>
    (e: EndElement): Effect.Effect<Z, XmlParsingError> => {
      const name = kebabToCamel(e.name);

      if (isUndefined(currNode)) {
        return Effect.fail(
          new XmlParsingError({
            cause: new Error(`Received ${name} endElement but stack is empty`),
          }),
        );
      } else if (name !== currNode.name) {
        return Effect.fail(
          new XmlParsingError({
            cause: new Error(
              `Received ${name} endElement but expecting ${currNode.name}`,
            ),
          }),
        );
      }

      const finalNode: Xml2JsNode = {
        ...currNode,
        text: !currNodeTexts.length ? undefined : currNodeTexts.join(""),
        children: currNodeChildren,
      };

      return Effect.succeed(
        isNonEmptyReadonlyArray(stack)
          ? pipe(
              Array.unappend(stack),
              ([stack, { currNode, currNodeTexts, currNodeChildren }]) =>
                z(
                  stack,
                  currNode,
                  currNodeTexts,
                  Array.append(currNodeChildren, finalNode),
                ),
            )
          : z(stack, finalNode),
      );
    };

  return Stream.runFoldEffect(evtStream, z(), (acc, evt) =>
    Match.value(evt).pipe(
      Match.tagsExhaustive({
        StartElement: handleStart(acc),
        Text: handleText(acc),
        EndElement: handleEnd(acc),
      }),
    ),
  ).pipe(Effect.andThen(({ currNode }) => currNode!));
};

const parseEntireXml = <E>(
  data: Stream.Stream<Uint8Array, E>,
  encoding = "UTF-8",
) =>
  pipe(
    xmlStream(data, encoding),
    Effect.map(([, s]) => s),
    Effect.andThen(transformToJson),
  );

const parseEntireXmlFromFile =
  (fs: FileSystem.FileSystem) =>
  (fileName: string, encoding = "UTF-8") =>
    pipe(
      xmlStreamFromfile(fs)(fileName, encoding),
      Effect.map(([, s]) => s),
      Effect.andThen(transformToJson),
    );

export class XmlParser extends Effect.Service<XmlParser>()("XmlParser", {
  accessors: true,
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    return {
      xmlStream,
      xmlStreamFromFile: xmlStreamFromfile(fs),
      parseEntireXmlFromFile: parseEntireXmlFromFile(fs),
      parseEntireXml,
      transformToJson,
    };
  }).pipe(Effect.annotateLogs({ layer: "XmlParser" })),
}) {}
