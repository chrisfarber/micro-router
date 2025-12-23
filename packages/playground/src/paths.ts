import { path, string } from "@micro-router/core";

export const HomePath = path("/");
export const DocumentsPath = path("documents");
export const ArchivedDocumentsPath = path(DocumentsPath, "archive");
export const NewDocumentPath = path(DocumentsPath, "new");

export const ViewDocumentPath = path(DocumentsPath, string("documentId"));
export const EditDocumentPath = path(ViewDocumentPath, "edit");
export const DocumentPropertiesPath = path(ViewDocumentPath, "properties");
