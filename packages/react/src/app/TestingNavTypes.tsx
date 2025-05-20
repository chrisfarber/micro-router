import { useNavigator } from "../lib/provider";
import * as Path from "@micro-router/core";

const BasePath = Path.path("/base");
const MessagesPath = Path.path(BasePath, "messages");
const MessageByIdPath = Path.path(MessagesPath, Path.string("messageId"));
const MessageEditPath = Path.path(MessageByIdPath, "edit", Path.string("part"));

export const TestingNavTypes = () => {
  const nav = useNavigator();
  nav.push("woah");
  nav.push(BasePath);
  nav.push(MessagesPath);
  nav.push(MessageEditPath, { messageId: "aoeu", part: "aeu" });
  // @ts-expect-error must supply params
  nav.push(MessageEditPath);
  return <div></div>;
};
