import "./App.css";

function App() {
  return (
    <div className="App">
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => {
            console.log("hi");
          }}
        >
          count is {0}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  );
}

export default App;
