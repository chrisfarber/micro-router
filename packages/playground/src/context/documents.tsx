import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface Document {
  id: string;
  title: string;
  content: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentsContextValue {
  documents: Document[];
  getDocument: (id: string) => Document | undefined;
  createDocument: (title: string, content: string) => Document;
  updateDocument: (
    id: string,
    updates: Partial<Pick<Document, "title" | "content">>,
  ) => void;
  archiveDocument: (id: string) => void;
  restoreDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const initialDocuments: Document[] = [
  {
    id: "getting-started",
    title: "Getting Started with micro-router",
    content: `# Welcome to micro-router!

This demo showcases the key features of micro-router, a TypeScript-first routing library for React.

## Key Features

- **Type-safe paths**: Define routes with full TypeScript support
- **Composable paths**: Build complex routes from simpler ones
- **Smart route matching**: Automatic selection of the best matching route
- **Easy navigation**: Programmatic navigation with typed parameters

Try clicking around to see how the router handles different URLs!`,
    archived: false,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "api-reference",
    title: "API Reference",
    content: `# API Reference

## Path Combinators

- \`path(...segments)\` - Compose path segments
- \`string(key)\` - Match a string parameter
- \`number(key)\` - Match a numeric parameter

## React Components

- \`NavigatorProvider\` - Provides navigation context
- \`Link\` - Navigation link component
- \`route(path, component)\` - Define a route
- \`routeSwitch({ routes, fallback })\` - Create a route switcher

## Hooks

- \`useNavigator()\` - Access navigation functions
- \`useLocation()\` - Get current location
- \`usePathMatch(path)\` - Check if path matches`,
    archived: false,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "old-notes",
    title: "Old Development Notes",
    content: `# Old Notes

These are some archived notes from early development.

Nothing to see here!`,
    archived: true,
    createdAt: new Date("2023-12-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

let nextId = 1;
function generateId(): string {
  return `doc-${String(Date.now())}-${String(nextId++)}`;
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  const getDocument = useCallback(
    (id: string) => documents.find(d => d.id === id),
    [documents],
  );

  const createDocument = useCallback((title: string, content: string) => {
    const now = new Date();
    const doc: Document = {
      id: generateId(),
      title,
      content,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    setDocuments(prev => [...prev, doc]);
    return doc;
  }, []);

  const updateDocument = useCallback(
    (id: string, updates: Partial<Pick<Document, "title" | "content">>) => {
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc,
        ),
      );
    },
    [],
  );

  const archiveDocument = useCallback((id: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, archived: true, updatedAt: new Date() } : doc,
      ),
    );
  }, []);

  const restoreDocument = useCallback((id: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id
          ? { ...doc, archived: false, updatedAt: new Date() }
          : doc,
      ),
    );
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  }, []);

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        getDocument,
        createDocument,
        updateDocument,
        archiveDocument,
        restoreDocument,
        deleteDocument,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments(): DocumentsContextValue {
  const ctx = useContext(DocumentsContext);
  if (!ctx) {
    throw new Error("useDocuments must be used within a DocumentsProvider");
  }
  return ctx;
}
