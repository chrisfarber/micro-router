import { route } from "@micro-router/react";
import { Link } from "@micro-router/react";
import {
  ArchivedDocumentsPath,
  ViewDocumentPath,
  DocumentsPath,
} from "../paths";
import { useDocuments } from "../context/documents";

export const ArchivedDocumentsPage = route(ArchivedDocumentsPath, () => {
  const { documents, restoreDocument } = useDocuments();
  const archivedDocuments = documents.filter(d => d.archived);

  return (
    <div className="archived-documents-page">
      <div className="page-header">
        <Link to={DocumentsPath} className="back-link">
          &larr; Back to Documents
        </Link>
        <h1>Archived Documents</h1>
      </div>

      {archivedDocuments.length === 0 ? (
        <p className="empty-state">No archived documents.</p>
      ) : (
        <ul className="document-list">
          {archivedDocuments.map(doc => (
            <li key={doc.id} className="document-item archived">
              <div className="document-info">
                <Link to={ViewDocumentPath} documentId={doc.id}>
                  <h3>{doc.title}</h3>
                  <p className="document-meta">
                    Archived {doc.updatedAt.toLocaleDateString()}
                  </p>
                </Link>
              </div>
              <button
                onClick={() => {
                  restoreDocument(doc.id);
                }}
                className="button small"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}

      <aside className="param-info">
        <h4>Static Path Segment</h4>
        <code>/documents/archive</code>
        <p className="info-text">
          This page uses a static nested path:{" "}
          <code>path(DocumentsPath, "archive")</code>. The router correctly
          distinguishes this from the dynamic{" "}
          <code>/documents/:documentId</code> path because it has fewer dynamic
          captures.
        </p>
      </aside>
    </div>
  );
});
