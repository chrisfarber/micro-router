import { useState } from "react";
import { BrowserHistory, Link, NavigatorProvider, match, bestMatch } from "../lib";
import { number, path, string } from "../lib/definition";
import "./App.css";
import { Go } from "./Go";
import { WhereAmI } from "./WhereAmI";

const BasePath = path("/base");
const MessagesPath = path(BasePath, "messages");
const MessageByIdPath = path(MessagesPath, string("messageId"));
const MessageEditPath = path(MessageByIdPath, "edit", string("part"));
const SubMessageEditPath = path(MessageEditPath, number("entropy"));

const BasePage = match(BasePath, () => <h4>BasePath</h4>);

const MessageLink = (params: { messageId: string }) => (
  <Link to={MessageByIdPath} params={params}>
    View Message {params.messageId}
  </Link>
);

const MessagesPage = match(MessagesPath, () => (
  <div>
    <h4>MessagesPath</h4>
    <ul>
      <li>
        <MessageLink messageId="1" />
      </li>
      <li>
        <MessageLink messageId="2" />
      </li>
      <li>
        <MessageLink messageId="3" />
      </li>
    </ul>
  </div>
));

const MessageEditPage = match(MessageEditPath, params => {
  const [ctr, setCtr] = useState(0);
  return (
    <div>
      <h4>MessageEditPath</h4>
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
      <p>
        <MessageLink messageId={params.messageId} />
      </p>
    </div>
  );
});

const MessagePage = match(MessageByIdPath, params => {
  return (
    <div>
      <h4>MessageByIdPath</h4>
      <p>id: {params.messageId}</p>
    </div>
  );
});

const SubMessageEditPage = match(SubMessageEditPath, params => {
  return (
    <div>
      <h3>SubMessageEditPage</h3>
      <p>entropy: {params.entropy}</p>
    </div>
  );
});

const PageNotFound = () => {
  return <h2>404!</h2>;
};

const AppPages = bestMatch({
  of: [BasePage, MessagesPage, MessagePage, MessageEditPage, SubMessageEditPage],
  fallback: <PageNotFound />,
  exact: true,
});
// AppPages.displayName = "App Pages";

function App() {
  return (
    <>
      <NavigatorProvider history={new BrowserHistory()}>
        <div className="App">
          <p>
            <Go title="< Back" offset={-1} />
            {" | "}
            <Go title="Forward >" offset={1} />
          </p>

          <AppPages />

          <BasePage exact>
            <h3>👀 looks like you are on the base page</h3>
            <p>
              As an experiment, I decided to make it possible to pass children into MatchComponent. If
              children are provided, they will be rendered instead of the MatchComponent normal content.
            </p>
          </BasePage>

          <h3>Links</h3>
          <div>
            <ul>
              <li>
                <Link to={BasePath}>{BasePath.make()}</Link>
              </li>
              <li>
                <Link to={MessagesPath}>{MessagesPath.make()}</Link>
              </li>
              <li>
                <Link to={MessageByIdPath} params={{ messageId: "4" }}>
                  {MessageByIdPath.make({ messageId: "4" })}
                </Link>
              </li>
              <li>
                <Link to={MessageByIdPath} params={{ messageId: "5" }}>
                  {MessageByIdPath.make({ messageId: "5" })}
                </Link>
              </li>
              <li>
                <Link to={MessageEditPath} params={{ messageId: "44", part: "5" }}>
                  {MessageEditPath.make({ messageId: "44", part: "5" })}
                </Link>
              </li>
              <li>
                <Link to={SubMessageEditPath} params={{ messageId: "32", part: "16", entropy: 420 }}>
                  {SubMessageEditPath.make({ messageId: "32", part: "16", entropy: 420 })}
                </Link>
              </li>
              <li>
                <Link to="/base/messages/48/edit/96/not-entropy">/base/messages/48/edit/96/not-entropy</Link>
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
          <WhereAmI />
        </div>
      </NavigatorProvider>
    </>
  );
}

export default App;
