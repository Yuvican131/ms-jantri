
"use client"

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavedSheetInfo } from "@/app/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CellData = { [key: string]: string };

const GRID_ROWS = 10;
const GRID_COLS = 10;

type MasterSheetViewerProps = {
  savedSheetLog: { [draw: string]: SavedSheetInfo[] };
  draws: string[];
};

export default function MasterSheetViewer({ savedSheetLog, draws }: MasterSheetViewerProps) {
  const { toast } = useToast();
  const [masterSheetData, setMasterSheetData] = useState<CellData>({});
  const [cuttingValue, setCuttingValue] = useState("");
  const [lessValue, setLessValue] = useState("");
  const [dabbaValue, setDabbaValue] = useState("");
  const [selectedDraw, setSelectedDraw] = useState<string>(draws[0]);
  const [selectedLogIndices, setSelectedLogIndices] = useState<number[]>([]);

  const currentDrawLogs = savedSheetLog[selectedDraw] || [];

  useEffect(() => {
    // When the draw changes, select all logs by default for that draw.
    setSelectedLogIndices(currentDrawLogs.map((_, index) => index));
  }, [selectedDraw, savedSheetLog]);

  useEffect(() => {
    // Recalculate master sheet data when selected logs or draw change
    const newMasterData: CellData = {};
    const logsToProcess = savedSheetLog[selectedDraw] || [];
    
    selectedLogIndices.forEach(index => {
      const logEntry = logsToProcess[index];
      if (logEntry) {
        Object.entries(logEntry.data).forEach(([key, value]) => {
          const numericValue = parseFloat(value) || 0;
          newMasterData[key] = String((parseFloat(newMasterData[key]) || 0) + numericValue);
        });
      }
    });
    setMasterSheetData(newMasterData);
  }, [selectedLogIndices, selectedDraw, savedSheetLog]);

  const calculateRowTotal = (rowIndex: number, data: CellData) => {
    let total = 0;
    for (let colIndex = 0; colIndex < GRID_COLS; colIndex++) {
      const cellNumber = rowIndex * GRID_COLS + colIndex;
      const key = cellNumber.toString().padStart(2, '0');
      const value = data[key];
      if (value && !isNaN(Number(value))) {
        total += Number(value);
      }
    }
    return total;
  };

  const calculateGrandTotal = (data: CellData) => {
    let total = 0;
    Object.values(data).forEach(value => {
      if (value && !isNaN(Number(value))) {
        total += Number(value);
      }
    });
    return total;
  };

  const handleApplyCutting = () => {
    const cutValue = parseFloat(cuttingValue);
    if (isNaN(cutValue)) {
      toast({ title: "Invalid Input", description: "Please enter a valid number for cutting.", variant: "destructive" });
      return;
    }

    const newMasterData = { ...masterSheetData };
    Object.keys(newMasterData).forEach(key => {
      const cellValue = parseFloat(newMasterData[key]) || 0;
      newMasterData[key] = String(cellValue - cutValue);
    });
    setMasterSheetData(newMasterData);

    toast({ title: "Cutting Applied", description: `Subtracted ${cutValue} from all cells in the master sheet.` });
    setCuttingValue("");
  };

  const handleApplyLess = () => {
    const lessPercent = parseFloat(lessValue);
    if (isNaN(lessPercent) || lessPercent < 0 || lessPercent > 100) {
      toast({ title: "Invalid Input", description: "Please enter a valid percentage (0-100) for Less.", variant: "destructive" });
      return;
    }

    const newMasterData = { ...masterSheetData };
    Object.keys(newMasterData).forEach(key => {
      const cellValue = parseFloat(newMasterData[key]) || 0;
      if (cellValue !== 0) {
        const reduction = cellValue * (lessPercent / 100);
        newMasterData[key] = String(cellValue - reduction);
      }
    });
    setMasterSheetData(newMasterData);

    toast({ title: "Less Applied", description: `Subtracted ${lessPercent}% from all cells in the master sheet.` });
    setLessValue("");
  };

  const handleLogSelectionChange = (index: number) => {
    setSelectedLogIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const masterSheetRowTotal = (rowIndex: number) => {
    return calculateRowTotal(rowIndex, masterSheetData).toString();
  };

  const masterSheetGrandTotal = () => {
    return calculateGrandTotal(masterSheetData);
  };
  
  return (
    <div className="h-full flex flex-col p-4 gap-4">
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <Label>Select Draw:</Label>
                    <Select value={selectedDraw} onValueChange={setSelectedDraw}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a draw" />
                        </SelectTrigger>
                        <SelectContent>
                            {draws.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
        <Card className="flex flex-col">
          <CardContent className="p-2 flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="grid gap-1 w-full pr-4" style={{ gridTemplateColumns: `repeat(${GRID_COLS + 1}, minmax(0, 1fr))` }}>
                {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
                  <React.Fragment key={`master-row-${rowIndex}`}>
                    {Array.from({ length: GRID_COLS }, (_, colIndex) => {
                      const cellNumber = rowIndex * GRID_COLS + colIndex;
                      const displayCellNumber = String(cellNumber).padStart(2, '0');
                      const key = displayCellNumber;
                      return (
                        <div key={`master-cell-${key}`} className="relative">
                          <div className="absolute top-0.5 left-1 text-xs text-muted-foreground select-none pointer-events-none z-10">{displayCellNumber}</div>
                          <Input
                            type="text"
                            readOnly
                            className="pt-4 text-center bg-muted min-w-0"
                            value={masterSheetData[key] || ''}
                            aria-label={`Cell ${displayCellNumber}`}
                          />
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-center p-2 font-medium rounded-md">
                      <Input
                        type="text"
                        readOnly
                        className="text-sm font-medium text-center bg-muted min-w-0"
                        value={masterSheetRowTotal(rowIndex)}
                        aria-label={`Row ${rowIndex} Total`}
                      />
                    </div>
                  </React.Fragment>
                ))}
                <div style={{ gridColumn: `span ${GRID_COLS}` }} className="flex items-center justify-end p-2 font-bold mt-1 pr-4">Total</div>
                <div className="flex items-center justify-center p-2 font-bold bg-primary/20 rounded-md mt-1">
                  {masterSheetGrandTotal()}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-around gap-4 items-end">
                <div className="flex items-center gap-2">
                  <Label htmlFor="master-cutting" className="text-sm">Cutting</Label>
                  <Input id="master-cutting" placeholder="Value" className="text-sm text-center w-24" value={cuttingValue} onChange={(e) => setCuttingValue(e.target.value)} />
                  <Button onClick={handleApplyCutting} size="sm">Apply</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="master-less" className="text-sm">Less (%)</Label>
                  <Input id="master-less" placeholder="Value" className="text-sm text-center w-24" value={lessValue} onChange={(e) => setLessValue(e.target.value)} />
                  <Button onClick={handleApplyLess} size="sm">Apply</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="master-dabba" className="text-sm">Dabba</Label>
                  <Input id="master-dabba" placeholder="Value" className="text-sm text-center w-24" />
                  <Button size="sm">Apply</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-grow">
            <CardContent className="p-4 h-full">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-4">
                  {currentDrawLogs.map((log, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded-md bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`log-${selectedDraw}-${index}`}
                          checked={selectedLogIndices.includes(index)}
                          onCheckedChange={() => handleLogSelectionChange(index)}
                        />
                        <label htmlFor={`log-${selectedDraw}-${index}`} className="cursor-pointer">{index + 1}. {log.clientName}</label>
                      </div>
                      <span className="font-mono font-semibold">₹{log.gameTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
