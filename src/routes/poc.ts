export {};

type Route<Path extends string = any, Params = any> = {
  _path: Path;
  _params: Params;
};

type SubPath<
  Path extends string,
  Sub extends string,
> = `${LeadingSlash<Path>}${LeadingSlash<Sub>}`;
type PathOf<R extends Route> = R["_path"];

type StripLeadingSlash<S extends string> = S extends `/${infer R}`
  ? StripLeadingSlash<R>
  : S;
type LeadingSlash<S extends string> = `/${StripLeadingSlash<S>}`;

const path = <Path extends string>(
  path: Path,
): Route<LeadingSlash<Path>, unknown> => {
  return {} as any;
};

const HiRoute = path("/////////////////////////hi");
const WatRoute = path("wat");

const sub = <From extends Route, Path extends string>(
  of: From,
  subpath: Path,
): Route<SubPath<PathOf<From>, Path>, From["_params"]> => {
  return {} as Route<any>;
};

const Hi2Route = sub(HiRoute, "woah");

// const stringParam = <From extends Route, K extends string>(
//   of: From,
//   key: K,
// ): Route<`${From["_path"]}/:${K}`, From["_params"] & Record<K, string>> => {
//   return {} as any;
// };

// const Hi3Route = stringParam(Hi2Route, "fancy");
// const Hi4Route = stringParam(Hi3Route, "woah");

const idk = <Ts extends Route[]>(...t: Ts) => {};

// idk(Hi3Route, Hi4Route);

type ConcatRoutePair<R extends Route, R2 extends Route> = Route<
  SubPath<R["_path"], R2["_path"]>,
  R["_params"] & R2["_params"]
>;
// type ConcatRoutes<Rs extends Route[]> = Rs extends [
//   infer R extends Route,
//   infer R2 extends Route,
//   ...infer Rest extends Route[],
// ]
//   ? ConcatRoutes<[ConcatRoutePair<R, R2>, ...Rest]>
//   : Rs[0];

type ConcatRoutes<Rs extends Route[]> = Rs extends [
  infer R extends Route,
  infer R2 extends Route,
  ...infer Rest extends Route[],
]
  ? ConcatRoutes<
      [
        Route<SubPath<R["_path"], R2["_path"]>, R["_params"] & R2["_params"]>,
        ...Rest,
      ]
    >
  : Rs[0];

const build = <Rs extends Route[]>(...from: Rs): ConcatRoutes<Rs> => {
  return null as any;
};

// type Meh = ConcatRoutePair<typeof Hi3Route, typeof Hi4Route>;

const stringParam = <K extends string>(
  key: K,
): Route<`:${K}`, Record<K, string>> => {
  return {} as any;
};

const MessagesPath = build(path("base/messages"));
const MessageDetailsPath = build(MessagesPath, stringParam("messageId"));

const EditMessagePath = build(
  MessageDetailsPath,
  path("edit"),
  stringParam("part"),
);

const outparm: typeof EditMessagePath["_params"] = null as any;
outparm.foo;
const outpath: typeof EditMessagePath["_path"] = null as any;

const out2 = build(path("hi"));
const out3 = build();
