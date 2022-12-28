import { useState } from "react";
import { NavigatorProvider } from "../lib";
import { BrowserHistory } from "../lib/history/browser";
import { useLocation } from "../lib/hooks";
import "./App.css";

const history = new BrowserHistory();
history.observe(loc => console.log("location changed", loc));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hist = history;

const Where = () => {
  const loc = useLocation();
  return <p>You are at: {JSON.stringify(loc, null, 2)}</p>;
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
            <h3>...</h3>
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
