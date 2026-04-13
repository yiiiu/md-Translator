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
        className={`flex items-center gap-2 rounded-xl bg-white text-[#111c2d] shadow-sm ring-1 ring-[#c3c5d9]/15 outline-none transition hover:bg-[#f9f9ff] focus:ring-2 focus:ring-[#0052ff]/25 data-[placeholder]:text-[#737688] ${className} ${triggerClassName}`}
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
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#737688]" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className={`z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl bg-white p-1 text-sm text-[#111c2d] shadow-[0_18px_42px_rgba(17,28,45,0.18)] ring-1 ring-[#c3c5d9]/25 ${contentClassName}`}
        >
          <Select.Viewport className="custom-scrollbar max-h-72 overflow-y-auto">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl py-2 pr-3 pl-8 font-semibold outline-none transition data-[highlighted]:bg-[#dee8ff] data-[highlighted]:text-[#003ec7]"
              >
                <Select.ItemIndicator className="absolute left-2 grid h-4 w-4 place-items-center text-[#003ec7]">
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
