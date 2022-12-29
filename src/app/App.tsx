import { useState } from "react";
import { BrowserHistory, Link, NavigatorProvider, route, routeSwitch } from "../lib";
import * as Path from "../lib/definition";
import "./App.css";
import { Go } from "./Go";
import { WhereAmI } from "./WhereAmI";

const history = new BrowserHistory();

const BasePath = Path.path("/base");
const MessagesPath = Path.path(BasePath, "messages");
const MessageByIdPath = Path.path(MessagesPath, Path.string("messageId"));
const MessageEditPath = Path.path(MessageByIdPath, "edit", Path.string("part"));
const SubMessageEditPath = Path.path(MessageEditPath, Path.number("unused"));

const BaseRoute = route(BasePath, () => <h4>base route!</h4>);

const EditRoute = route(MessageEditPath, params => {
  const [ctr, setCtr] = useState(0);
  return (
    <div>
      <h4>Message edit route</h4>
      <p>Counter: {ctr}</p>
      <button
        onClick={() => {
          setCtr(ctr + 1);
        }}
      >
        Increment
      </button>
      <p>Message ID: {params.messageId}</p>
      <p>Part: {params.part}</p>
    </div>
  );
});

const MessageRoute = route(MessageByIdPath, params => {
  return (
    <div>
      <h4>Message By ID Route</h4>
      <p>id: {params.messageId}</p>
    </div>
  );
});

const Switch = routeSwitch(BaseRoute, EditRoute, MessageRoute);

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
            <WhereAmI />
            <BaseRoute exact />
            <Switch />
            <h3>Links</h3>
            <div>
              <ul>
                <li>
                  <Link to={BasePath}>BasePath</Link>
                </li>
                <li>
                  <Link to={MessagesPath}>MessagesPath</Link>
                </li>
                <li>
                  <Link to={MessageByIdPath} params={{ messageId: "4" }}>
                    MessageByIdPath (messageId: 4)
                  </Link>
                </li>
                <li>
                  <Link to={MessageEditPath} params={{ messageId: "44", part: "5" }}>
                    MessageEditPath {"(messageId: 44, part: 5)"}
                  </Link>
                </li>
                <li>
                  <Link to={SubMessageEditPath} params={{ messageId: "32", part: "16", unused: 420 }}>
                    SubMessageEditPath {`(messageId: "32", part: "16", unused: 420)`}
                  </Link>
                </li>
              </ul>
              <h3>Random String Links</h3>
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
              </ul>
            </div>
          </div>
        </NavigatorProvider>
      )}
    </>
  );
}

export default App;
