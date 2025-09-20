
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ColorTheme } from "@/app/page";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type CustomizePanelProps = {
  activeTheme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
};

const colorPalettes: { name: string; theme: ColorTheme }[] = [
  { name: "Default Yellow", theme: { number: 'hsl(0 0% 100%)', amount: 'hsl(55 90% 55%)', total: 'hsl(120 70% 45%)' } },
  { name: "Cyberpunk Pink", theme: { number: 'hsl(320 100% 80%)', amount: 'hsl(320 100% 90%)', total: 'hsl(320 100% 70%)' } },
  { name: "Electric Blue", theme: { number: 'hsl(200 100% 80%)', amount: 'hsl(200 100% 90%)', total: 'hsl(200 100% 70%)' } },
  { name: "Vibrant Green", theme: { number: 'hsl(140 100% 80%)', amount: 'hsl(140 100% 90%)', total: 'hsl(140 100% 70%)' } },
  { name: "Classic White", theme: { number: 'hsl(0 0% 60%)', amount: 'hsl(0 0% 100%)', total: 'hsl(0 0% 85%)' } },
  { name: "Solar Orange", theme: { number: 'hsl(30 100% 80%)', amount: 'hsl(35 100% 75%)', total: 'hsl(40 100% 65%)' } },
];

export default function CustomizePanel({ activeTheme, onThemeChange }: CustomizePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Theme</CardTitle>
        <CardDescription>
          Select a color palette to instantly change the appearance of the grid sheet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {colorPalettes.map((palette) => {
            const isActive = activeTheme.amount === palette.theme.amount;
            return (
                <div key={palette.name} onClick={() => onThemeChange(palette.theme)}>
                    <Card className={cn("cursor-pointer transition-all hover:scale-105", isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                {palette.name}
                                {isActive && <Check className="h-5 w-5 text-primary" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-around items-center rounded-md p-4 bg-muted">
                                <div style={{ color: palette.theme.number }} className="text-sm font-bold">12</div>
                                <div style={{ color: palette.theme.amount }} className="text-xl font-bold">100</div>
                                <div style={{ color: palette.theme.total }} className="text-lg font-bold">1000</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  );
}
