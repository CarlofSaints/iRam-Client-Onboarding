import { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { readJson, writeJson, writeBlob, deleteBlob } from "@/lib/blob";
import { requirePermission, handleAuthError, noCacheHeaders } from "@/lib/auth";
import { addLog } from "@/lib/activityLog";
import type { LegalTemplate } from "@/lib/types";

const BLOB_KEY = "templates.json";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "manage_templates");
    const templates = await readJson<LegalTemplate[]>(BLOB_KEY, []);
    return Response.json(templates, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_templates");
    const formData = await req.formData();

    const name = formData.get("name") as string | null;
    const category = formData.get("category") as string | null;
    const description = formData.get("description") as string | null;
    const file = formData.get("file") as File | null;

    if (!name?.trim() || !category) {
      return Response.json(
        { error: "Name and category are required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "File is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File must be under 10MB" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: "Only .pdf and .docx files are allowed" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const id = uuid();
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType =
      ext === ".pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const fileUrl = await writeBlob(
      `templates/${id}/${file.name}`,
      buffer,
      contentType
    );

    const templates = await readJson<LegalTemplate[]>(BLOB_KEY, []);
    const template: LegalTemplate = {
      id,
      name: name.trim(),
      category: category as LegalTemplate["category"],
      description: description?.trim() || undefined,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };
    templates.push(template);
    await writeJson(BLOB_KEY, templates);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Uploaded template",
      details: `${template.name} (${template.fileName})`,
      status: "success",
    });

    return Response.json(template, { status: 201, headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_templates");
    const body = await req.json();
    const { id, name, category, description } = body as {
      id: string;
      name?: string;
      category?: LegalTemplate["category"];
      description?: string;
    };

    if (!id) {
      return Response.json(
        { error: "Template id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const templates = await readJson<LegalTemplate[]>(BLOB_KEY, []);
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      return Response.json(
        { error: "Template not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    if (name !== undefined) templates[idx].name = name.trim();
    if (category !== undefined) templates[idx].category = category;
    if (description !== undefined)
      templates[idx].description = description.trim() || undefined;
    await writeJson(BLOB_KEY, templates);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Updated template",
      details: templates[idx].name,
      status: "success",
    });

    return Response.json(templates[idx], { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission(req, "manage_templates");
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json(
        { error: "Template id is required" },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    const templates = await readJson<LegalTemplate[]>(BLOB_KEY, []);
    const target = templates.find((t) => t.id === id);
    if (!target) {
      return Response.json(
        { error: "Template not found" },
        { status: 404, headers: noCacheHeaders() }
      );
    }

    // Delete the blob file
    await deleteBlob(`templates/${target.id}/${target.fileName}`);

    // Remove from metadata array
    const filtered = templates.filter((t) => t.id !== id);
    await writeJson(BLOB_KEY, filtered);

    await addLog({
      userId: session.userId,
      userName: session.name,
      action: "Deleted template",
      details: `${target.name} (${target.fileName})`,
      status: "success",
    });

    return Response.json({ success: true }, { headers: noCacheHeaders() });
  } catch (err) {
    return handleAuthError(err);
  }
}
