"use client";

import { forwardRef, useImperativeHandle, useState, useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SlashItem = {
  id: string;
  name: string;
  slug: string;
  subject: string;
  bodyJson: unknown;
};

export type SlashPopupHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

type Props = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

export const SlashPopup = forwardRef<SlashPopupHandle, Props>((props, ref) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = props.items[selected];
        if (item) props.command(item);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="w-72 rounded-md border bg-popover text-popover-foreground shadow-md">
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No templates found.</CommandEmpty>
          </CommandList>
        </Command>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-md border bg-popover text-popover-foreground shadow-md">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search templates…" autoFocus={false} />
        <CommandList>
          <CommandEmpty>No templates.</CommandEmpty>
          <CommandGroup heading="Templates">
            {props.items.map((item, i) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => props.command(item)}
                className={i === selected ? "bg-accent" : ""}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{item.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {item.subject}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
});
SlashPopup.displayName = "SlashPopup";
