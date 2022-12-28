import { MouseEvent, useCallback, useState } from "react";
import { NavigatorProvider, useNavigator } from "../lib";
import * as Path from "../lib/definition";
import { BrowserHistory } from "../lib/history/browser";
import { useLocation } from "../lib/hooks";
import { Link } from "../lib/Link";
import "./App.css";

const BasePath = Path.path("/base");
const MessagesPath = Path.path(BasePath, "messages");
const MessageByIdPath = Path.path(MessagesPath, Path.string("messageId"));
const MessageEditPath = Path.path(MessageByIdPath, "edit", Path.string("part"));

const history = new BrowserHistory();
history.observe(loc => console.log("location changed", loc));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hist = history;

const Where = () => {
  const loc = useLocation();
  return <p>You are at: {JSON.stringify(loc, null, 2)}</p>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TestingNavTypes = () => {
  const nav = useNavigator();
  nav.push("woah");
  nav.push(BasePath);
  nav.push(MessagesPath);
  nav.push(MessageEditPath, { messageId: "aoeu", part: "aeu" });
  // @ts-expect-error must supply params
  nav.push(MessageEditPath);
  return <div></div>;
};

const Go = ({ offset, title }: { offset: number; title: string }) => {
  const nav = useNavigator();
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      nav.go(offset);
    },
    [nav, offset],
  );
  return (
    <a href="#" onClick={onClick}>
      {title}
    </a>
  );
};

function App() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <div>
        <button onClick={() => setMounted(v => !v)}>
          {mounted ? "Unmount navigator" : "Mount navigator"}
        </button>
      </div>
      {mounted && (
        <NavigatorProvider history={history}>
          <div className="App">
            <p>
              <Go title="Go back" offset={-1} />
              {", "}
              <Go title="Go forward" offset={1} />
            </p>
            <Where />
            <h3>Links</h3>
            <div>
              <ul>
                <li>
                  <Link to="/nope">/nope</Link>
                </li>
                <li>
                  <Link to="/something%20-with-params-and-anchors?foo=true#aaaa">A complex example</Link>
                </li>
                <li>
                  <Link to="/something%20-with-and-anchors?foo=false#aaaa">Another complex example</Link>
                </li>
                <li>
                  <Link to={MessagesPath}>Messages</Link>
                </li>
                <li>
                  {/* <Link to={MessageEditPath}>broke</Link> */}

                  <Link to={MessageEditPath} params={{ messageId: "44", part: "5" }}>
                    Edit
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
