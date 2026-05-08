import { cn } from "@/lib/utils";
import { createContext, useContext, HTMLAttributes, ButtonHTMLAttributes } from "react";

const TabsContext = createContext<{ value: string; onValueChange: (v: string) => void }>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (v: string) => void;
}

export function Tabs({ value, onValueChange, className, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("", className)} {...props} />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        active && "bg-background text-foreground shadow",
        className
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, ...props }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return <div className={cn("mt-2", className)} {...props} />;
}
