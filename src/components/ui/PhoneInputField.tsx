// PhoneInputField — wrapper autour de react-phone-number-input avec un
// CountrySelect custom (Popover + Command shadcn) en palette plateforme.
// Remplace le <select> natif (moche) par un combobox cherchable en français.
//
// Utilisation :
//   <PhoneInputField
//     value={phone}
//     onChange={setPhone}
//     defaultCountry="FR"
//     placeholder="Ex : 6 12 34 56 78"
//   />
//
// La validation se fait avec isValidPhoneNumber depuis react-phone-number-input.

import { useState } from "react";
import PhoneInput from "react-phone-number-input";
import frLocale from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown, Globe } from "lucide-react";

interface CountryOption {
  value: string | undefined; // "FR", "MA", ... ou undefined pour "International"
  label: string;
}

interface CountrySelectProps {
  value?: string;
  onChange: (country: string | undefined) => void;
  options: CountryOption[];
  iconComponent: React.ComponentType<{ country: string; label?: string; aspectRatio?: number }>;
  disabled?: boolean;
  readOnly?: boolean;
}

function CountrySelect({
  value,
  onChange,
  options,
  iconComponent: IconComponent,
  disabled,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-full items-center gap-1.5 border-r border-input/50 px-2 transition-colors hover:bg-accent disabled:opacity-40"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="flex h-[16px] w-[24px] items-center justify-center">
            {value ? (
              <IconComponent country={value} label={selected?.label ?? value} />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start" sideOffset={6}>
        <Command
          filter={(val, search) => {
            const needle = search.toLowerCase().trim();
            const opt = options.find((o) => (o.value ?? "intl") === val);
            if (!opt) return 0;
            return opt.label.toLowerCase().includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Rechercher un pays…" className="h-9" />
          <CommandList className="max-h-[280px]">
            <CommandEmpty className="py-5 text-center text-xs text-muted-foreground">
              Aucun pays trouvé.
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const key = opt.value ?? "intl";
                const isSel = opt.value === value;
                return (
                  <CommandItem
                    key={key}
                    value={key}
                    keywords={[opt.label]}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer gap-2 text-[13px]"
                  >
                    <span className="flex h-[16px] w-[24px] shrink-0 items-center justify-center">
                      {opt.value ? (
                        <IconComponent country={opt.value} label={opt.label} />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSel && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface PhoneInputFieldProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** ID pour <label htmlFor>. Optionnel. */
  id?: string;
}

export function PhoneInputField({
  value,
  onChange,
  defaultCountry = "FR",
  placeholder = "Ex : 6 12 34 56 78",
  disabled,
  className,
  id,
}: PhoneInputFieldProps) {
  return (
    <PhoneInput
      international
      defaultCountry={defaultCountry as any}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      labels={frLocale}
      countrySelectComponent={CountrySelect as any}
      numberInputProps={{ id }}
      className={className}
    />
  );
}

// Re-export pour ne pas avoir à importer react-phone-number-input partout
export { isValidPhoneNumber } from "react-phone-number-input";
