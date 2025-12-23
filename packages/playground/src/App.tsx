import { NavigatorProvider, routeSwitch } from "@micro-router/react";
import "./App.css";
import { Layout } from "./components/Layout";
import { DocumentsProvider } from "./context/documents";
import { ArchivedDocumentsPage } from "./pages/archived-documents";
import { DocumentPropertiesPage } from "./pages/document-properties";
import { DocumentsPage } from "./pages/documents";
import { EditDocumentPage } from "./pages/edit-document";
import { HomePage } from "./pages/home";
import { NewDocumentPage } from "./pages/new-document";
import { ViewDocumentPage } from "./pages/view-document";

const PageNotFound = () => {
  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>Page not found</p>
      <p className="info-text">
        The router couldn't match the current URL to any defined route.
      </p>
    </div>
  );
};

const AppRoutes = routeSwitch({
  routes: [
    HomePage,
    DocumentsPage,
    ViewDocumentPage,
    EditDocumentPage,
    NewDocumentPage,
    ArchivedDocumentsPage,
    DocumentPropertiesPage,
  ],
  fallback: <PageNotFound />,
});

function App() {
  return (
    <DocumentsProvider>
      <NavigatorProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </NavigatorProvider>
    </DocumentsProvider>
  );
}

export default App;
