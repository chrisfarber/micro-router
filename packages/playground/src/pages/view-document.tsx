import { route } from "@micro-router/react";
import { Link, useNavigator } from "@micro-router/react";
import {
  ViewDocumentPath,
  EditDocumentPath,
  DocumentPropertiesPath,
  DocumentsPath,
} from "../paths";
import { useDocuments } from "../context/documents";

export const ViewDocumentPage = route(ViewDocumentPath, ({ documentId }) => {
  const { getDocument, archiveDocument } = useDocuments();
  const navigator = useNavigator();
  const document = getDocument(documentId);

  if (!document) {
    return (
      <div className="document-not-found">
        <h1>Document Not Found</h1>
        <p>
          No document exists with ID: <code>{documentId}</code>
        </p>
        <p className="param-display">
          This ID was extracted from the URL using the{" "}
          <code>string("documentId")</code> path segment.
        </p>
        <Link to={DocumentsPath}>Back to Documents</Link>
      </div>
    );
  }

  const handleArchive = () => {
    archiveDocument(documentId);
    navigator.push(DocumentsPath);
  };

  return (
    <div className="view-document-page">
      <div className="document-header">
        <Link to={DocumentsPath} className="back-link">
          &larr; Back to Documents
        </Link>
        <div className="document-actions">
          <Link
            to={DocumentPropertiesPath}
            documentId={documentId}
            className="button"
          >
            Properties
          </Link>
          <Link
            to={EditDocumentPath}
            documentId={documentId}
            className="button"
          >
            Edit
          </Link>
          {!document.archived && (
            <button onClick={handleArchive} className="button">
              Archive
            </button>
          )}
        </div>
      </div>

      <article className="document-content">
        <h1>{document.title}</h1>
        <div className="document-body">
          {document.content.split("\n").map((line, i) => {
            if (line.startsWith("# ")) {
              return <h2 key={i}>{line.slice(2)}</h2>;
            }
            if (line.startsWith("## ")) {
              return <h3 key={i}>{line.slice(3)}</h3>;
            }
            if (line.startsWith("- ")) {
              return (
                <p key={i} className="list-item">
                  {line}
                </p>
              );
            }
            if (line.startsWith("`") && line.endsWith("`")) {
              return (
                <code key={i} className="inline-code">
                  {line.slice(1, -1)}
                </code>
              );
            }
            if (line.trim()) {
              return <p key={i}>{line}</p>;
            }
            return null;
          })}
        </div>
      </article>

      <aside className="param-info">
        <h4>Route Parameter</h4>
        <p>
          <code>documentId</code>: <strong>{documentId}</strong>
        </p>
        <p className="info-text">
          This value was extracted from the URL path{" "}
          <code>/documents/{documentId}</code> using the typed path definition.
        </p>
      </aside>
    </div>
  );
});
