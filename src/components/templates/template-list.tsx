"use client";

import { useState } from "react";
import type { EmailTemplate } from "@/generated/browser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TemplateForm } from "./template-form";
import { deleteTemplate } from "./template-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

type Props = {
  templates: EmailTemplate[];
};

export const TemplateList = ({ templates }: Props) => {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteTemplate(deleteTarget.id);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Template deleted");
      router.refresh();
    }
    setDeleteTarget(null);
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No templates yet. Create one to get started.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{t.slug}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{t.subject}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(t.updatedAt, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditTarget(t)}
                      aria-label={`Edit ${t.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TemplateForm
        key={editTarget?.id ?? "edit-idle"}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        template={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. Email logs that used it will be unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
