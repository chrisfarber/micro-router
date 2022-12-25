import { RouterProvider } from "../lib";
import { BrowserHistory } from "../lib/history/browser";
import "./App.css";

const history = new BrowserHistory();
history.observe(loc => console.log("location changed", loc));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).hist = history;

function App() {
  return (
    <RouterProvider router={history}>
      <div className="App">
        <h3>...</h3>
      </div>
    </RouterProvider>
  );
}

export default App;
