import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        root: "w-max",
        month: "flex flex-col gap-2",
        month_caption: "flex items-center justify-between px-1",
        caption_label: "hidden",
        dropdowns: "flex items-center justify-center gap-1",
        dropdown_root: "relative",
        dropdown: cn(
          "h-8 w-28 shrink-0 rounded-md border border-input bg-background px-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
        ),
        months_dropdown: "",
        years_dropdown: "",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        chevron: "size-4",
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "flex h-9 w-9 items-center justify-center text-[0.8rem] font-normal text-muted-foreground",
        weeks: "flex flex-col gap-0.5",
        week: "flex",
        day: "relative flex h-9 w-9 items-center justify-center rounded-md p-0",
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-9 p-0 font-normal"),
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
