import { useState } from "react";
import { route } from "@micro-router/react";
import { Link, useNavigator } from "@micro-router/react";
import { EditDocumentPath, ViewDocumentPath, DocumentsPath } from "../paths";
import { useDocuments } from "../context/documents";

export const EditDocumentPage = route(EditDocumentPath, ({ documentId }) => {
  const { getDocument, updateDocument } = useDocuments();
  const navigator = useNavigator();
  const document = getDocument(documentId);

  const [title, setTitle] = useState(document?.title ?? "");
  const [content, setContent] = useState(document?.content ?? "");

  if (!document) {
    return (
      <div className="document-not-found">
        <h1>Document Not Found</h1>
        <p>
          Cannot edit document with ID: <code>{documentId}</code>
        </p>
        <Link to={DocumentsPath}>Back to Documents</Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.trim()) {
      updateDocument(documentId, {
        title: title.trim(),
        content: content.trim(),
      });
      navigator.push(ViewDocumentPath, { documentId });
    }
  };

  return (
    <div className="edit-document-page">
      <div className="page-header">
        <Link
          to={ViewDocumentPath}
          documentId={documentId}
          className="back-link"
        >
          &larr; Back to Document
        </Link>
        <h1>Edit Document</h1>
      </div>

      <form onSubmit={handleSubmit} className="document-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
            }}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            value={content}
            onChange={e => {
              setContent(e.target.value);
            }}
            rows={15}
          />
        </div>
        <div className="form-actions">
          <Link
            to={ViewDocumentPath}
            documentId={documentId}
            className="button"
          >
            Cancel
          </Link>
          <button type="submit" className="button primary">
            Save Changes
          </button>
        </div>
      </form>

      <aside className="param-info">
        <h4>Route Path</h4>
        <code>/documents/{documentId}/edit</code>
        <p className="info-text">
          This edit page is at a nested path, composed from{" "}
          <code>path(ViewDocumentPath, "edit")</code>.
        </p>
      </aside>
    </div>
  );
});
