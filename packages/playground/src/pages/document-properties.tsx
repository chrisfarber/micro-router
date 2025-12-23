import { route } from "@micro-router/react";
import { Link, useNavigator } from "@micro-router/react";
import {
  DocumentPropertiesPath,
  ViewDocumentPath,
  DocumentsPath,
} from "../paths";
import { useDocuments } from "../context/documents";

export const DocumentPropertiesPage = route(
  DocumentPropertiesPath,
  ({ documentId }) => {
    const { getDocument, deleteDocument, archiveDocument, restoreDocument } =
      useDocuments();
    const navigator = useNavigator();
    const document = getDocument(documentId);

    if (!document) {
      return (
        <div className="document-not-found">
          <h1>Document Not Found</h1>
          <p>
            Cannot view properties for document: <code>{documentId}</code>
          </p>
          <Link to={DocumentsPath}>Back to Documents</Link>
        </div>
      );
    }

    const handleDelete = () => {
      if (confirm("Are you sure you want to delete this document?")) {
        deleteDocument(documentId);
        navigator.push(DocumentsPath);
      }
    };

    const handleArchiveToggle = () => {
      if (document.archived) {
        restoreDocument(documentId);
      } else {
        archiveDocument(documentId);
      }
    };

    return (
      <div className="document-properties-page">
        <div className="page-header">
          <Link
            to={ViewDocumentPath}
            documentId={documentId}
            className="back-link"
          >
            &larr; Back to Document
          </Link>
          <h1>Document Properties</h1>
        </div>

        <div className="properties-grid">
          <div className="property-row">
            <span className="property-label">ID</span>
            <code className="property-value">{document.id}</code>
          </div>
          <div className="property-row">
            <span className="property-label">Title</span>
            <span className="property-value">{document.title}</span>
          </div>
          <div className="property-row">
            <span className="property-label">Status</span>
            <span
              className={`property-value status ${document.archived ? "archived" : "active"}`}
            >
              {document.archived ? "Archived" : "Active"}
            </span>
          </div>
          <div className="property-row">
            <span className="property-label">Created</span>
            <span className="property-value">
              {document.createdAt.toLocaleString()}
            </span>
          </div>
          <div className="property-row">
            <span className="property-label">Last Updated</span>
            <span className="property-value">
              {document.updatedAt.toLocaleString()}
            </span>
          </div>
          <div className="property-row">
            <span className="property-label">Content Length</span>
            <span className="property-value">
              {document.content.length} characters
            </span>
          </div>
        </div>

        <div className="property-actions">
          <button onClick={handleArchiveToggle} className="button">
            {document.archived ? "Restore Document" : "Archive Document"}
          </button>
          <button onClick={handleDelete} className="button danger">
            Delete Document
          </button>
        </div>

        <aside className="param-info">
          <h4>Path Composition</h4>
          <p>This page uses a path composed as:</p>
          <pre className="code-block">
            <code>{`const ViewDocumentPath = path(DocumentsPath, string("documentId"));
const DocumentPropertiesPath = path(ViewDocumentPath, "properties");

// Result: /documents/:documentId/properties`}</code>
          </pre>
          <p className="info-text">
            The <code>documentId</code> parameter is shared between the view,
            edit, and properties pages.
          </p>
        </aside>
      </div>
    );
  },
);
