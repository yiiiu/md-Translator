"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export interface AppSelectOption {
  value: string;
  label: string;
  baseUrl?: string;
  builtin?: boolean;
}

interface AppSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  ariaLabel: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  leading?: ReactNode;
  prefix?: ReactNode;
  renderOptionLeading?: (option: AppSelectOption) => ReactNode;
  width?: string;
}

export default function AppSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
  triggerClassName = "",
  contentClassName = "",
  leading,
  prefix,
  renderOptionLeading,
  width,
}: AppSelectProps) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`flex items-center gap-2 rounded-xl bg-[var(--surface-container-lowest)] text-[var(--on-surface)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_18%,transparent)] outline-none transition hover:bg-[var(--surface)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--primary)_24%,transparent)] data-[placeholder]:text-[var(--on-surface-variant)] ${className} ${triggerClassName}`}
      >
        {leading}
        {prefix}
        <Select.Value>
          <span
            className="truncate"
            style={width ? { width, maxWidth: width } : undefined}
          >
            {selectedOption?.label ?? value}
          </span>
        </Select.Value>
        <Select.Icon asChild>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)]"
            strokeWidth={2}
          />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className={`z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl bg-[var(--surface-container-lowest)] p-1 text-sm text-[var(--on-surface)] shadow-[0_18px_42px_rgba(17,28,45,0.18)] ring-1 ring-[color:color-mix(in_srgb,var(--outline-variant)_24%,transparent)] ${contentClassName}`}
        >
          <Select.Viewport className="custom-scrollbar max-h-72 overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-3 pl-8 font-semibold outline-none transition data-[highlighted]:bg-[var(--surface-container-high)] data-[highlighted]:text-[var(--primary)]"
              >
                <Select.ItemIndicator className="absolute left-2 grid h-4 w-4 place-items-center text-[var(--primary)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                </Select.ItemIndicator>
                {renderOptionLeading ? renderOptionLeading(option) : null}
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
