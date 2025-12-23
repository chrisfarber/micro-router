import { Link, route } from "@micro-router/react";
import { useDocuments } from "../context/documents";
import { DocumentsPath, NewDocumentPath, ViewDocumentPath } from "../paths";

export const DocumentsPage = route(DocumentsPath, () => {
  const { documents } = useDocuments();
  const activeDocuments = documents.filter(d => !d.archived);

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>Documents</h1>
        <Link to={NewDocumentPath} className="button primary">
          New Document
        </Link>
      </div>

      {activeDocuments.length === 0 ? (
        <p className="empty-state">
          No documents yet. Create one to get started!
        </p>
      ) : (
        <ul className="document-list">
          {activeDocuments.map(doc => (
            <li key={doc.id} className="document-item">
              <Link to={ViewDocumentPath} documentId={doc.id}>
                <h3>{doc.title}</h3>
                <p className="document-meta">
                  Updated {doc.updatedAt.toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
