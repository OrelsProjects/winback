"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { EmailTemplate } from "@/generated/browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { SubjectLineEditor } from "@/components/editor/subject-line-editor";
import { createTemplate, updateTemplate } from "./template-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TEMPLATE_EDITOR_PREVIEW_VARS } from "@/lib/constants";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  subject: z.string().min(1, "Subject is required"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const emptyDoc = (): object => ({ type: "doc", content: [{ type: "paragraph" }] });

export const TemplateForm = ({ open, onOpenChange, template }: Props) => {
  const router = useRouter();
  const [bodyJson, setBodyJson] = useState<object>(
    (template?.bodyJson as object) ?? emptyDoc(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template?.name ?? "",
      slug: template?.slug ?? "",
      subject: template?.subject ?? "",
    },
  });

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    if (!template) form.setValue("slug", slugify(name));
  };

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const result = template
        ? await updateTemplate(template.id, { ...values, bodyJson })
        : await createTemplate({ ...values, bodyJson });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(template ? "Template updated" : "Template created");
      onOpenChange(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Warm Winback"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="warm-winback" className="font-mono text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <SubjectLineEditor
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      interpolationPreview={TEMPLATE_EDITOR_PREVIEW_VARS}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Body</label>
              <TiptapEditor
                value={bodyJson}
                onChange={setBodyJson}
                enableSlash={false}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : template ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
