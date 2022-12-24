import { RouterProvider } from "../lib";
import { BrowserRouter } from "../lib/routers/browser";
import "./App.css";

const router = new BrowserRouter();
router.observe();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).router = router;

function App() {
  return (
    <RouterProvider router={router}>
      <div className="App">
        <h3>router testing</h3>
      </div>
    </RouterProvider>
  );
}

export default App;
