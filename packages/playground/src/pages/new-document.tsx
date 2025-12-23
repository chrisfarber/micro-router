import { route, useNavigator, Link } from "@micro-router/react";
import { useDocuments } from "../context/documents";
import { NewDocumentPath, ViewDocumentPath, DocumentsPath } from "../paths";

export const NewDocumentPage = route(NewDocumentPath, () => {
  const navigator = useNavigator();
  const { createDocument } = useDocuments();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;

    if (title.trim()) {
      const doc = createDocument(title.trim(), content.trim());
      navigator.push(ViewDocumentPath, { documentId: doc.id });
    }
  };

  return (
    <div className="new-document-page">
      <h1>New Document</h1>
      <form onSubmit={handleSubmit} className="document-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="Document title"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            placeholder="Write your document content here..."
            rows={10}
          />
        </div>
        <div className="form-actions">
          <Link to={DocumentsPath} className="button">
            Cancel
          </Link>
          <button type="submit" className="button primary">
            Create Document
          </button>
        </div>
      </form>
    </div>
  );
});
