import { useState } from "react";
import { NavigatorProvider } from "../lib";
import * as Path from "../lib/definition";
import { BrowserHistory } from "../lib/history/browser";
import { useLocation } from "../lib/hooks";
import { Link } from "../lib/Link";
import "./App.css";

const history = new BrowserHistory();
history.observe(loc => console.log("location changed", loc));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hist = history;

const Where = () => {
  const loc = useLocation();
  return <p>You are at: {JSON.stringify(loc, null, 2)}</p>;
};

const BasePath = Path.path("/base");
const MessagesPath = Path.path(BasePath, "messages");
const MessageByIdPath = Path.path(MessagesPath, Path.string("messageId"));
const MessageEditPath = Path.path(MessageByIdPath, "edit", Path.string("part"));

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
                  <Link to={MessageEditPath} params={{ messageId: "44", part: "5" }}>
                    Edit
                  </Link>
                </li>
              </ul>
            </div>

            <Where />
            <p>...</p>
            <Where />
          </div>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
