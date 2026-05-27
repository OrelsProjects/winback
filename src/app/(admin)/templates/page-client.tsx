"use client";

import { useState } from "react";
import type { EmailTemplate } from "@/generated/browser";
import { Button } from "@/components/ui/button";
import { TemplateForm } from "@/components/templates/template-form";
import { TemplateList } from "@/components/templates/template-list";
import { Plus, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  templates: EmailTemplate[];
};

export const TemplatesPageClient = ({ templates }: Props) => {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {templates.length} template{templates.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">No templates yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first template to speed up outreach
          </p>
          <Button onClick={() => setCreateOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create template
          </Button>
        </Card>
      ) : (
        <TemplateList templates={templates} />
      )}

      <TemplateForm
        key={createOpen ? "create-active" : "create-idle"}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
};
